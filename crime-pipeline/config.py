"""
SafeAround Crime Pipeline - Central Configuration
==================================================
Loads from .env in this directory (crime-pipeline/.env),
falling back to backend/.env if local not found.
"""
import os
from dotenv import load_dotenv

# Try local .env first, then backend .env
_local_env   = os.path.join(os.path.dirname(__file__), '.env')
_backend_env = os.path.join(os.path.dirname(__file__), '../backend/.env')

if os.path.exists(_local_env):
    load_dotenv(_local_env)
elif os.path.exists(_backend_env):
    load_dotenv(_backend_env)
else:
    load_dotenv()  # Try system env

# ── Database ───────────────────────────────────────────────────────────────────
DB_CONFIG = {
    'host':     os.getenv('DB_HOST', 'localhost'),
    'port':     os.getenv('DB_PORT', '5432'),
    'dbname':   os.getenv('DB_NAME', 'safearound_prod'),
    'user':     os.getenv('DB_USER', 'safearound_user'),
    'password': os.getenv('DB_PASSWORD', 'password'),
    'sslmode':  os.getenv('DB_SSLMODE', 'disable'),
}

# ── API Keys ───────────────────────────────────────────────────────────────────
GOOGLE_MAPS_API_KEY = os.getenv('GOOGLE_MAPS_API_KEY', '')
NEWS_API_KEY        = os.getenv('NEWS_API_KEY', '')
REDIS_HOST          = os.getenv('REDIS_HOST', 'localhost')
REDIS_PORT          = int(os.getenv('REDIS_PORT', '6379'))

# ── Scheduler ─────────────────────────────────────────────────────────────────
PIPELINE_INTERVAL_MINUTES = int(os.getenv('PIPELINE_INTERVAL_MINUTES', '15'))

# ── India Target Areas ─────────────────────────────────────────────────────────
# Used by area_specific_tracker.py for hyper-local crime monitoring.
# Each entry: name (geocoded at startup) + radius_km (spatial validation bound).
TARGET_AREAS = [
    # ── Delhi NCR ────────────────────────────────────────────────────────────
    {"name": "Rohini Sector 15, Delhi",          "radius_km": 2.0},
    {"name": "Rohini Sector 7, Delhi",            "radius_km": 2.0},
    {"name": "Dwarka Sector 10, Delhi",           "radius_km": 2.0},
    {"name": "Dwarka Sector 21, Delhi",           "radius_km": 2.0},
    {"name": "Greater Kailash 1, Delhi",          "radius_km": 1.5},
    {"name": "Saket, Delhi",                      "radius_km": 2.0},
    {"name": "Lajpat Nagar, Delhi",               "radius_km": 1.5},
    {"name": "Connaught Place, Delhi",            "radius_km": 1.5},
    {"name": "Noida Sector 62",                   "radius_km": 2.0},
    {"name": "Noida Sector 18",                   "radius_km": 2.0},
    {"name": "Gurgaon Sector 29",                 "radius_km": 2.0},
    {"name": "Gurgaon DLF Phase 2",              "radius_km": 2.0},
    {"name": "Faridabad Sector 15",               "radius_km": 2.5},
    {"name": "Sultanpur Village, Delhi",          "radius_km": 2.0},
    # ── Bangalore ────────────────────────────────────────────────────────────
    {"name": "Koramangala 5th Block, Bangalore",  "radius_km": 1.0},
    {"name": "Indiranagar, Bangalore",            "radius_km": 1.5},
    {"name": "HSR Layout, Bangalore",             "radius_km": 2.0},
    {"name": "Whitefield, Bangalore",             "radius_km": 2.5},
    {"name": "Electronic City Phase 1, Bangalore","radius_km": 2.0},
    {"name": "Marathahalli, Bangalore",           "radius_km": 2.0},
    {"name": "Jayanagar, Bangalore",              "radius_km": 1.5},
    # ── Mumbai / MMR ─────────────────────────────────────────────────────────
    {"name": "Bandra West, Mumbai",               "radius_km": 1.5},
    {"name": "Andheri East, Mumbai",              "radius_km": 2.0},
    {"name": "Powai, Mumbai",                     "radius_km": 2.0},
    {"name": "Thane West",                        "radius_km": 3.0},
    {"name": "Kharghar, Navi Mumbai",             "radius_km": 3.0},
    {"name": "Malad West, Mumbai",                "radius_km": 2.0},
    # ── Hyderabad ────────────────────────────────────────────────────────────
    {"name": "Hitech City, Hyderabad",            "radius_km": 2.0},
    {"name": "Gachibowli, Hyderabad",             "radius_km": 2.0},
    {"name": "Banjara Hills, Hyderabad",          "radius_km": 2.0},
    {"name": "Kukatpally, Hyderabad",             "radius_km": 2.5},
    {"name": "Secunderabad, Hyderabad",           "radius_km": 2.5},
    # ── Pune ─────────────────────────────────────────────────────────────────
    {"name": "Koregaon Park, Pune",               "radius_km": 1.5},
    {"name": "Hinjewadi, Pune",                   "radius_km": 2.5},
    {"name": "Kothrud, Pune",                     "radius_km": 2.0},
    # ── Chennai ──────────────────────────────────────────────────────────────
    {"name": "Anna Nagar, Chennai",               "radius_km": 2.0},
    {"name": "Velachery, Chennai",                "radius_km": 2.0},
    {"name": "T Nagar, Chennai",                  "radius_km": 1.5},
    # ── Kolkata ──────────────────────────────────────────────────────────────
    {"name": "Salt Lake City, Kolkata",           "radius_km": 2.5},
    {"name": "Park Street, Kolkata",              "radius_km": 1.5},
    # ── Other Major Cities ───────────────────────────────────────────────────
    {"name": "SG Highway, Ahmedabad",             "radius_km": 3.0},
    {"name": "Mansarovar, Jaipur",               "radius_km": 3.0},
    {"name": "Vijay Nagar, Indore",              "radius_km": 2.5},
    {"name": "Hazratganj, Lucknow",              "radius_km": 2.0},
    {"name": "Gomti Nagar, Lucknow",             "radius_km": 2.5},
    {"name": "Civil Lines, Nagpur",              "radius_km": 2.0},
    {"name": "Chandigarh Sector 17",             "radius_km": 2.0},
    {"name": "Amritsar Golden Temple Area",      "radius_km": 2.0},
    {"name": "Dehradun Rajpur Road",             "radius_km": 2.5},
    {"name": "Ranchi Doranda",                   "radius_km": 3.0},
    {"name": "Patna Boring Road",                "radius_km": 2.5},
    {"name": "Bhubaneswar Saheed Nagar",         "radius_km": 2.5},
    {"name": "Coimbatore RS Puram",              "radius_km": 2.0},
    {"name": "Kochi Kakkanad",                   "radius_km": 2.5},
    {"name": "Thiruvananthapuram Kowdiar",       "radius_km": 2.5},
    {"name": "Visakhapatnam Beach Road",         "radius_km": 2.5},
]
