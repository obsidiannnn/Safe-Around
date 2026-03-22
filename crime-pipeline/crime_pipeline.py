"""
SafeAround - Crime Pipeline Orchestrator (Phase 5)
===================================================
Master ETL pipeline: Extract → Transform → Geocode → Load

Run Modes:
  1. As FastAPI service:  uvicorn crime_pipeline:app --port 8001
  2. As standalone:       python crime_pipeline.py

Cycle (every 15 min by default):
  1. Fetch news from all Indian sources (parallel, ~2 min)
  2. NLP processing: crime type, severity, location (batch, ~2 min)
  3. Geocode locations → lat/lng (rate-limited, ~3 min)
  4. DB batch upsert → PostGIS (< 30 sec)
  5. Trigger WebSocket NOTIFY (instant)
  6. Refresh heatmap materialized view (instant)

Recovery:
  - Auto-retry on transient errors
  - Never crashes the main loop
  - SIGTERM handler for graceful shutdown
"""
import logging
import os
import signal
import time
from collections import deque
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from fastapi import BackgroundTasks, FastAPI

# ─── Services ─────────────────────────────────────────────────────────────────
from config import DB_CONFIG, NEWS_API_KEY, PIPELINE_INTERVAL_MINUTES
from database_service import DatabaseService
from geocoding_service import GeocodingService
from news_fetcher import NewsFetcherService
from nlp_processor import NLPProcessorService

# ─── Optional Redis ────────────────────────────────────────────────────────────
try:
    import redis as redis_lib
    _redis = redis_lib.Redis(
        host=os.getenv("REDIS_HOST", "localhost"),
        port=int(os.getenv("REDIS_PORT", "6379")),
        db=0,
        decode_responses=True,
        socket_connect_timeout=3,
    )
    _redis.ping()
    logger_pre = logging.getLogger("pipeline")
    logger_pre.info("✅ Redis connected")
except Exception:
    _redis = None
    logging.getLogger("pipeline").warning("⚠️ Redis not available — using in-memory caching only")

# ─── Logging ──────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler("/tmp/safearound_pipeline.log", encoding="utf-8"),
    ],
)
logger = logging.getLogger("pipeline.orchestrator")

# ─── Global State ─────────────────────────────────────────────────────────────
_news_fetcher: NewsFetcherService  = None
_nlp_processor: NLPProcessorService = None
_geocoder: GeocodingService         = None
_database: DatabaseService          = None
_scheduler: BackgroundScheduler     = None

_stats = {
    "cycles":              0,
    "articles_fetched":    0,
    "processed":           0,
    "geocoded":            0,
    "inserted":            0,
    "failed_nlp":          0,
    "failed_geocode":      0,
    "errors":              0,
    "consecutive_errors":  0,
    "last_run":            None,
    "last_success":        None,
    "cycle_times_sec":     deque(maxlen=10),  # Rolling average
    "started_at":          datetime.now(timezone.utc).isoformat(),
}


# ──────────────────────────────────────────────────────────────────────────────
# PIPELINE CYCLE
# ──────────────────────────────────────────────────────────────────────────────

