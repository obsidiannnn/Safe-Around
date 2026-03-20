import psycopg2
from psycopg2.extras import execute_values
from typing import List, Dict, Optional
from datetime import datetime
import logging
import hashlib

logger = logging.getLogger(__name__)

class PostgresLoader:
    """Bulk load crime data into PostgreSQL with deduplication"""
    
    def __init__(self, db_config: Dict):
        self.conn = psycopg2.connect(**db_config)
        self.conn.autocommit = False
    
    def generate_dedup_hash(self, incident: Dict) -> str:
        """Create a unique hash based on location, time, and type to prevent duplicates"""
        key = f"{incident.get('latitude')}_{incident.get('longitude')}_{incident.get('occurred_at')}_{incident.get('incident_type')}"
        return hashlib.md5(key.encode()).hexdigest()

    def bulk_insert_incidents(self, incidents: List[Dict]) -> int:
        """
        Bulk insert crime incidents
        
        Args:
            incidents: List of processed incident dicts
            
        Returns:
            Number of rows inserted
        """
        if not incidents:
            return 0
        
        query = """
            INSERT INTO crime_incidents (
                id, source_id, incident_type, location,
                severity, description, address, metadata,
                occurred_at, reported_at, scraped_at, verified, dedup_hash
            ) VALUES %s
            ON CONFLICT (dedup_hash) DO UPDATE
            SET 
                incident_type = EXCLUDED.incident_type,
                severity = EXCLUDED.severity,
                description = EXCLUDED.description,
                metadata = EXCLUDED.metadata,
                scraped_at = EXCLUDED.scraped_at
            RETURNING id
        """
        
        values = []
        for inc in incidents:
            lat = inc.get('latitude')
            lng = inc.get('longitude')
            
            # Validation: ensure valid coordinates
            if lat is None or lng is None or lat < -90 or lat > 90 or lng < -180 or lng > 180:
                logger.warning(f"Invalid coordinates: {lat}, {lng}. Skipping.")
                continue

            dedup_hash = self.generate_dedup_hash(inc)

            values.append(
                (
                    inc['id'],
                    inc.get('source_id', inc.get('source', 'unknown')),
                    inc['incident_type'],
                    f"SRID=4326;POINT({lng} {lat})",
                    inc['severity'],
                    inc.get('description', ''),
                    inc.get('address', ''),
                    psycopg2.extras.Json(inc.get('metadata', {})),
                    inc['occurred_at'],
                    inc['reported_at'],
                    inc['scraped_at'],
                    inc.get('verified', False),
                    dedup_hash
                )
            )
        
        try:
            cur = self.conn.cursor()
            execute_values(cur, query, values, page_size=100)
            self.conn.commit()
            
            inserted_count = cur.rowcount
            logger.info(f"Inserted/updated {inserted_count} valid incidents")
            
            return inserted_count
            
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Bulk insert failed: {e}")
            raise
    
    def get_latest_scrape_time(self, source: str) -> Optional[datetime]:
        """Get timestamp of last successful scrape for a source"""
        query = "SELECT MAX(scraped_at) FROM crime_incidents WHERE source_id = %s"
        
        cur = self.conn.cursor()
        cur.execute(query, (source,))
        result = cur.fetchone()
        
        return result[0] if result else None
