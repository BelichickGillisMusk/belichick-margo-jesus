#!/usr/bin/env python3
"""
NorCal Carb Mobile — Review Request & Social Post Agent
Sends review requests after jobs and generates social media posts.

Usage:
    python3 05_review_request.py review "Valley Fleet" --phone "(916) 555-0101"
    python3 05_review_request.py review "Delta Trucking" --email "joe@delta.com"
    python3 05_review_request.py social --type job_done --city Sacramento --tests 4
    python3 05_review_request.py social --type tip --topic "OBD vs OVI"
    python3 05_review_request.py blog --topic "CARB 2027 quarterly testing"
    python3 05_review_request.py batch-review           # review requests for today's tested jobs
"""
import argparse
import csv
import os
import sys
from datetime import datetime

from config import (
    BUSINESS_NAME, BUSINESS_PHONE, BUSINESS_WEBSITE, OWNER_NAME,
    GOOGLE_REVIEW_LINK, DATA_DIR, CRM_CSV,
    SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, BUSINESS_EMAIL,
)

# ─── Review Request Templates ────────────────────────────────────

REVIEW_SMS = """Hey {contact}! Thanks for choosing {business} today. If you have 30 seconds, a Google review helps us out a ton:

{review_link}

Appreciate you! — {owner}"""

REVIEW_EMAIL_SUBJECT = "Thanks for choosing {business}!"

REVIEW_EMAIL_BODY = """Hey {contact},

Thanks for letting us handle your testing today at {company}. We appreciate your business.

If you have 30 seconds, a quick Google review would mean a lot to a small local operation like ours:

{review_link}

If there's anything we could have done better, just reply to this email — I read every one.

Thanks again,
{owner}
{business}
{phone}"""


# ─── Social Media Post Templates ─────────────────────────────────

SOCIAL_TEMPLATES = {
    "job_done": [
        "{tests} vehicles tested on-site today in {city}. No trip to the shop needed. That's the mobile advantage. #NorCalCarbMobile #MobileSmogTesting #CARB",
        "Another {tests}-vehicle day in {city}. Fleet tested, results delivered, zero downtime. #CleanTruckCheck #FleetCompliance #Sacramento",
        "On-site in {city} today — {tests} trucks tested and done before lunch. Your fleet doesn't stop, we come to you. #MobileTesting #CARB #NorCal",
    ],
    "tip": [
        "Did you know? CARB requires all diesel vehicles over 14,000 lbs to be tested 2x/year. That doubles to 4x/year in October 2027. Is your fleet ready? #CARB #CleanTruckCheck",
        "OBD vs OVI — what's the difference? OBD reads your truck's computer for emissions codes. OVI is a visual + opacity test for older vehicles. Both are required under HD I/M. #FleetTips",
        "Non-compliance with CARB's Clean Truck Check can cost $10,000/DAY per vehicle + DMV registration hold. Don't wait for the letter. #CARBCompliance #FleetManagement",
        "No exemptions under CARB's HD I/M program. Small fleets, low-use vehicles, even out-of-state trucks operating in CA — everyone's in. #CleanTruckCheck",
        "$31.18/year per vehicle is the CARB annual fee. Compare that to $10K/day in fines. Compliance is the cheapest insurance you'll buy. #FleetCompliance",
    ],
    "behind_scenes": [
        "Loading up the mobile testing unit for another day in the field. {city} fleet owners, we're in your area this week. #MobileSmog #NorCal",
        "Early morning calibration check before heading out. Every test has to be accurate — that's why we calibrate daily. #Quality #SmogTesting",
        "Just wrapped a 12-vehicle fleet test. The owner said he used to lose half a day per truck driving to a station. No more. #MobileTesting",
    ],
    "milestone": [
        "100 vehicles tested and counting. Thank you to every fleet owner who trusts us with their compliance. #Milestone #NorCalCarbMobile",
        "Started this year with a truck and a credential. Now serving fleets across Sacramento, Stockton, and the East Bay. Growth through service. #SmallBusiness",
    ],
}


# ─── Blog Outline Templates ─────────────────────────────────────

