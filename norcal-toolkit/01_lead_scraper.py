#!/usr/bin/env python3
"""
NorCal Carb Mobile — Lead Scraper Agent
Scrapes Google Places API for fleet/trucking/dealer leads,
scores them, deduplicates, and exports to CSV.

Usage:
    python3 01_lead_scraper.py                        # scrape all areas, all queries
    python3 01_lead_scraper.py --area sacramento      # single area
    python3 01_lead_scraper.py --query "trucking"     # single query
    python3 01_lead_scraper.py --export squarespace   # squarespace-ready CSV

Requires: GOOGLE_PLACES_API_KEY env var
"""
import argparse
import csv
import json
import os
import sys
import time
from datetime import datetime

import requests

from config import (
    GOOGLE_PLACES_API_KEY,
    SERVICE_AREAS,
    DEFAULT_SEARCH_RADIUS_METERS,
    SCRAPE_QUERIES,
    SCORING,
    DATA_DIR,
    LEADS_CSV,
)

# ─── Google Places API ───────────────────────────────────────────

PLACES_SEARCH_URL = "https://maps.googleapis.com/maps/api/place/textsearch/json"
PLACES_DETAIL_URL = "https://maps.googleapis.com/maps/api/place/details/json"

FLEET_KEYWORDS = [
    "fleet", "truck", "trucking", "vehicle", "diesel", "haul",
    "freight", "CDL", "DOT", "CARB", "emissions", "smog",
    "heavy duty", "semi", "trailer", "logistics", "transport",
]

COMPLIANCE_KEYWORDS = [
    "CARB", "smog", "emissions", "compliance", "clean truck",
    "inspection", "opacity", "OBD", "HD I/M",
]