def run_pipeline_cycle():
    """
    Single pipeline cycle: Extract → Transform → Geocode → Load.
    Called by the scheduler and the /trigger endpoint.
    Auto-recovers from errors without crashing.
    """
    global _stats
    cycle_start = time.monotonic()
    ts          = datetime.now(timezone.utc).isoformat()
    _stats["cycles"] += 1
    _stats["last_run"] = ts

    logger.info("═══════════════════════════════════════════════════")
    logger.info("⚡ PIPELINE CYCLE #%d  started at %s", _stats["cycles"], ts)
    logger.info("═══════════════════════════════════════════════════")

    try:
        # ── PHASE 1: EXTRACT ──────────────────────────────────────────────
        t0           = time.monotonic()
        raw_articles = _news_fetcher.fetch_all_sources()
        _stats["articles_fetched"] += len(raw_articles)
        logger.info("Phase 1 EXTRACT: %d articles (%.1fs)", len(raw_articles), time.monotonic() - t0)

        if not raw_articles:
            logger.warning("No articles fetched — check news sources / internet connection")
            _stats["consecutive_errors"] += 1
            return

        # ── PHASE 2: TRANSFORM (NLP) ──────────────────────────────────────
        t0 = time.monotonic()
        processed = []
        for article in raw_articles:
            result = _nlp_processor.process(article)
            if result:
                processed.append(result)
            else:
                _stats["failed_nlp"] += 1

        _stats["processed"] += len(processed)
        logger.info(
            "Phase 2 NLP:     %d/%d processed (%.1fs)",
            len(processed), len(raw_articles), time.monotonic() - t0
        )

        if not processed:
            logger.warning("No articles passed NLP filtering")
            return

        # ── PHASE 3: GEOCODE ──────────────────────────────────────────────
        t0         = time.monotonic()
        geocoded   = []
        for inc in processed:
            location_text = inc.get("location_text", "")
            geo           = _geocoder.geocode(location_text)
            if geo:
                inc["latitude"]          = geo["latitude"]
                inc["longitude"]         = geo["longitude"]
                inc["formatted_address"] = geo["formatted_address"]
                geocoded.append(inc)
                _stats["geocoded"] += 1
            else:
                _stats["failed_geocode"] += 1
                logger.debug("Geocode miss: %s", location_text[:60])

        logger.info(
            "Phase 3 GEOCODE: %d/%d geocoded (%.1fs)",
            len(geocoded), len(processed), time.monotonic() - t0
        )

        # ── PHASE 4: LOAD ─────────────────────────────────────────────────
        t0       = time.monotonic()
        inserted = _database.save_batch(geocoded)
        _stats["inserted"] += inserted
        logger.info(
            "Phase 4 LOAD:    %d new incidents inserted (%.1fs)",
            inserted, time.monotonic() - t0
        )

        # ── POST-PROCESSING ───────────────────────────────────────────────
        _stats["consecutive_errors"] = 0
        _stats["last_success"]       = datetime.now(timezone.utc).isoformat()

        cycle_secs = time.monotonic() - cycle_start
        _stats["cycle_times_sec"].append(round(cycle_secs, 1))

        logger.info(
            "✅ CYCLE COMPLETE in %.1fs | Total: %d fetched / %d processed / %d geocoded / %d inserted",
            cycle_secs,
            _stats["articles_fetched"],
            _stats["processed"],
            _stats["geocoded"],
            _stats["inserted"],
        )

    except Exception as exc:
        _stats["errors"]             += 1
        _stats["consecutive_errors"] += 1
        logger.error("❌ Pipeline cycle error: %s", exc, exc_info=True)

        if _stats["consecutive_errors"] >= 3:
            logger.critical(
                "🚨 %d consecutive errors! Increasing wait before next cycle.",
                _stats["consecutive_errors"]
            )


# ──────────────────────────────────────────────────────────────────────────────
# INITIALIZATION
# ──────────────────────────────────────────────────────────────────────────────

def _init_services():
    global _news_fetcher, _nlp_processor, _geocoder, _database

    google_maps_key = os.getenv("GOOGLE_MAPS_API_KEY", "")
    if not google_maps_key:
        logger.warning("⚠️ GOOGLE_MAPS_API_KEY not set — using offline city fallback only")

    _news_fetcher  = NewsFetcherService(redis_client=_redis, news_api_key=NEWS_API_KEY)
    _nlp_processor = NLPProcessorService()
    _geocoder      = GeocodingService(api_key=google_maps_key, redis_client=_redis)
    _database      = DatabaseService(db_config=DB_CONFIG)

    logger.info("✅ All services initialised")


def _validate_dependencies():
    """Check all critical dependencies on startup."""
    errors = []
    if not _database.health_check():
        errors.append("PostgreSQL unreachable")
    if errors:
        for err in errors:
            logger.critical("❌ Dependency check FAILED: %s", err)
        raise RuntimeError(f"Critical dependency failures: {errors}")
    logger.info("✅ Dependency checks passed")