BLOG_TEMPLATES = {
    "what_is_obd": {
        "title": "What Is an OBD Test and When Does Your Truck Need One?",
        "keyword": "OBD test truck California",
        "outline": [
            "H1: What Is an OBD Test and When Does Your Truck Need One?",
            "Intro: Direct answer — OBD = On-Board Diagnostics scan required under CARB HD I/M",
            "H2: What Does an OBD Test Check?",
            "  - Reads DTCs (Diagnostic Trouble Codes) from vehicle's ECU",
            "  - Checks emissions readiness monitors",
            "  - Records VIN, odometer, test results",
            "H2: Which Vehicles Need OBD Testing?",
            "  - All diesel/alt-fuel vehicles >14,000 lbs GVWR",
            "  - 2013+ model year (OBD-equipped)",
            "  - No exemptions: small fleet, low-use, out-of-state",
            "H2: How Often?",
            "  - Currently: 2x per year",
            "  - October 2027: increases to 4x per year",
            "H2: What If You Fail?",
            "  - Must repair and retest within 120 days",
            "  - Non-compliance: up to $10K/day + DMV hold",
            "H2: Mobile OBD Testing — How It Works",
            "  - We come to your yard/lot",
            "  - Test takes 15-20 minutes per vehicle",
            "  - Results submitted to CARB same day",
            "CTA: Schedule your fleet's OBD test today — [phone] / [website]",
        ],
    },
    "ovi_vs_obd": {
        "title": "OVI vs OBD Testing: What's the Difference for Your Fleet?",
        "keyword": "OVI vs OBD test difference",
        "outline": [
            "H1: OVI vs OBD Testing: What's the Difference for Your Fleet?",
            "Intro: Two test types under CARB's Clean Truck Check — here's which one your truck needs",
            "H2: OBD Test (On-Board Diagnostics)",
            "  - For 2013+ model year vehicles with OBD systems",
            "  - Electronic scan of emissions computer",
            "  - Checks DTCs, readiness monitors",
            "H2: OVI Test (Opacity / Visual Inspection)",
            "  - For pre-2013 vehicles without OBD capability",
            "  - Smoke opacity measurement (SAE J1667 snap-idle)",
            "  - Visual inspection of emissions controls",
            "H2: Which Test Does Your Truck Need?",
            "  - Table: Model Year → Test Type",
            "  - 2013+: OBD | Pre-2013: OVI | Mixed fleet: both",
            "H2: Testing Frequency",
            "  - OBD: 2x/year now, 4x/year Oct 2027",
            "  - OVI: 2x/year (unchanged)",
            "H2: Costs and What to Expect",
            "  - Our pricing: $X OBD, $X OVI",
            "  - On-site mobile testing saves fleet downtime",
            "CTA: Not sure which test your fleet needs? Call us — [phone]",
        ],
    },
    "carb_2027": {
        "title": "CARB 2027 Quarterly Testing Mandate: What Fleet Owners Need to Know",
        "keyword": "CARB 2027 quarterly testing requirement",
        "outline": [
            "H1: CARB 2027 Quarterly Testing Mandate: What Fleet Owners Need to Know",
            "Intro: Starting October 2027, OBD testing doubles from 2x to 4x per year",
            "H2: What's Changing?",
            "  - OBD-equipped vehicles (2013+) go to quarterly testing",
            "  - That's 4 tests per vehicle per year",
            "  - Calendar-based scheduling (every 90 days)",
            "H2: Why Is CARB Doing This?",
            "  - Catch emissions failures faster",
            "  - Align with federal EPA goals",
            "  - Data: X% of tested vehicles had unreported issues",
            "H2: Impact on Your Fleet",
            "  - 10 trucks = 40 tests/year (up from 20)",
            "  - 50 trucks = 200 tests/year",
            "  - Scheduling headache if you're driving to a station",
            "H2: How to Prepare NOW",
            "  - Build a testing schedule by VIN",
            "  - Partner with a mobile tester (eliminate downtime)",
            "  - Budget for 2x the testing costs",
            "H2: Mobile Testing Is the Answer",
            "  - We come to you — test during load/unload",
            "  - Fleet scheduling: we track your deadlines",
            "  - Volume pricing for quarterly contracts",
            "CTA: Lock in your 2027 testing schedule now — [phone] / [website]",
        ],
    },
}


def send_review_request_email(contact, company, email):
    """Send a review request email."""
    if not SMTP_USER or not SMTP_PASS:
        print(f"  [PREVIEW] Would email {email}:")
        body = REVIEW_EMAIL_BODY.format(
            contact=contact, company=company, business=BUSINESS_NAME,
            review_link=GOOGLE_REVIEW_LINK, owner=OWNER_NAME, phone=BUSINESS_PHONE,
        )
        print(f"  Subject: {REVIEW_EMAIL_SUBJECT.format(business=BUSINESS_NAME)}")
        for line in body.split("\n"):
            print(f"    {line}")
        return

    import smtplib
    from email.mime.text import MIMEText
    from email.mime.multipart import MIMEMultipart

    subject = REVIEW_EMAIL_SUBJECT.format(business=BUSINESS_NAME)
    body = REVIEW_EMAIL_BODY.format(
        contact=contact, company=company, business=BUSINESS_NAME,
        review_link=GOOGLE_REVIEW_LINK, owner=OWNER_NAME, phone=BUSINESS_PHONE,
    )

    msg = MIMEMultipart()
    msg["From"] = f"{OWNER_NAME} <{BUSINESS_EMAIL}>"
    msg["To"] = email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        print(f"  [SENT] Review request to {email}")
    except Exception as e:
        print(f"  [ERROR] {e}")


