"""
PostgreSQL Loader for SafeAround Area-Specific Crime Tracker
Handles all DB writes with deduplication and PostGIS geometry support.
"""
import psycopg2
from psycopg2.extras import execute_values
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


class PostgresLoader:
    """
    Insert crime incidents from the area-specific tracker into the
    crime_incidents PostGIS table with ON CONFLICT DO NOTHING deduplication.
    """

    def __init__(self, db_config: dict):
        self.db_config = db_config

    def _connect(self):
        return psycopg2.connect(**self.db_config)

    def bulk_insert_incidents(self, incidents: list) -> int:
        """
        Insert a list of processed incident dicts.
        Each dict must have keys:
          crime_type, severity, latitude, longitude, address,
          description, source, source_url, occurred_at
        Returns: number of rows inserted.
        """
        if not incidents:
            return 0

        query = """
            INSERT INTO crime_incidents (
                crime_type, severity, location, address,
                description, source, source_url, occurred_at,
                verified, created_at
            ) VALUES %s
            ON CONFLICT DO NOTHING
        """

        values = []
        for inc in incidents:
            lat  = inc.get('latitude')
            lng  = inc.get('longitude')
            if lat is None or lng is None:
                continue

            point = f"SRID=4326;POINT({lng} {lat})"
            values.append((
                inc.get('crime_type', 'other'),
                int(inc.get('severity', 1)),
                point,
                inc.get('address', ''),
                str(inc.get('description', ''))[:500],
                inc.get('source', 'area_tracker'),
                inc.get('source_url', ''),
                inc.get('occurred_at') or datetime.utcnow(),
                True,           # verified = True for news-sourced data
                datetime.utcnow(),
            ))

        if not values:
            return 0

        try:
            conn = self._connect()
            cur  = conn.cursor()
            execute_values(cur, query, values)
            conn.commit()
            count = cur.rowcount
            logger.info(f"✅ Inserted {count} new crime incidents")
            return count
        except Exception as e:
            conn.rollback()
            logger.error(f"❌ DB insert error: {e}")
            return 0
        finally:
            cur.close()
            conn.close()

    def get_stats(self) -> dict:
        """Return basic table statistics for the health endpoint."""
        try:
            conn = self._connect()
            cur  = conn.cursor()
            cur.execute("SELECT COUNT(*) FROM crime_incidents")
            total = cur.fetchone()[0]
            cur.execute(
                "SELECT COUNT(*) FROM crime_incidents WHERE occurred_at > NOW() - INTERVAL '24 hours'"
            )
            last_24h = cur.fetchone()[0]
            return {"total": total, "last_24h": last_24h}
        except Exception as e:
            logger.error(f"Stats query error: {e}")
            return {"total": 0, "last_24h": 0}
        finally:
            try:
                cur.close()
                conn.close()
            except Exception:
                pass
