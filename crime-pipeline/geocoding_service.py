"""
SafeAround - Geocoding Service (Phase 3)
=========================================
Converts crime location text → precise (lat, lng) using Google Maps API.

Features:
  - Redis-backed geocoding cache (30-day TTL)
  - India bounds validation (lat 8-37, lng 68-97.5)
  - 3-tier fallback: full_address → city_only → state_only
  - Rate limiter: token bucket (50 req/sec)
  - Retry with exponential backoff
  - Offline cache: pre-geocoded major Indian cities
"""
import hashlib
import json
import logging
import time
from typing import Optional

import requests

logger = logging.getLogger("pipeline.geocoding")

# ─── India Bounds ──────────────────────────────────────────────────────────────
INDIA_BOUNDS = {
    "lat_min": 8.0,
    "lat_max": 37.0,
    "lng_min": 68.0,
    "lng_max": 97.5,
}

# ─── Pre-geocoded Fallback Cache ───────────────────────────────────────────────
# Used if Google API fails or during offline testing
KNOWN_CITY_COORDS = {
    "delhi":           (28.6139, 77.2090),
    "new delhi":       (28.6139, 77.2090),
    "mumbai":          (19.0760, 72.8777),
    "bangalore":       (12.9716, 77.5946),
    "bengaluru":       (12.9716, 77.5946),
    "hyderabad":       (17.3850, 78.4867),
    "chennai":         (13.0827, 80.2707),
    "kolkata":         (22.5726, 88.3639),
    "pune":            (18.5204, 73.8567),
    "ahmedabad":       (23.0225, 72.5714),
    "jaipur":          (26.9124, 75.7873),
    "lucknow":         (26.8467, 80.9462),
    "noida":           (28.5355, 77.3910),
    "gurgaon":         (28.4595, 77.0266),
    "gurugram":        (28.4595, 77.0266),
    "indore":          (22.7196, 75.8577),
    "bhopal":          (23.2599, 77.4126),
    "nagpur":          (21.1458, 79.0882),
    "chandigarh":      (30.7333, 76.7794),
    "visakhapatnam":   (17.6868, 83.2185),
    "patna":           (25.5941, 85.1376),
    "ranchi":          (23.3441, 85.3096),
    "coimbatore":      (11.0168, 76.9558),
    "kochi":           (9.9312, 76.2673),
    "thiruvananthapuram": (8.5241, 76.9366),
    "srinagar":        (34.0837, 74.7973),
    "amritsar":        (31.6340, 74.8723),
    "dehradun":        (30.3165, 78.0322),
    "vadodara":        (22.3072, 73.1812),
    "surat":           (21.1702, 72.8311),
    "nashik":          (19.9975, 73.7898),
    "agra":            (27.1767, 78.0081),
    "varanasi":        (25.3176, 82.9739),
    "guwahati":        (26.1445, 91.7362),
    "bhubaneswar":     (20.2961, 85.8245),
}


