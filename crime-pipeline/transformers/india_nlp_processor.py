import spacy
from geopy.geocoders import Nominatim
from geopy.exc import GeocoderTimedOut
import re
from typing import Dict, Optional, Tuple
import logging
from datetime import datetime
from dateutil import parser

logger = logging.getLogger(__name__)

class IndiaNLPProcessor:
    """
    Process crime text with NLP
    Extract: crime type, location (city/village), severity
    """
    
    def __init__(self):
        # Load spaCy model (ensure it's installed: python -m spacy download en_core_web_lg)
        try:
            self.nlp = spacy.load("en_core_web_lg")
        except:
            logger.warning("spaCy model NOT found. Falling back to basic extraction.")
            self.nlp = None
        
        # Initialize geolocator
        self.geolocator = Nominatim(user_agent="safearound_india")
        
        # Indian location patterns
        self.location_patterns = [
            r'(?:in|at|near)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',  # "in Delhi", "at Mumbai"
            r'([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:district|area|village|town)',
            r'(?:district|village|town|city)\s+(?:of\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)',
        ]
        
        # Crime type classification
        self.crime_types = {
            'murder': ['murder', 'killed', 'death', 'हत्या', 'मार डाला'],
            'rape': ['rape', 'sexual assault', 'बलात्कार', 'यौन उत्पीड़न'],
            'assault': ['assault', 'attack', 'beaten', 'हमला', 'मारपीट'],
            'robbery': ['robbery', 'loot', 'dacoity', 'लूट', 'डकैती'],
            'theft': ['theft', 'stolen', 'burglary', 'चोरी', 'सेंधमारी'],
            'kidnapping': ['kidnapping', 'abduction', 'missing', 'अपहरण'],
            'vehicle_crime': ['vehicle theft', 'car stolen', 'bike stolen'],
            'domestic_violence': ['domestic violence', 'घरेलू हिंसा'],
            'cybercrime': ['cybercrime', 'online fraud', 'साइबर अपराध'],
        }
        
        # Severity mapping
        self.severity_keywords = {
            4: ['murder', 'rape', 'killed', 'death', 'shooting', 'stabbing'],
            3: ['robbery', 'assault', 'attack', 'kidnapping', 'acid attack'],
            2: ['theft', 'burglary', 'chain snatching', 'vehicle theft'],
            1: ['vandalism', 'shoplifting', 'petty theft'],
        }
    
    def process_incident(self, raw_incident: Dict) -> Dict:
        """
        Process single incident
        Returns: Structured crime data with location
        """
        text = raw_incident.get('raw_text', '') + ' ' + raw_incident.get('description', '')
        
        # Extract entities with NLP
        doc = self.nlp(text) if self.nlp else None
        
        # Extract crime type
        crime_type = self.classify_crime_type(text)
        
        # Extract severity
        severity = self.calculate_severity(text, crime_type)
        
        # Extract location
        location_text = self.extract_location(text, doc)
        
        # Geocode location to lat/lng
        lat, lng = self.geocode_location(location_text)
        
        if lat is None or lng is None:
            logger.warning(f"Could not geocode: {location_text}")
            return None
        
        return {
            'title': raw_incident.get('title', ''),
            'description': text[:500],
            'crime_type': crime_type,
            'severity': severity,
            'location_text': location_text,
            'latitude': lat,
            'longitude': lng,
            'source': raw_incident.get('source', 'Unknown'),
            'source_url': raw_incident.get('link', ''),
            'occurred_at': self.parse_date(raw_incident.get('published', '')),
        }
    
    def extract_location(self, text: str, doc) -> str:
        """Extract location from text"""
        
        # Method 1: Use spaCy NER for GPE (Geo-Political Entity)
        if doc:
            locations = [ent.text for ent in doc.ents if ent.label_ in ('GPE', 'LOC')]
            if locations:
                return f"{locations[0]}, India"
        
        # Method 2: Regex patterns
        for pattern in self.location_patterns:
            match = re.search(pattern, text)
            if match:
                return f"{match.group(1)}, India"
        
        # Method 3: Look for state names
        indian_states = [
            'Delhi', 'Mumbai', 'Bangalore', 'Hyderabad', 'Chennai', 'Kolkata',
            'Pune', 'Ahmedabad', 'Jaipur', 'Lucknow', 'Chandigarh', 'Goa',
            'Maharashtra', 'Karnataka', 'Telangana', 'Tamil Nadu', 'West Bengal',
            'Gujarat', 'Rajasthan', 'Uttar Pradesh', 'Madhya Pradesh', 'Bihar',
        ]
        
        for state in indian_states:
            if state.lower() in text.lower():
                return f"{state}, India"
        
        return "India"  # Fallback
    
    def geocode_location(self, location_text: str) -> Tuple[Optional[float], Optional[float]]:
        """
        Convert location text to lat/lng coordinates
        Works for cities, towns, and villages in India
        """
        try:
            # Add country bias
            if "India" not in location_text:
                location_text += ", India"
            
            location = self.geolocator.geocode(
                location_text,
                timeout=10,
                exactly_one=True,
                country_codes=['in']  # Restrict to India only
            )
            
            if location:
                return (location.latitude, location.longitude)
        
        except GeocoderTimedOut:
            logger.warning(f"Geocoding timeout for: {location_text}")
        except Exception as e:
            logger.error(f"Geocoding error: {e}")
        
        return (None, None)
    
    def classify_crime_type(self, text: str) -> str:
        """Classify crime type from text"""
        text_lower = text.lower()
        
        # Score each crime type
        scores = {}
        for crime_type, keywords in self.crime_types.items():
            score = sum(1 for keyword in keywords if keyword in text_lower)
            if score > 0:
                scores[crime_type] = score
        
        if not scores:
            return 'other'
        
        # Return highest scoring type
        return max(scores, key=scores.get)
    
    def calculate_severity(self, text: str, crime_type: str) -> int:
        """Calculate severity (1-4)"""
        text_lower = text.lower()
        
        # Check severity keywords
        for severity, keywords in self.severity_keywords.items():
            if any(keyword in text_lower for keyword in keywords):
                return severity
        
        # Default based on crime type
        severity_defaults = {
            'murder': 4,
            'rape': 4,
            'assault': 3,
            'robbery': 3,
            'kidnapping': 3,
            'theft': 2,
            'vehicle_crime': 2,
            'domestic_violence': 3,
            'cybercrime': 2,
        }
        
        return severity_defaults.get(crime_type, 1)
    
    def parse_date(self, date_str: str):
        """Parse date from various formats"""
        try:
            return parser.parse(date_str)
        except:
            return datetime.utcnow()
