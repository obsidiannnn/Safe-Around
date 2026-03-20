import requests
from datetime import datetime, timedelta
from typing import List, Dict
import logging

logger = logging.getLogger(__name__)

class PoliceAPIExtractor:
    """Extract crime data from police department APIs"""
    
    def __init__(self, api_url: str, api_key: str):
        self.api_url = api_url
        self.api_key = api_key
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        })
    
    def fetch_incidents(self, since_minutes: int = 15) -> List[Dict]:
        """
        Fetch crime incidents from last N minutes
        
        Args:
            since_minutes: Look back period in minutes
            
        Returns:
            List of incident dictionaries
        """
        since_date = datetime.utcnow() - timedelta(minutes=since_minutes)
        
        params = {
            'start_date': since_date.isoformat(),
            'limit': 1000,
            'verified': True
        }
        
        try:
            response = self.session.get(
                f"{self.api_url}/incidents",
                params=params,
                timeout=30
            )
            response.raise_for_status()
            
            data = response.json()
            incidents = data.get('incidents', [])
            
            logger.info(f"Fetched {len(incidents)} incidents from police API")
            return incidents
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Police API fetch failed: {e}")
            return []
    
    def parse_incident(self, raw: Dict) -> Dict:
        """
        Parse raw API response to standard format
        
        Returns:
            Standardized incident dict
        """
        return {
            'external_id': raw.get('case_number'),
            'incident_type': raw.get('offense_type'),
            'description': raw.get('narrative'),
            'address': raw.get('block_address'),
            'latitude': raw.get('latitude'),
            'longitude': raw.get('longitude'),
            'occurred_at': raw.get('occurred_date'),
            'reported_at': raw.get('reported_date'),
            'source': 'police_api',
            'raw_data': raw
        }