def generate_sms(contact, company):
    """Generate review request SMS text (for copy-paste or Twilio)."""
    msg = REVIEW_SMS.format(
        contact=contact, business=BUSINESS_NAME,
        review_link=GOOGLE_REVIEW_LINK, owner=OWNER_NAME,
    )
    print(f"\n  SMS for {company} ({contact}):")
    print(f"  {'─'*40}")
    for line in msg.split("\n"):
        print(f"  {line}")
    print(f"  {'─'*40}")
    print(f"  Characters: {len(msg)}\n")


def generate_social_post(post_type, city="Sacramento", tests=0, topic=""):
    """Generate social media post."""
    import random

    templates = SOCIAL_TEMPLATES.get(post_type, SOCIAL_TEMPLATES["tip"])
    template = random.choice(templates)

    post = template.format(
        city=city, tests=tests, topic=topic,
        business=BUSINESS_NAME, owner=OWNER_NAME,
    )

    print(f"\n  SOCIAL POST ({post_type}):")
    print(f"  {'─'*50}")
    print(f"  {post}")
    print(f"  {'─'*50}")
    print(f"  Characters: {len(post)}")
    print(f"  Platforms: Instagram, Facebook, LinkedIn, Google Business Profile")
    print()


def generate_blog_outline(topic):
    """Generate a blog post outline."""
    # Match topic to template
    template = None
    topic_lower = topic.lower()
    for key, tmpl in BLOG_TEMPLATES.items():
        if key.replace("_", " ") in topic_lower or any(
            word in topic_lower for word in key.split("_")
        ):
            template = tmpl
            break

    if not template:
        # Generic outline
        print(f"\n  BLOG OUTLINE: {topic}")
        print(f"  {'─'*50}")
        print(f"  H1: {topic}")
        print(f"  - Intro: Answer the question directly in first paragraph")
        print(f"  - H2: What it is / Why it matters")
        print(f"  - H2: How it works / What to expect")
        print(f"  - H2: Impact on your fleet (specific numbers)")
        print(f"  - H2: How we help (mobile testing advantage)")
        print(f"  - CTA: Call {BUSINESS_PHONE} or visit {BUSINESS_WEBSITE}")
        print(f"  Target: 800-1500 words | One primary keyword")
        print(f"  {'─'*50}\n")
        return

    print(f"\n  BLOG OUTLINE:")
    print(f"  {'─'*50}")
    print(f"  Title: {template['title']}")
    print(f"  Keyword: {template['keyword']}")
    print(f"  Target: 800-1500 words")
    print()
    for line in template["outline"]:
        print(f"    {line}")
    print(f"  {'─'*50}\n")


def batch_review_requests():
    """Send review requests to all jobs tested today."""
    if not os.path.exists(CRM_CSV):
        print("  No CRM data. Run 03_crm_tracker.py import first.")
        return

    today = datetime.now().strftime("%Y-%m-%d")
    count = 0

    with open(CRM_CSV, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row.get("status") == "TESTED" and row.get("updated_date") == today:
                contact = row.get("contact_name") or row.get("business_name", "there").split()[0]
                company = row.get("business_name", "")

                if row.get("email"):
                    send_review_request_email(contact, company, row["email"])
                    count += 1

                if row.get("phone"):
                    generate_sms(contact, company)
                    count += 1

    if count == 0:
        print("  No jobs marked TESTED today. Update CRM status first.")
    else:
        print(f"\n  Sent {count} review requests for today's jobs.")


def main():
    parser = argparse.ArgumentParser(description="NorCal Review & Social Agent")
    sub = parser.add_subparsers(dest="command")

    rev_p = sub.add_parser("review", help="Send review request")
    rev_p.add_argument("company", help="Company name")
    rev_p.add_argument("--phone", default="", help="Phone for SMS")
    rev_p.add_argument("--email", default="", help="Email for review request")
    rev_p.add_argument("--contact", default="", help="Contact person name")

    social_p = sub.add_parser("social", help="Generate social media post")
    social_p.add_argument("--type", choices=["job_done", "tip", "behind_scenes", "milestone"],
                          default="job_done", help="Post type")
    social_p.add_argument("--city", default="Sacramento", help="City name")
    social_p.add_argument("--tests", type=int, default=4, help="Number of tests")
    social_p.add_argument("--topic", default="", help="Topic for tip posts")

    blog_p = sub.add_parser("blog", help="Generate blog post outline")
    blog_p.add_argument("--topic", required=True, help="Blog topic")

    sub.add_parser("batch-review", help="Review requests for today's tested jobs")

    args = parser.parse_args()

    if args.command == "review":
        contact = args.contact or args.company.split()[0]
        if args.email:
            send_review_request_email(contact, args.company, args.email)
        if args.phone:
            generate_sms(contact, args.company)
        if not args.email and not args.phone:
            print("  Provide --email and/or --phone")
    elif args.command == "social":
        generate_social_post(args.type, city=args.city, tests=args.tests, topic=args.topic)
    elif args.command == "blog":
        generate_blog_outline(args.topic)
    elif args.command == "batch-review":
        batch_review_requests()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
