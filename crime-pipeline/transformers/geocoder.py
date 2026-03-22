"""
SafeAround - Transformers Geocoder (FIXED)
==========================================
Thin wrapper around GeocodingService using HTTP requests only.
No longer uses the googlemaps SDK (not in requirements).
"""
import logging
from typing import Optional, Tuple

from geocoding_service import GeocodingService

logger = logging.getLogger(__name__)


class Geocoder:
    """
    Thin wrapper around GeocodingService.
    Kept for backward compatibility with any legacy code that imports Geocoder
    from transformers.geocoder.
    """

    def __init__(self, api_key: str = "", redis_client=None):
        self._service = GeocodingService(api_key=api_key, redis_client=redis_client)

    def geocode_address(self, address: str) -> Optional[Tuple[float, float]]:
        """Return (latitude, longitude) or None."""
        result = self._service.geocode(address)
        if result:
            return result["latitude"], result["longitude"]
        return None

    def reverse_geocode(self, lat: float, lng: float) -> Optional[str]:
        """Placeholder — not implemented without googlemaps SDK."""
        logger.warning("reverse_geocode called but not implemented.")
        return None
