"""
SafeAround - NLP Processor Service (Phase 2)
=============================================
Processes raw articles to extract:
  - Crime type (10 categories)
  - Severity (1-4 scale)
  - Location text (the most specific India location in the article)
  - Occurred date/time

Algorithm:
  1. Combine title + description
  2. Classify crime type using weighted keyword scoring
  3. Calculate severity from crime type + escalation keywords
  4. Named Entity Recognition (spaCy GPE/LOC/FAC)
  5. Regex patterns for contextual location mentions
  6. Validate extracted location is Indian
  7. Build structured location string
"""
import logging
import re
from datetime import datetime, timezone

from dateutil import parser as dateutil_parser

logger = logging.getLogger("pipeline.nlp_processor")

# ─── NLP Model (graceful degradation) ─────────────────────────────────────────
_nlp = None
try:
    import spacy
    try:
        _nlp = spacy.load("en_core_web_lg")
        logger.info("✅ spaCy en_core_web_lg loaded")
    except OSError:
        _nlp = spacy.load("en_core_web_sm")
        logger.warning("⚠️ spaCy sm model used — install en_core_web_lg for better NER")
except ImportError:
    logger.warning("⚠️ spaCy not installed — NER disabled")

# ─── Crime Taxonomy ────────────────────────────────────────────────────────────
# Each entry: crime_type → (base_severity, [keywords])
CRIME_TAXONOMY = {
    "murder":           (4, ["murder", "murdered", "killed", "killing", "found dead",
                              "dead body", "corpse", "shot dead", "हत्या", "मारा गया"]),
    "rape":             (4, ["rape", "gang rape", "sexual assault", "raped", "molestation",
                              "molested", "बलात्कार", "यौन उत्पीड़न"]),
    "kidnapping":       (3, ["kidnap", "kidnapped", "abduction", "abducted", "missing child",
                              "ransom", "अपहरण", "लापता"]),
    "robbery":          (3, ["robbery", "robbed", "dacoity", "dacoit", "loot", "looted",
                              "snatching", "snatched", "armed robbery", "लूट", "डकैती"]),
    "assault":          (3, ["assault", "assaulted", "attack", "attacked", "stabbing",
                              "stabbed", "beaten", "beating", "thrashed", "हमला", "पिटाई"]),
    "terrorist_act":    (4, ["terror", "terrorist", "explosion", "blast", "bomb",
                              "IED", "आतंकवाद", "विस्फोट"]),
    "drug_crime":       (2, ["drug", "narcotics", "cocaine", "heroin", "ganja",
                              "drug trafficking", "smuggling", "नशा", "तस्करी"]),
    "harassment":       (2, ["harass", "harassment", "eve teasing", "stalking", "stalked",
                              "molest", "छेड़छाड़", "उत्पीड़न"]),
    "theft":            (2, ["theft", "stolen", "steal", "stealing", "burglary",
                              "pickpocket", "shoplifting", "चोरी", "सेंधमारी"]),
    "vehicle_crime":    (2, ["car theft", "bike theft", "vehicle stolen", "car stolen",
                              "bike stolen", "two-wheeler stolen", "gadi chori"]),
    "fraud":            (1, ["fraud", "cheating", "scam", "duped", "cyber crime",
                              "phishing", "online fraud", "धोखाधड़ी"]),
    "domestic_violence":(2, ["domestic violence", "dowry", "wife beaten", "husband beaten",
                              "घरेलू हिंसा", "दहेज"]),
}

# Severity escalation keywords that override base severity
SEVERITY_ESCALATORS = {
    4: ["murder", "killed", "dead body", "gang rape", "explosion", "terrorist", "हत्या", "बलात्कार"],
    3: ["robbery", "assault", "kidnap", "stabbed", "shot", "लूट", "अपहरण"],
    2: ["theft", "fraud", "harass", "चोरी", "धोखाधड़ी"],
}

# ─── Indian Location Validation ────────────────────────────────────────────────
INDIAN_STATES = {
    "andhra pradesh", "arunachal pradesh", "assam", "bihar", "chhattisgarh",
    "goa", "gujarat", "haryana", "himachal pradesh", "jharkhand", "karnataka",
    "kerala", "madhya pradesh", "maharashtra", "manipur", "meghalaya", "mizoram",
    "nagaland", "odisha", "punjab", "rajasthan", "sikkim", "tamil nadu", "telangana",
    "tripura", "uttar pradesh", "uttarakhand", "west bengal",
    "delhi", "jammu", "kashmir", "ladakh", "chandigarh", "puducherry",
}

MAJOR_CITIES = {
    "delhi", "mumbai", "bangalore", "bengaluru", "hyderabad", "chennai", "kolkata",
    "pune", "ahmedabad", "jaipur", "lucknow", "kanpur", "nagpur", "indore",
    "bhopal", "visakhapatnam", "pimpri", "patna", "vadodara", "ghaziabad",
    "ludhiana", "agra", "nashik", "varanasi", "meerut", "rajkot", "srinagar",
    "amritsar", "allahabad", "ranchi", "jodhpur", "coimbatore", "kochi",
    "guwahati", "chandigarh", "thiruvananthapuram", "solapur", "hubballi",
    "tiruchirappalli", "bareilly", "moradabad", "mysuru", "gurgaon", "gurugram",
    "noida", "faridabad", "thane", "navi mumbai", "aurangabad", "dehradun",
}

# Regex patterns for contextual location extraction
LOCATION_PATTERNS = [
    r"in\s+([A-Z][a-zA-Z\s]+(?:district|area|village|town|city|sector|block|nagar|colony))",
    r"at\s+([A-Z][a-zA-Z\s]+(?:road|street|crossing|chowk|gate|market))",
    r"near\s+([A-Z][a-zA-Z\s]+)",
    r"([A-Z][a-zA-Z\s]+)\s+(?:area|sector|district|police\s+station)",
]

