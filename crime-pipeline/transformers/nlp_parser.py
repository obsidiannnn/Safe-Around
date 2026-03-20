import spacy
from datetime import datetime
from typing import Dict, List
import re

class NLPParser:
    """Natural language processing for crime descriptions"""
    
    def __init__(self):
        # Gracefully handle the absence of the explicit model until installed via shell
        try:
            self.nlp = spacy.load("en_core_web_lg")
        except OSError:
            # We install this via python -m spacy download en_core_web_lg during docker build
            self.nlp = spacy.blank("en")
        
        # Crime type keywords
        self.crime_keywords = {
            'theft': ['theft', 'stolen', 'robbery', 'burglary', 'shoplifting'],
            'assault': ['assault', 'attack', 'violence', 'fight', 'battery'],
            'vandalism': ['vandalism', 'graffiti', 'property damage'],
            'drug': ['drug', 'narcotics', 'substance', 'marijuana'],
            'vehicle': ['vehicle', 'car theft', 'carjacking'],
            'weapon': ['weapon', 'gun', 'knife', 'firearm']
        }
    
    def extract_entities(self, text: str) -> Dict:
        """
        Extract named entities using spaCy
        
        Args:
            text: Crime description text
            
        Returns:
            Dict with extracted entities
        """
        doc = self.nlp(text)
        
        entities = {
            'locations': [],
            'dates': [],
            'organizations': [],
            'persons': []
        }
        
        for ent in doc.ents:
            if ent.label_ in ('GPE', 'LOC'):
                entities['locations'].append(ent.text)
            elif ent.label_ == 'DATE':
                entities['dates'].append(ent.text)
            elif ent.label_ == 'ORG':
                entities['organizations'].append(ent.text)
            elif ent.label_ == 'PERSON':
                entities['persons'].append(ent.text)
        
        return entities
    
    def classify_crime_type(self, description: str) -> str:
        """
        Classify crime type from description
        
        Returns:
            Crime type string
        """
        description_lower = description.lower()
        
        # Score each crime type
        scores = {}
        for crime_type, keywords in self.crime_keywords.items():
            score = sum(1 for kw in keywords if kw in description_lower)
            if score > 0:
                scores[crime_type] = score
        
        if not scores:
            return 'other'
        
        # Return highest scoring type
        return max(scores, key=scores.get)
    
    def extract_severity_indicators(self, description: str) -> int:
        """
        Estimate severity from description
        
        Returns:
            Severity level (1-4)
        """
        description_lower = description.lower()
        
        # High severity indicators
        high_severity = ['weapon', 'gun', 'knife', 'injury', 'death', 'murder']
        medium_severity = ['assault', 'attack', 'violence']
        
        if any(word in description_lower for word in high_severity):
            return 4
        elif any(word in description_lower for word in medium_severity):
            return 3
        elif 'theft' in description_lower or 'robbery' in description_lower:
            return 2
        else:
            return 1
