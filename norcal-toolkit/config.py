"""
NorCal Carb Mobile Toolkit — Central Configuration
All API keys, business info, and defaults in one place.
Set via environment variables or edit defaults below.
"""
import os

# ─── Business Info ───────────────────────────────────────────────
BUSINESS_NAME = os.getenv("NORCAL_BUSINESS_NAME", "NorCal Carb Mobile")
BUSINESS_PHONE = os.getenv("NORCAL_PHONE", "(916) 555-0199")
BUSINESS_EMAIL = os.getenv("NORCAL_EMAIL", "bryan@norcalcarbmobile.com")
BUSINESS_WEBSITE = os.getenv("NORCAL_WEBSITE", "https://norcalcarbmobile.com")
BUSINESS_ADDRESS = os.getenv("NORCAL_ADDRESS", "Sacramento, CA")
BAR_LICENSE = os.getenv("NORCAL_BAR_LICENSE", "BAR-XXXXXX")
OWNER_NAME = os.getenv("NORCAL_OWNER", "Bryan")

# ─── Google Places API ───────────────────────────────────────────
GOOGLE_PLACES_API_KEY = os.getenv("GOOGLE_PLACES_API_KEY", "")

# ─── Service Area (lat/lng centers for scraping radius) ──────────
SERVICE_AREAS = {
    "sacramento": {"lat": 38.5816, "lng": -121.4944},
    "stockton": {"lat": 37.9577, "lng": -121.2908},
    "roseville": {"lat": 38.7521, "lng": -121.2880},
    "elk_grove": {"lat": 38.4088, "lng": -121.3716},
    "modesto": {"lat": 37.6391, "lng": -120.9969},
    "east_bay": {"lat": 37.8044, "lng": -122.2712},
    "vallejo": {"lat": 38.1041, "lng": -122.2566},
}

# ─── Scraper Defaults ────────────────────────────────────────────
DEFAULT_SEARCH_RADIUS_METERS = 30000  # 30km
SCRAPE_QUERIES = [
    "trucking company",
    "fleet management",
    "diesel repair shop",
    "construction company",
    "auto dealer",
    "tow yard",
    "body shop",
    "landscaping company",
    "school bus service",
    "freight broker",
    "agricultural hauler",
    "logistics company",
    "property management",
    "waste management",
    "delivery service",
]

# ─── Lead Scoring Weights ────────────────────────────────────────
SCORING = {
    "high_review_count": 2,       # 10+ reviews = established
    "in_service_area": 3,         # within our service radius
    "has_website": 1,             # professional operation
    "fleet_keywords": 3,          # mentions fleet/trucks/vehicles
    "compliance_keywords": 2,     # mentions CARB/smog/emissions
    "recently_opened": 1,         # new business, needs services
    "multiple_locations": 2,      # bigger operation
    "phone_available": 1,         # reachable
}

# ─── Pricing ─────────────────────────────────────────────────────
PRICING = {
    "obd_test": 75.00,
    "ovi_test": 85.00,
    "smoke_opacity_test": 85.00,
    "fleet_discount_threshold": 5,   # 5+ vehicles = discount
    "fleet_discount_pct": 10,        # 10% off
}

# ─── Email / SMTP ────────────────────────────────────────────────
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER", "")
SMTP_PASS = os.getenv("SMTP_PASS", "")
COLD_EMAIL_FROM = os.getenv("COLD_EMAIL_FROM", "")  # secondary domain for cold

# ─── Google Review Link ──────────────────────────────────────────
GOOGLE_REVIEW_LINK = os.getenv(
    "GOOGLE_REVIEW_LINK",
    "https://g.page/r/YOUR_PLACE_ID/review"
)

# ─── File Paths ──────────────────────────────────────────────────
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
LEADS_CSV = os.path.join(DATA_DIR, "leads.csv")
CRM_CSV = os.path.join(DATA_DIR, "crm.csv")
INVOICES_DIR = os.path.join(DATA_DIR, "invoices")
EMAILS_LOG = os.path.join(DATA_DIR, "emails_sent.csv")

# ─── Follow-Up Cadence (days after initial contact) ──────────────
FOLLOWUP_SCHEDULE = [1, 3, 7, 14, 30]

# ─── Invoice Terms ───────────────────────────────────────────────
INVOICE_TERMS_DAYS = 15  # Net 15
