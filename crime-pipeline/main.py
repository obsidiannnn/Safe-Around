from fastapi import FastAPI, BackgroundTasks
from apscheduler.schedulers.background import BackgroundScheduler
from datetime import datetime
import uuid

from extractors.police_api import PoliceAPIExtractor
from extractors.news_scraper import NewsScraper
from transformers.nlp_parser import NLPParser
from transformers.geocoder import Geocoder
from loaders.postgres_loader import PostgresLoader
from config import settings
from utils.logger import setup_logger, Alerter

logger = setup_logger()
alerter = Alerter(failure_threshold=3)

app = FastAPI(title="SafeAround Crime Pipeline")

police_extractor = PoliceAPIExtractor(
    api_url=settings.POLICE_API_URL,
    api_key=settings.POLICE_API_KEY
)
news_scraper = NewsScraper(settings.NEWS_SITES)
nlp_parser = NLPParser()
geocoder = Geocoder(settings.GOOGLE_MAPS_API_KEY)
postgres_loader = PostgresLoader(settings.DATABASE_CONFIG)

pipeline_stats = {
    'last_run': None,
    'total_processed': 0,
    'total_inserted': 0,
    'errors': 0
}

def parse_datetime(dt_val):
    if isinstance(dt_val, str):
        try:
            return datetime.fromisoformat(dt_val.replace('Z', '+00:00'))
        except ValueError:
            pass
    elif isinstance(dt_val, datetime):
        return dt_val
    return datetime.utcnow()

def generate_uuid():
    return str(uuid.uuid4())

def run_pipeline():
    """Main ETL pipeline - Extract, Transform, Load"""
    logger.info("Starting crime data pipeline...")
    start_time = datetime.utcnow()
    
    try:
        # EXTRACT
        logger.info("Extracting data from sources...")
        police_data = police_extractor.fetch_incidents(since_minutes=15)
        news_data = news_scraper.scrape_all()
        
        all_raw_data = police_data + news_data
        logger.info(f"Extracted {len(all_raw_data)} total incidents")
        
        # TRANSFORM
        logger.info("Transforming data...")
        processed_incidents = []
        
        for raw_incident in all_raw_data:
            try:
                entities = nlp_parser.extract_entities(raw_incident.get('description', ''))
                crime_type = nlp_parser.classify_crime_type(raw_incident.get('description', ''))
                severity = nlp_parser.extract_severity_indicators(raw_incident.get('description', ''))
                
                if not raw_incident.get('latitude') or not raw_incident.get('longitude'):
                    address = raw_incident.get('address')
                    if address:
                        coords = geocoder.geocode_address(address)
                        if coords:
                            raw_incident['latitude'], raw_incident['longitude'] = coords
                
                # Validation handled safely skipping
                if not raw_incident.get('latitude') or not raw_incident.get('longitude'):
                    logger.warning(f"Skipping incident without coordinates")
                    continue
                
                processed = {
                    'id': raw_incident.get('id') or generate_uuid(),
                    'source_id': raw_incident.get('source_id', getattr(raw_incident, 'source', 'system')),
                    'incident_type': crime_type,
                    'severity': severity,
                    'description': raw_incident.get('description'),
                    'address': raw_incident.get('address'),
                    'latitude': raw_incident['latitude'],
                    'longitude': raw_incident['longitude'],
                    'occurred_at': parse_datetime(raw_incident.get('occurred_at')),
                    'reported_at': parse_datetime(raw_incident.get('reported_at')),
                    'scraped_at': datetime.utcnow(),
                    'metadata': {
                        'entities': entities,
                        'raw_source': raw_incident.get('source', 'default')
                    }
                }
                
                processed_incidents.append(processed)
                
            except Exception as e:
                logger.error(f"Error processing incident: {e}")
                pipeline_stats['errors'] += 1
                continue
        
        logger.info(f"Transformed {len(processed_incidents)} incidents")
        
        # LOAD
        logger.info("Loading data to PostgreSQL...")
        inserted_count = postgres_loader.bulk_insert_incidents(processed_incidents)
        
        # Update stats
        pipeline_stats['last_run'] = datetime.utcnow().isoformat()
        pipeline_stats['total_processed'] += len(all_raw_data)
        pipeline_stats['total_inserted'] += inserted_count
        
        alerter.register_success()
        
        duration = (datetime.utcnow() - start_time).total_seconds()
        logger.info(f"Pipeline completed in {duration:.2f}s - Inserted {inserted_count} incidents")
        
    except Exception as e:
        logger.error(f"Pipeline failed: {e}")
        pipeline_stats['errors'] += 1
        alerter.register_failure(e)

scheduler = BackgroundScheduler()
scheduler.add_job(run_pipeline, 'interval', minutes=15)
scheduler.start()

@app.on_event("startup")
def startup_event():
    logger.info("Crime pipeline service started")
    # Uncomment to run immediately on boot (commented conventionally to avoid initial bulk delay)
    # background_tasks.add_task(run_pipeline)

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "crime-pipeline"
    }

@app.get("/stats")
def get_stats():
    return pipeline_stats

@app.post("/trigger")
def trigger_pipeline(background_tasks: BackgroundTasks):
    """Manually trigger pipeline run"""
    background_tasks.add_task(run_pipeline)
    return {"message": "Pipeline triggered"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