def search_places(query, lat, lng, radius, api_key, next_page_token=None):
    """Search Google Places API. Returns results list + next_page_token."""
    params = {
        "query": query,
        "location": f"{lat},{lng}",
        "radius": radius,
        "key": api_key,
    }
    if next_page_token:
        params = {"pagetoken": next_page_token, "key": api_key}

    resp = requests.get(PLACES_SEARCH_URL, params=params, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    if data.get("status") not in ("OK", "ZERO_RESULTS"):
        print(f"  [WARN] API status: {data.get('status')} — {data.get('error_message', '')}")

    return data.get("results", []), data.get("next_page_token")


def get_place_details(place_id, api_key):
    """Get phone, website, and extra details for a place."""
    params = {
        "place_id": place_id,
        "fields": "formatted_phone_number,website,opening_hours,business_status,reviews",
        "key": api_key,
    }
    resp = requests.get(PLACES_DETAIL_URL, params=params, timeout=15)
    resp.raise_for_status()
    return resp.json().get("result", {})


def score_lead(place, details):
    """Score a lead 0-20 based on signals. Higher = hotter."""
    score = 0
    name_lower = place.get("name", "").lower()
    types = place.get("types", [])

    # Review count
    review_count = place.get("user_ratings_total", 0)
    if review_count >= 10:
        score += SCORING["high_review_count"]

    # In service area (already filtered by radius, give points)
    score += SCORING["in_service_area"]

    # Has website
    if details.get("website"):
        score += SCORING["has_website"]

    # Fleet/truck keywords in name
    if any(kw in name_lower for kw in FLEET_KEYWORDS):
        score += SCORING["fleet_keywords"]

    # Compliance keywords in name or reviews
    review_text = " ".join(
        r.get("text", "") for r in details.get("reviews", [])
    ).lower()
    if any(kw.lower() in name_lower or kw.lower() in review_text for kw in COMPLIANCE_KEYWORDS):
        score += SCORING["compliance_keywords"]

    # Phone available
    if details.get("formatted_phone_number"):
        score += SCORING["phone_available"]

    return score


def tier_label(score):
    if score >= 8:
        return "TIER 1 — CALL THIS WEEK"
    elif score >= 5:
        return "TIER 2 — CALL THIS MONTH"
    else:
        return "TIER 3 — MONTHLY LIST"


def load_existing_leads():
    """Load existing leads to deduplicate."""
    existing = set()
    if os.path.exists(LEADS_CSV):
        with open(LEADS_CSV, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                existing.add(row.get("place_id", ""))
    return existing


def scrape_leads(areas=None, queries=None, api_key=None):
    """Main scraper. Returns list of lead dicts."""
    if not api_key:
        print("[ERROR] GOOGLE_PLACES_API_KEY not set.")
        print("  Set it: export GOOGLE_PLACES_API_KEY='your-key-here'")
        print("  Get one: https://console.cloud.google.com/apis/credentials")
        print("")
        print("  Running in DEMO MODE with sample data...")
        return _demo_leads()

    areas = areas or SERVICE_AREAS
    queries = queries or SCRAPE_QUERIES
    existing_ids = load_existing_leads()
    leads = []
    seen_ids = set()

    total_queries = len(areas) * len(queries)
    query_num = 0

    for area_name, coords in areas.items():
        for query in queries:
            query_num += 1
            search_term = f"{query} near {area_name.replace('_', ' ')}, CA"
            print(f"  [{query_num}/{total_queries}] Searching: {search_term}")

            try:
                results, next_token = search_places(
                    search_term, coords["lat"], coords["lng"],
                    DEFAULT_SEARCH_RADIUS_METERS, api_key,
                )

                # Fetch up to 2 pages (60 results per query)
                all_results = results
                if next_token:
                    time.sleep(2)  # Google requires delay before next_page_token
                    page2, _ = search_places(None, None, None, None, api_key, next_token)
                    all_results += page2

                for place in all_results:
                    pid = place.get("place_id", "")
                    if pid in seen_ids or pid in existing_ids:
                        continue
                    seen_ids.add(pid)

                    # Get details (phone, website)
                    details = get_place_details(pid, api_key)
                    time.sleep(0.1)  # rate limit courtesy

                    score = score_lead(place, details)
                    tier = tier_label(score)

                    lead = {
                        "place_id": pid,
                        "business_name": place.get("name", ""),
                        "address": place.get("formatted_address", ""),
                        "phone": details.get("formatted_phone_number", ""),
                        "website": details.get("website", ""),
                        "rating": place.get("rating", ""),
                        "review_count": place.get("user_ratings_total", 0),
                        "category": query,
                        "area": area_name,
                        "score": score,
                        "tier": tier,
                        "status": "NEW",
                        "scraped_date": datetime.now().strftime("%Y-%m-%d"),
                        "notes": "",
                    }
                    leads.append(lead)

                time.sleep(0.5)  # rate limit between queries

            except requests.RequestException as e:
                print(f"  [ERROR] {search_term}: {e}")
                continue

    return leads


def _demo_leads():
    """Demo data when no API key is set — shows the format."""
    return [
        {
            "place_id": "DEMO_001",
            "business_name": "Valley Fleet Services",
            "address": "4521 Stockton Blvd, Sacramento, CA 95820",
            "phone": "(916) 555-0101",
            "website": "https://valleyfleet.example.com",
            "rating": 4.2,
            "review_count": 47,
            "category": "fleet management",
            "area": "sacramento",
            "score": 11,
            "tier": "TIER 1 — CALL THIS WEEK",
            "status": "NEW",
            "scraped_date": datetime.now().strftime("%Y-%m-%d"),
            "notes": "Demo lead — replace with real API key",
        },
        {
            "place_id": "DEMO_002",
            "business_name": "Delta Trucking Inc",
            "address": "890 Navy Dr, Stockton, CA 95206",
            "phone": "(209) 555-0202",
            "website": "https://deltatrucking.example.com",
            "rating": 3.8,
            "review_count": 23,
            "category": "trucking company",
            "area": "stockton",
            "score": 9,
            "tier": "TIER 1 — CALL THIS WEEK",
            "status": "NEW",
            "scraped_date": datetime.now().strftime("%Y-%m-%d"),
            "notes": "Demo lead",
        },
        {
            "place_id": "DEMO_003",
            "business_name": "Roseville Auto Group",
            "address": "300 Automall Dr, Roseville, CA 95661",
            "phone": "(916) 555-0303",
            "website": "https://rosevilleauto.example.com",
            "rating": 4.5,
            "review_count": 156,
            "category": "auto dealer",
            "area": "roseville",
            "score": 7,
            "tier": "TIER 2 — CALL THIS MONTH",
            "status": "NEW",
            "scraped_date": datetime.now().strftime("%Y-%m-%d"),
            "notes": "Demo lead",
        },
        {
            "place_id": "DEMO_004",
            "business_name": "Mike's Tow & Recovery",
            "address": "1100 E Main St, Stockton, CA 95205",
            "phone": "(209) 555-0404",
            "website": "",
            "rating": 3.2,
            "review_count": 8,
            "category": "tow yard",
            "area": "stockton",
            "score": 4,
            "tier": "TIER 3 — MONTHLY LIST",
            "status": "NEW",
            "scraped_date": datetime.now().strftime("%Y-%m-%d"),
            "notes": "Demo lead",
        },
        {
            "place_id": "DEMO_005",
            "business_name": "Garcia Landscaping & Tree Service",
            "address": "2200 Fruitridge Rd, Sacramento, CA 95822",
            "phone": "(916) 555-0505",
            "website": "",
            "rating": 4.7,
            "review_count": 31,
            "category": "landscaping company",
            "area": "sacramento",
            "score": 6,
            "tier": "TIER 2 — CALL THIS MONTH",
            "status": "NEW",
            "scraped_date": datetime.now().strftime("%Y-%m-%d"),
            "notes": "Demo lead — likely has truck fleet",
        },
    ]


def export_csv(leads, filepath, fmt="standard"):
    """Export leads to CSV. fmt='squarespace' for email campaign import."""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)

    if fmt == "squarespace":
        # Squarespace email campaign CSV format
        fieldnames = ["Email", "First Name", "Last Name", "Company", "Phone", "Tags"]
        rows = []
        for lead in leads:
            name_parts = lead["business_name"].split()
            rows.append({
                "Email": "",  # must be filled manually or enriched
                "First Name": name_parts[0] if name_parts else "",
                "Last Name": " ".join(name_parts[1:]) if len(name_parts) > 1 else "",
                "Company": lead["business_name"],
                "Phone": lead["phone"],
                "Tags": lead["tier"].split("—")[0].strip(),
            })
    else:
        fieldnames = [
            "place_id", "business_name", "address", "phone", "website",
            "rating", "review_count", "category", "area", "score", "tier",
            "status", "scraped_date", "notes",
        ]
        rows = leads

    with open(filepath, "a" if os.path.exists(filepath) else "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames, extrasaction="ignore")
        if f.tell() == 0:
            writer.writeheader()
        writer.writerows(rows)

    return filepath


def print_summary(leads):
    """Print a quick summary of scraped leads."""
    tier1 = [l for l in leads if l["score"] >= 8]
    tier2 = [l for l in leads if 5 <= l["score"] < 8]
    tier3 = [l for l in leads if l["score"] < 5]

    print(f"\n{'='*60}")
    print(f"  SCRAPE COMPLETE — {datetime.now().strftime('%Y-%m-%d %H:%M')}")
    print(f"{'='*60}")
    print(f"  Total leads:  {len(leads)}")
    print(f"  TIER 1 (8+):  {len(tier1)} — CALL THIS WEEK")
    print(f"  TIER 2 (5-7): {len(tier2)} — CALL THIS MONTH")
    print(f"  TIER 3 (<5):  {len(tier3)} — MONTHLY LIST")
    print(f"{'='*60}")

    if tier1:
        print(f"\n  🔥 HOT LEADS (Tier 1):")
        for l in sorted(tier1, key=lambda x: x["score"], reverse=True):
            print(f"    [{l['score']}] {l['business_name']} — {l['phone']} — {l['area']}")

    print()


def main():
    parser = argparse.ArgumentParser(description="NorCal Lead Scraper")
    parser.add_argument("--area", help="Single area to scrape (e.g., sacramento)")
    parser.add_argument("--query", help="Single search query (e.g., 'trucking company')")
    parser.add_argument("--export", choices=["standard", "squarespace"], default="standard",
                        help="CSV export format")
    parser.add_argument("--output", help="Custom output file path")
    args = parser.parse_args()

    areas = {args.area: SERVICE_AREAS[args.area]} if args.area else None
    queries = [args.query] if args.query else None

    print(f"\n  NorCal Carb Mobile — Lead Scraper")
    print(f"  {'='*40}")

    leads = scrape_leads(areas=areas, queries=queries, api_key=GOOGLE_PLACES_API_KEY)

    if not leads:
        print("  No new leads found.")
        return

    # Export
    output_path = args.output or LEADS_CSV
    if args.export == "squarespace":
        output_path = args.output or os.path.join(DATA_DIR, "leads_squarespace.csv")

    export_csv(leads, output_path, fmt=args.export)
    print_summary(leads)
    print(f"  Saved to: {output_path}\n")


if __name__ == "__main__":
    main()