# ──────────────────────────────────────────────────────────────────────────────
# FASTAPI APP
# ──────────────────────────────────────────────────────────────────────────────

@asynccontextmanager
async def lifespan(app: FastAPI):
    global _scheduler
    _init_services()
    _validate_dependencies()

    _scheduler = BackgroundScheduler(timezone="UTC")
    _scheduler.add_job(
        run_pipeline_cycle,
        "interval",
        minutes=PIPELINE_INTERVAL_MINUTES,
        id="crime_pipeline",
        replace_existing=True,
        max_instances=1,  # Never overlap cycles
    )
    _scheduler.start()
    logger.info("⏰ Scheduler started: every %d minutes", PIPELINE_INTERVAL_MINUTES)

    # Run one cycle immediately
    run_pipeline_cycle()

    yield

    logger.info("🛑 Shutting down pipeline...")
    _scheduler.shutdown(wait=False)


app = FastAPI(
    title="SafeAround Crime Pipeline",
    description="India-wide automated crime tracking system",
    version="3.0.0",
    lifespan=lifespan,
)


@app.get("/health")
def health():
    """Liveness probe for Docker / Kubernetes."""
    db_ok         = _database.health_check() if _database else False
    consec_errors = _stats["consecutive_errors"]
    status        = "healthy" if (db_ok and consec_errors < 3) else \
                    "degraded" if (db_ok and consec_errors < 5) else "unhealthy"

    avg_cycle = (
        round(sum(_stats["cycle_times_sec"]) / len(_stats["cycle_times_sec"]), 1)
        if _stats["cycle_times_sec"] else None
    )
    geocode_rate = (
        round(_stats["geocoded"] / _stats["processed"] * 100, 1)
        if _stats["processed"] else 0
    )

    return {
        "status":                   status,
        "database_connected":        db_ok,
        "last_successful_run":       _stats["last_success"],
        "articles_processed_today":  _stats["processed"],
        "articles_inserted_today":   _stats["inserted"],
        "geocoding_success_rate_pct": geocode_rate,
        "errors_consecutive":        consec_errors,
        "avg_cycle_duration_sec":    avg_cycle,
    }


@app.get("/stats")
def stats():
    """Detailed pipeline and database statistics."""
    db_stats = _database.get_stats() if _database else {}
    return {
        "pipeline": _stats,
        "database": db_stats,
    }


@app.post("/trigger")
def trigger(background_tasks: BackgroundTasks):
    """Manually trigger a pipeline cycle."""
    background_tasks.add_task(run_pipeline_cycle)
    return {"message": "Pipeline cycle triggered", "timestamp": datetime.now(timezone.utc).isoformat()}


# ──────────────────────────────────────────────────────────────────────────────
# STANDALONE (python crime_pipeline.py)
# ──────────────────────────────────────────────────────────────────────────────

def _handle_shutdown(signum, frame):
    logger.info("👋 SIGTERM received — shutting down gracefully...")
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=True)
    logger.info("Shutdown complete.")
    raise SystemExit(0)


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, _handle_shutdown)
    signal.signal(signal.SIGINT, _handle_shutdown)

    _init_services()
    _validate_dependencies()

    _scheduler = BackgroundScheduler(timezone="UTC")
    _scheduler.add_job(
        run_pipeline_cycle,
        "interval",
        minutes=PIPELINE_INTERVAL_MINUTES,
        id="crime_pipeline",
        max_instances=1,
    )
    _scheduler.start()

    logger.info("🚀 Crime Pipeline running. Interval: %d min. Ctrl+C to stop.", PIPELINE_INTERVAL_MINUTES)
    run_pipeline_cycle()   # Immediate first run

    try:
        while True:
            time.sleep(60)
    except (KeyboardInterrupt, SystemExit):
        _scheduler.shutdown()
        logger.info("Pipeline stopped.")
