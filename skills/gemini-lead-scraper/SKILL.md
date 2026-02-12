---
name: gemini-lead-scraper
description: Pull business contact info (phone, address, hours, reviews) from Google Maps and Google Places API using Gemini and Google Cloud. Build lead lists for outreach. Use when finding businesses, pulling phone numbers, building prospect lists, or researching local companies. Triggers on "find businesses", "get phone numbers", "lead list", "Google Maps", "prospects", "local businesses", "fleet owners near", "trucking companies in".
---

# Lead Scraper - Google Maps / Places API (Gemini-Powered, FREE)

Runs on Gemini + Google Cloud APIs you already pay for. Zero additional cost.

## Setup Requirements

1. Google Cloud project with Places API enabled
2. API key for Google Places API
3. Gemini API key (or use Google AI Studio free tier)

## Core Workflow

### 1. Search for Businesses

Use Google Places API (Text Search):

```bash
curl -s "https://maps.googleapis.com/maps/api/place/textsearch/json?query=trucking+companies+in+Chicago+IL&key=$GOOGLE_PLACES_API_KEY" | jq '.results[] | {name, formatted_address, rating, user_ratings_total, place_id}'
```

### 2. Get Contact Details

Use Place Details API for each result:

```bash
curl -s "https://maps.googleapis.com/maps/api/place/details/json?place_id=PLACE_ID&fields=name,formatted_phone_number,formatted_address,website,opening_hours,reviews,business_status&key=$GOOGLE_PLACES_API_KEY" | jq '.result'
```

### 3. Build Lead Sheet

Output to Google Sheets via Gemini or direct Sheets API:

| Business Name | Phone | Address | Website | Rating | Reviews | Status |
|--------------|-------|---------|---------|--------|---------|--------|
| [from API] | [from API] | [from API] | [from API] | [from API] | [count] | [open/closed] |

## Use Cases for CARB Compliance Business

### Find Trucking Companies (Potential Customers)
```
Query: "trucking companies in [city], California"
Query: "freight brokers in [city], California"
Query: "fleet management companies in California"
Query: "diesel repair shops in [city], California"
Query: "truck stops near [highway/city], California"
```

### Find Credentialed Testers (Competitors or Partners)
```
Query: "diesel emissions testing in [city], California"
Query: "truck inspection services in California"
Query: "heavy duty vehicle repair [city] CA"
```

### Find School Districts (School Bus Opportunity)
```
Query: "school district transportation department [city] California"
Query: "school bus fleet [county] California"
```

## Make.com Integration

Set up a Make.com scenario:
1. **Trigger**: New row in "Search Queries" Google Sheet
2. **Action**: Call Google Places API with the query
3. **Action**: Parse results and extract contact info
4. **Action**: Add rows to "Lead List" Google Sheet
5. **Action**: Flag duplicates
6. **Optional**: Send notification when new leads found

## Rate Limits (Google Places API)

- Free tier: $200/month credit (covers ~5,000 searches + 12,500 detail lookups)
- Beyond that: $17 per 1,000 text searches, $17 per 1,000 detail requests
- Stay within free tier by being targeted with searches

## Guardrails

- ONLY collect publicly available business information
- Do NOT scrape personal phone numbers or home addresses
- Comply with Google's Terms of Service
- Do NOT use for spam - only legitimate business outreach
- Store leads securely, respect opt-out requests
- Follow CAN-SPAM and TCPA for outreach
