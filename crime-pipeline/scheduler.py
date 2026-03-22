"""
SafeAround Crime Pipeline - Scheduler (FIXED)
=============================================
Standalone scheduler entry point.
Uses the new modular pipeline instead of the deleted legacy extractors.

Run: python scheduler.py
"""
import logging
import signal
import sys
import time

from apscheduler.schedulers.background import BackgroundScheduler

from config import PIPELINE_INTERVAL_MINUTES
from crime_pipeline import run_pipeline_cycle, _init_services, _validate_dependencies

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s",
)
logger = logging.getLogger("scheduler")


def _shutdown(signum, frame):
    logger.info("👋 Signal received — shutting down scheduler...")
    sys.exit(0)


if __name__ == "__main__":
    signal.signal(signal.SIGTERM, _shutdown)
    signal.signal(signal.SIGINT, _shutdown)

    logger.info("🚀 Initialising SafeAround Crime Pipeline services...")
    _init_services()
    _validate_dependencies()

    scheduler = BackgroundScheduler(timezone="UTC")
    scheduler.add_job(
        run_pipeline_cycle,
        "interval",
        minutes=PIPELINE_INTERVAL_MINUTES,
        id="crime_pipeline",
        max_instances=1,
        replace_existing=True,
    )
    scheduler.start()
    logger.info("⏰ Scheduler running every %d minutes. Ctrl+C to stop.", PIPELINE_INTERVAL_MINUTES)

    # Immediate first run
    run_pipeline_cycle()

    try:
        while True:
            time.sleep(60)
    except (KeyboardInterrupt, SystemExit):
        scheduler.shutdown(wait=False)
        logger.info("Scheduler stopped cleanly.")
