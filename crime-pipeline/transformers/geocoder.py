import googlemaps
from typing import Optional, Tuple
import logging

logger = logging.getLogger(__name__)

class Geocoder:
    """Geocode addresses to coordinates"""
    
    def __init__(self, api_key: str):
        if api_key:
            self.gmaps = googlemaps.Client(key=api_key)
        else:
            self.gmaps = None
            logger.warning("Google Maps API Key missing. Geocoding disabled.")
        self.cache = {}  # Simple in-memory cache
    
    def geocode_address(self, address: str) -> Optional[Tuple[float, float]]:
        """
        Convert address to (latitude, longitude)
        
        Args:
            address: Street address string
            
        Returns:
            (lat, lng) tuple or None if geocoding fails
        """
        if not self.gmaps:
            return None

        # Check cache
        if address in self.cache:
            return self.cache[address]
        
        try:
            result = self.gmaps.geocode(address)
            
            if not result:
                logger.warning(f"No geocoding result for: {address}")
                return None
            
            location = result[0]['geometry']['location']
            coords = (location['lat'], location['lng'])
            
            # Cache result
            self.cache[address] = coords
            
            return coords
            
        except Exception as e:
            logger.error(f"Geocoding error for '{address}': {e}")
            return None
    
    def reverse_geocode(self, lat: float, lng: float) -> Optional[str]:
        """
        Convert coordinates to address
        
        Returns:
            Formatted address string or None
        """
        if not self.gmaps:
            return None

        try:
            result = self.gmaps.reverse_geocode((lat, lng))
            
            if result:
                return result[0]['formatted_address']
                
        except Exception as e:
            logger.error(f"Reverse geocoding error: {e}")
        
        return None
