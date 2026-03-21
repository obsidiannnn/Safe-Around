"""
SafeAround - Database Service (Phase 4)
========================================
Handles all PostgreSQL interactions for the crime pipeline.

Features:
  - Connection pooling (psycopg2 ThreadedConnectionPool, 2-10 connections)
  - Batch upsert with PostGIS ST_MakePoint geometry
  - ON CONFLICT (source_url) DO NOTHING deduplication
  - Materialized view refresh for heatmap
  - PostgreSQL NOTIFY for real-time WebSocket broadcast
  - Health check and statistics queries
  - Graceful retry on transient connection errors
"""
import json
import logging
from datetime import datetime
from typing import List

import psycopg2
import psycopg2.pool
from psycopg2.extras import execute_values

logger = logging.getLogger("pipeline.database")


class DatabaseService:
    """
    Manages PostgreSQL connections and crime incident persistence.
    Phase 4 of the SafeAround crime tracking pipeline.
    """

    # SQL: Main insert query
    INSERT_SQL = """
        INSERT INTO crime_incidents (
            type, crime_type, severity, location, location_name,
            description, source, source_url,
            occurred_at, scraped_at, verified
        ) VALUES %s
        ON CONFLICT (source_url) DO NOTHING
    """

    # SQL: Refresh heatmap materialized view (if exists)
    REFRESH_HEATMAP_SQL = """
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM pg_matviews WHERE matviewname = 'mv_crime_heatmap_grid'
            ) THEN
                REFRESH MATERIALIZED VIEW CONCURRENTLY mv_crime_heatmap_grid;
            END IF;
        END $$;
    """

    def __init__(self, db_config: dict, pool_min: int = 2, pool_max: int = 10):
        self.db_config  = db_config
        self._pool: psycopg2.pool.ThreadedConnectionPool = None
        self._init_pool(pool_min, pool_max)

    # ──────────────────────────────────────────────────────────────────────────
    # POOL MANAGEMENT
    # ──────────────────────────────────────────────────────────────────────────

    def _init_pool(self, min_conn: int, max_conn: int):
        """Initialize the connection pool with retry."""
        for attempt in range(5):
            try:
                self._pool = psycopg2.pool.ThreadedConnectionPool(
                    min_conn, max_conn, **self.db_config
                )
                logger.info("✅ DB connection pool initialized (min=%d, max=%d)", min_conn, max_conn)
                return
            except Exception as exc:
                import time
                wait = 2 ** attempt
                logger.warning("DB pool init attempt %d failed: %s. Retrying in %ds...", attempt + 1, exc, wait)
                time.sleep(wait)
        raise RuntimeError("Could not initialize DB connection pool after 5 attempts")

    def _get_conn(self):
        return self._pool.getconn()

    def _put_conn(self, conn, rollback: bool = False):
        if rollback:
            try:
                conn.rollback()
            except Exception:
                pass
        self._pool.putconn(conn)

    # ──────────────────────────────────────────────────────────────────────────
    # PUBLIC: Save Batch
    # ──────────────────────────────────────────────────────────────────────────

    def save_batch(self, incidents: list, batch_size: int = 100) -> int:
        """
        Insert processed + geocoded incidents in efficient batches.
        Returns total number of rows inserted.
        """
        if not incidents:
            return 0

        valid   = [i for i in incidents if self._validate(i)]
        skipped = len(incidents) - len(valid)
        if skipped:
            logger.warning("Skipped %d invalid incidents before DB insert", skipped)

        total_inserted = 0

        # Process in configurable batch_size chunks
        for i in range(0, len(valid), batch_size):
            batch   = valid[i: i + batch_size]
            inserted = self._insert_batch(batch)
            total_inserted += inserted

        if total_inserted > 0:
            self._refresh_heatmap()
            self._notify_websocket(total_inserted)

        logger.info("✅ DB: %d/%d incidents inserted", total_inserted, len(valid))
        return total_inserted

    # ──────────────────────────────────────────────────────────────────────────
    # PRIVATE: Insert Batch
    # ──────────────────────────────────────────────────────────────────────────

    def _insert_batch(self, incidents: list) -> int:
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            values = []
            for inc in incidents:
                lat = float(inc["latitude"])
                lng = float(inc["longitude"])
                # PostGIS: ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
                point = f"SRID=4326;POINT({lng} {lat})"
                values.append((
                    inc.get("crime_type",  "other"),
                    inc.get("crime_type",  "other"),
                    int(inc.get("severity", 1)),
                    point,
                    str(inc.get("formatted_address") or inc.get("address", ""))[:255],
                    str(inc.get("description", ""))[:500],
                    str(inc.get("source", "news"))[:100],
                    str(inc.get("source_url", ""))[:512],
                    inc.get("occurred_at") or datetime.utcnow(),
                    datetime.utcnow(),
                    True,
                ))

            execute_values(cur, self.INSERT_SQL, values, page_size=100)
            inserted = cur.rowcount
            conn.commit()
            cur.close()
            self._put_conn(conn)
            return max(inserted, 0)

        except Exception as exc:
            logger.error("DB batch insert failed: %s", exc)
            self._put_conn(conn, rollback=True)
            return 0

    # ──────────────────────────────────────────────────────────────────────────
    # HEATMAP + WEBSOCKET
    # ──────────────────────────────────────────────────────────────────────────

    def _refresh_heatmap(self):
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            cur.execute(self.REFRESH_HEATMAP_SQL)
            conn.commit()
            cur.close()
            logger.debug("Heatmap materialized view refreshed")
        except Exception as exc:
            logger.warning("Heatmap refresh failed (non-fatal): %s", exc)
        finally:
            self._put_conn(conn)

    def _notify_websocket(self, count: int):
        """PostgreSQL NOTIFY so Go WebSocket server broadcasts to clients."""
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            payload = json.dumps({"event": "crime_batch", "count": count, "ts": datetime.utcnow().isoformat()})
            cur.execute("SELECT pg_notify('crime_channel', %s)", (payload,))
            conn.commit()
            cur.close()
            logger.debug("Sent NOTIFY crime_channel: %d new crimes", count)
        except Exception as exc:
            logger.warning("WebSocket notify failed (non-fatal): %s", exc)
        finally:
            self._put_conn(conn)

    # ──────────────────────────────────────────────────────────────────────────
    # HEALTH + STATS
    # ──────────────────────────────────────────────────────────────────────────

    def health_check(self) -> bool:
        """Returns True if DB is reachable."""
        conn = None
        try:
            conn = self._get_conn()
            cur  = conn.cursor()
            cur.execute("SELECT 1")
            cur.close()
            return True
        except Exception:
            return False
        finally:
            if conn:
                self._put_conn(conn)

    def get_stats(self) -> dict:
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            cur.execute("SELECT COUNT(*) FROM crime_incidents")
            total = cur.fetchone()[0]

            cur.execute(
                "SELECT COUNT(*) FROM crime_incidents "
                "WHERE occurred_at > NOW() - INTERVAL '24 hours'"
            )
            last_24h = cur.fetchone()[0]

            cur.execute(
                "SELECT crime_type, COUNT(*) FROM crime_incidents "
                "GROUP BY crime_type ORDER BY COUNT(*) DESC LIMIT 5"
            )
            top_crimes = dict(cur.fetchall())

            cur.close()
            return {"total": total, "last_24h": last_24h, "top_crimes": top_crimes}
        except Exception as exc:
            logger.error("Stats query error: %s", exc)
            return {}
        finally:
            self._put_conn(conn)

    def archive_old_data(self, days: int = 90):
        """Move crimes older than `days` to crime_incidents_archive table."""
        conn = self._get_conn()
        try:
            cur = conn.cursor()
            cur.execute("""
                WITH moved AS (
                    DELETE FROM crime_incidents
                    WHERE occurred_at < NOW() - INTERVAL '%s days'
                    RETURNING *
                )
                INSERT INTO crime_incidents_archive SELECT * FROM moved
                ON CONFLICT DO NOTHING
            """, (days,))
            archived = cur.rowcount
            conn.commit()
            cur.close()
            if archived:
                logger.info("Archived %d old crime incidents (> %d days)", archived, days)
        except Exception as exc:
            logger.warning("Archive failed (non-fatal): %s", exc)
        finally:
            self._put_conn(conn)

    # ──────────────────────────────────────────────────────────────────────────
    # VALIDATION
    # ──────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _validate(inc: dict) -> bool:
        try:
            lat  = float(inc.get("latitude",  ""))
            lng  = float(inc.get("longitude", ""))
            sev  = int(inc.get("severity", 0))
            if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
                return False
            if not (1 <= sev <= 4):
                return False
            if not inc.get("crime_type") or not inc.get("source_url"):
                return False
            return True
        except (ValueError, TypeError):
            return False