# Words to exclude from location extraction
EXCLUDE_WORDS = {
    "police", "court", "hospital", "government", "india", "station", "district",
    "sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
    "january", "february", "march", "april", "may", "june", "july", "august",
    "september", "october", "november", "december",
}


class NLPProcessorService:
    """
    Processes raw news articles into structured crime incidents using NLP.
    Phase 2 of the SafeAround crime tracking pipeline.
    """

    def __init__(self):
        self.nlp = _nlp

    def process(self, raw_article: dict) -> dict | None:
        """
        Full NLP processing pipeline for a single article.
        Returns structured incident dict or None if processing fails / invalid.
        """
        try:
            full_text = self._build_text(raw_article)
            if not full_text:
                return None

            crime_type = self._classify_crime_type(full_text)
            severity   = self._calculate_severity(full_text, crime_type)
            location   = self._extract_best_location(full_text)
            occurred   = self._extract_date(raw_article)

            # Validate
            if not location:
                logger.debug("No location found in: %s", raw_article.get("title", "")[:60])
                return None

            return {
                "title":         raw_article.get("title", ""),
                "description":   full_text[:500],
                "crime_type":    crime_type,
                "severity":      severity,
                "location_text": location,
                "occurred_at":   occurred,
                "source":        raw_article.get("source", "unknown"),
                "source_url":    raw_article.get("url", ""),
                "raw_text":      full_text,
            }

        except Exception as exc:
            logger.error("NLP processing error: %s | Article: %s", exc, raw_article.get("title", "")[:60])
            return None

    # ──────────────────────────────────────────────────────────────────────────
    # CRIME TYPE CLASSIFICATION
    # ──────────────────────────────────────────────────────────────────────────

    def _classify_crime_type(self, text: str) -> str:
        text_lc = text.lower()
        scores  = {}

        for ctype, (_, keywords) in CRIME_TAXONOMY.items():
            score = sum(1 for kw in keywords if kw in text_lc)
            if score > 0:
                scores[ctype] = score

        if not scores:
            return "other"
        return max(scores, key=scores.get)

    # ──────────────────────────────────────────────────────────────────────────
    # SEVERITY CALCULATION
    # ──────────────────────────────────────────────────────────────────────────

    def _calculate_severity(self, text: str, crime_type: str) -> int:
        text_lc = text.lower()

        # Override from escalation keywords
        for sev in (4, 3, 2):
            if any(kw in text_lc for kw in SEVERITY_ESCALATORS[sev]):
                return sev

        # Use taxonomy base severity
        base = CRIME_TAXONOMY.get(crime_type, (1, []))[0]
        return base

    # ──────────────────────────────────────────────────────────────────────────
    # LOCATION EXTRACTION
    # ──────────────────────────────────────────────────────────────────────────

    def _extract_best_location(self, text: str) -> str | None:
        """
        Extract the most specific Indian location from text.
        Priority: NER sub-locality > NER city > regex match > known-city scan
        """
        candidates = []

        # 1. spaCy NER
        if self.nlp:
            doc = self.nlp(text[:1500])
            for ent in doc.ents:
                if ent.label_ in ("GPE", "LOC", "FAC"):
                    loc = ent.text.strip()
                    if self._is_valid_location(loc):
                        candidates.append(loc)

        # 2. Regex patterns
        for pattern in LOCATION_PATTERNS:
            for match in re.finditer(pattern, text):
                loc = match.group(1).strip()
                if self._is_valid_location(loc):
                    candidates.append(loc)

        # 3. Known-city scan (fallback)
        text_lc = text.lower()
        for city in MAJOR_CITIES:
            if city in text_lc:
                candidates.append(city.title())

        if not candidates:
            return None

        # Deduplicate and sort by specificity (longer = more specific)
        seen    = set()
        unique  = []
        for c in candidates:
            norm = c.lower()
            if norm not in seen:
                seen.add(norm)
                unique.append(c)

        unique.sort(key=len, reverse=True)

        # Build structured location string
        specific = unique[0]
        city     = self._find_city_in_candidates(unique)
        state    = self._find_state_in_text(text)

        parts = [specific]
        if city and city.lower() != specific.lower():
            parts.append(city)
        if state:
            parts.append(state)
        parts.append("India")

        return ", ".join(parts)

    def _is_valid_location(self, loc: str) -> bool:
        if len(loc) < 3 or len(loc) > 80:
            return False
        if loc.lower() in EXCLUDE_WORDS:
            return False
        if loc.isdigit():
            return False
        return True

    def _find_city_in_candidates(self, candidates: list) -> str | None:
        for c in candidates:
            if c.lower() in MAJOR_CITIES:
                return c
        return None

    def _find_state_in_text(self, text: str) -> str | None:
        text_lc = text.lower()
        for state in INDIAN_STATES:
            if state in text_lc:
                return state.title()
        return None

    # ──────────────────────────────────────────────────────────────────────────
    # DATE EXTRACTION
    # ──────────────────────────────────────────────────────────────────────────

    def _extract_date(self, article: dict) -> datetime:
        pub_str = article.get("published") or article.get("date") or ""
        try:
            dt = dateutil_parser.parse(pub_str)
            if dt.tzinfo is None:
                dt = dt.replace(tzinfo=timezone.utc)
            return dt
        except Exception:
            return datetime.now(timezone.utc)

    # ──────────────────────────────────────────────────────────────────────────
    # HELPERS
    # ──────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _build_text(article: dict) -> str:
        parts = [
            article.get("title", ""),
            article.get("description", ""),
        ]
        return " ".join(p for p in parts if p).strip()