class GeocodingService:
    """
    Converts location text to lat/lng using Google Maps Geocoding API.
    Implements Redis caching, retry logic, and India bounds validation.
    """

    def __init__(self, api_key: str = "", redis_client=None):
        self.api_key     = api_key
        self.redis       = redis_client
        self._rate_count = 0
        self._rate_ts    = time.monotonic()
        self._local_cache: dict = {}   # In-memory fast cache

    # ──────────────────────────────────────────────────────────────────────────
    # PUBLIC: Geocode
    # ──────────────────────────────────────────────────────────────────────────

    def geocode(self, location_text: str) -> Optional[dict]:
        """
        Geocode a location string.
        Returns dict {latitude, longitude, formatted_address, accuracy} or None.
        """
        if not location_text or len(location_text.strip()) < 3:
            return None

        clean = self._clean_location(location_text)

        # Check cache first
        cached = self._get_cache(clean)
        if cached:
            return cached

        # Attempt Google API geocode with fallbacks
        result = None

        if self.api_key:
            # Tier 1: full address
            result = self._geocode_via_google(clean)

            # Tier 2: city only
            if not result:
                city_query = self._extract_city(clean)
                if city_query:
                    result = self._geocode_via_google(city_query + ", India")

            # Tier 3: state only
            if not result:
                state = self._extract_state(clean)
                if state:
                    result = self._geocode_via_google(state + ", India")

        # Offline fallback from known cities dict
        if not result:
            result = self._offline_fallback(clean)

        if result:
            self._set_cache(clean, result)
            return result

        logger.debug("Geocoding failed for: %s", (location_text or "")[:80])
        return None

    # ──────────────────────────────────────────────────────────────────────────
    # GOOGLE MAPS API
    # ──────────────────────────────────────────────────────────────────────────

    def _geocode_via_google(self, address: Optional[str], max_retries: int = 3) -> Optional[dict]:
        if not address or not address.strip():
            return None

        self._rate_limit()

        for attempt in range(max_retries):
            try:
                resp = requests.get(
                    "https://maps.googleapis.com/maps/api/geocode/json",
                    params={
                        "address": address,
                        "region":  "in",
                        "key":     self.api_key,
                    },
                    timeout=10,
                )

                if resp.status_code == 200:
                    data   = resp.json()
                    status = data.get("status")

                    if status == "OK" and data.get("results"):
                        result = data["results"][0]
                        loc    = result["geometry"]["location"]
                        lat    = loc["lat"]
                        lng    = loc["lng"]

                        if self._is_in_india(lat, lng):
                            return {
                                "latitude":          lat,
                                "longitude":         lng,
                                "formatted_address": result.get("formatted_address", address),
                                "accuracy":          result["geometry"].get("location_type", "APPROXIMATE"),
                            }
                        else:
                            logger.debug("Geocode outside India: %.4f, %.4f for '%s'", lat, lng, address)
                            return None

                    elif status == "ZERO_RESULTS":
                        return None
                    elif status == "OVER_QUERY_LIMIT":
                        logger.warning("Google Maps rate limit hit, waiting 2s")
                        time.sleep(2 ** attempt)
                    elif status == "REQUEST_DENIED":
                        logger.error("Google Maps API key denied — check your key!")
                        return None

                elif resp.status_code == 429:
                    time.sleep(2 ** attempt)

            except requests.Timeout:
                logger.debug("Google geocode timeout (attempt %d) for: %s", attempt + 1, (address or "")[:40])
                time.sleep(1)
            except Exception as exc:
                logger.debug("Google geocode error: %s", exc)
                time.sleep(1)

        return None

    # ──────────────────────────────────────────────────────────────────────────
    # OFFLINE FALLBACK
    # ──────────────────────────────────────────────────────────────────────────

    def _offline_fallback(self, location_text: str) -> Optional[dict]:
        text_lc = location_text.lower()
        for city_key, (lat, lng) in KNOWN_CITY_COORDS.items():
            if city_key in text_lc:
                return {
                    "latitude":          lat,
                    "longitude":         lng,
                    "formatted_address": f"{city_key.title()}, India",
                    "accuracy":          "APPROXIMATE",
                }
        return None

    # ──────────────────────────────────────────────────────────────────────────
    # CACHE (Redis + in-memory)
    # ──────────────────────────────────────────────────────────────────────────

    def _cache_key(self, location: str) -> str:
        return f"sa:geo:{hashlib.md5(location.lower().encode()).hexdigest()}"

    def _get_cache(self, location: str) -> Optional[dict]:
        key = self._cache_key(location)
        if key in self._local_cache:
            return self._local_cache[key]
        if self.redis:
            raw = self.redis.get(key)
            if raw:
                return json.loads(raw)
        return None

    def _set_cache(self, location: str, result: dict):
        key = self._cache_key(location)
        self._local_cache[key] = result
        if self.redis:
            self.redis.setex(key, 30 * 86400, json.dumps(result))  # 30-day TTL

    # ──────────────────────────────────────────────────────────────────────────
    # RATE LIMITER (Token Bucket: 50 req/sec)
    # ──────────────────────────────────────────────────────────────────────────

    def _rate_limit(self):
        now = time.monotonic()
        elapsed = now - self._rate_ts
        if elapsed >= 1.0:
            self._rate_count = 0
            self._rate_ts    = now

        self._rate_count += 1
        if self._rate_count > 45:   # Stay well under 50 req/sec
            sleep_ms = 1.0 - elapsed
            if sleep_ms > 0:
                time.sleep(sleep_ms)
            self._rate_count = 0
            self._rate_ts    = time.monotonic()

    # ──────────────────────────────────────────────────────────────────────────
    # HELPERS
    # ──────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _is_in_india(lat: float, lng: float) -> bool:
        return (INDIA_BOUNDS["lat_min"] <= lat <= INDIA_BOUNDS["lat_max"] and
                INDIA_BOUNDS["lng_min"] <= lng <= INDIA_BOUNDS["lng_max"])

    @staticmethod
    def _clean_location(text: str) -> str:
        import re
        text = re.sub(r"\s+", " ", text.strip())
        if "india" not in text.lower():
            text = text.rstrip(", ") + ", India"
        return text

    @staticmethod
    def _extract_city(location_text: str) -> str:
        """Pull the city portion from a full location string."""
        parts = [p.strip() for p in location_text.split(",")]
        # Try to find a part that matches a known city
        for part in parts:
            if part.lower().replace(" ", "") in {c.replace(" ", "") for c in KNOWN_CITY_COORDS}:
                return part
        # Fallback: return the second part if available
        return parts[1] if len(parts) > 1 else parts[0]

    @staticmethod
    def _extract_state(location_text: str) -> Optional[str]:
        # Inlined to avoid circular import with nlp_processor
        _STATES = {
            "andhra pradesh", "arunachal pradesh", "assam", "bihar",
            "chhattisgarh", "goa", "gujarat", "haryana", "himachal pradesh",
            "jharkhand", "karnataka", "kerala", "madhya pradesh", "maharashtra",
            "manipur", "meghalaya", "mizoram", "nagaland", "odisha", "punjab",
            "rajasthan", "sikkim", "tamil nadu", "telangana", "tripura",
            "uttar pradesh", "uttarakhand", "west bengal",
            "delhi", "jammu", "kashmir", "ladakh", "chandigarh", "puducherry",
        }
        text_lc = location_text.lower()
        for state in _STATES:
            if state in text_lc:
                return state.title()
        return None
