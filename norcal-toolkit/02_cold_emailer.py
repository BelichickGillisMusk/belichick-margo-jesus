#!/usr/bin/env python3
"""
NorCal Carb Mobile — Cold Email Personalization & Sender Agent
Reads leads CSV, generates personalized cold email sequences,
and optionally sends via SMTP (secondary domain).

Usage:
    python3 02_cold_emailer.py --preview                  # preview emails, don't send
    python3 02_cold_emailer.py --send --tier 1            # send to Tier 1 only
    python3 02_cold_emailer.py --send --limit 10          # send to first 10 unsent
    python3 02_cold_emailer.py --sequence 2               # send follow-up #2

IMPORTANT: Use a secondary domain for cold email (not your main domain).
"""
import argparse
import csv
import os
import smtplib
import sys
from datetime import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from config import (
    BUSINESS_NAME, BUSINESS_PHONE, BUSINESS_WEBSITE, OWNER_NAME,
    BAR_LICENSE, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS,
    COLD_EMAIL_FROM, DATA_DIR, LEADS_CSV, EMAILS_LOG, PRICING,
)

# ─── Email Templates (3-touch sequence) ─────────────────────────

TEMPLATES = {
    1: {
        "subject": "Quick question about {business_name}",
        "body": """Hey {contact_name},

Do you handle your fleet smog and emissions testing in-house, or send vehicles out?

I run {our_business} — we're a BAR-licensed mobile testing unit that comes on-site. No vehicle downtime, no trips to a station. We handle OBD, OVI, and smoke opacity testing right in your lot.

Wanted to see if that's useful for {business_name}. We're in the {area} area this week.

{owner_name}
{our_business}
{phone}
{website}""",
    },
    2: {
        "subject": "Re: Quick question about {business_name}",
        "body": """Hey {contact_name},

Bumping this up — I'm in {area} this week and have openings.

Happy to swing by and knock out a test so you can see how the mobile setup works. No commitment, no pressure. Most shops save 2-3 hours per vehicle compared to driving to a station.

Worth 15 minutes?

{owner_name}
{phone}""",
    },
    3: {
        "subject": "Re: Quick question about {business_name}",
        "body": """Hey {contact_name},

Last note from me on this. If mobile smog testing ever makes sense for your operation, I'm a call away.

Quick numbers: we test on-site for ${obd_price}/vehicle (OBD) and ${ovi_price}/vehicle (OVI). Fleets of 5+ get {fleet_discount}% off. California requires testing 2x/year now, going to 4x/year in October 2027 — the compliance load is about to double.

If that deadline sneaks up, give me a ring.

{owner_name}
{our_business}
{phone}""",
    },
}

# ─── Category-specific openers ──────────────────────────────────

CATEGORY_HOOKS = {
    "trucking company": "With CARB's HD I/M program, every truck over 14,000 lbs needs testing twice a year — and that doubles to 4x in 2027.",
    "fleet management": "Managing compliance across a fleet is a headache. We take that off your plate with on-site testing and deadline tracking.",
    "diesel repair shop": "A lot of shops refer mobile testing to us — your customers get tested on your lot, you keep the relationship.",
    "construction company": "Construction fleets are high on CARB's radar. We come to your yard so your trucks don't sit idle at a station.",
    "auto dealer": "Dealers moving used heavy-duty inventory need clean test results. We come to you — no transport needed.",
    "tow yard": "Tow trucks over 14,000 lbs are in the HD I/M program. Most tow operators don't know that yet.",
    "body shop": "Shops that refer us for post-repair smog testing keep their bays free and their customers happy.",
    "landscaping company": "Landscaping trucks and trailers over 14K lbs fall under CARB's Clean Truck Check. We test on-site.",
    "school bus service": "School bus fleets need compliance testing. We come to your depot — zero disruption to routes.",
    "freight broker": "Your carriers need clean compliance. We offer fleet testing they can schedule in 60 seconds.",
    "logistics company": "Logistics fleets get hit hard by CARB deadlines. We test at your warehouse — no downtime.",
    "property management": "If your maintenance fleet includes diesel trucks over 14K lbs, they need CARB testing.",
    "waste management": "Every garbage truck and hauler over 14K lbs needs bi-annual testing. We come to your yard.",
    "delivery service": "Delivery fleets with heavy-duty vehicles are in CARB's crosshairs. $10K/day fines are no joke.",
}


def personalize_email(template_num, lead):
    """Generate a personalized email from template + lead data."""
    template = TEMPLATES[template_num]
    contact = lead.get("business_name", "there").split()[0]  # first word as contact name

    category = lead.get("category", "")
    hook = CATEGORY_HOOKS.get(category, "")

    vars = {
        "business_name": lead.get("business_name", "your business"),
        "contact_name": contact,
        "area": lead.get("area", "your area").replace("_", " ").title(),
        "our_business": BUSINESS_NAME,
        "owner_name": OWNER_NAME,
        "phone": BUSINESS_PHONE,
        "website": BUSINESS_WEBSITE,
        "obd_price": f"{PRICING['obd_test']:.0f}",
        "ovi_price": f"{PRICING['ovi_test']:.0f}",
        "fleet_discount": PRICING["fleet_discount_pct"],
        "category_hook": hook,
    }

    subject = template["subject"].format(**vars)
    body = template["body"].format(**vars)

    # Inject category hook after first paragraph in email 1
    if template_num == 1 and hook:
        lines = body.split("\n\n")
        if len(lines) >= 2:
            lines.insert(1, hook)
            body = "\n\n".join(lines)

    return subject, body


def load_leads(tier_filter=None, limit=None):
    """Load leads from CSV, optionally filtered."""
    if not os.path.exists(LEADS_CSV):
        print(f"[ERROR] No leads file found at {LEADS_CSV}")
        print("  Run 01_lead_scraper.py first.")
        sys.exit(1)

    leads = []
    with open(LEADS_CSV, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if tier_filter:
                score = int(row.get("score", 0))
                if tier_filter == 1 and score < 8:
                    continue
                elif tier_filter == 2 and not (5 <= score < 8):
                    continue
                elif tier_filter == 3 and score >= 5:
                    continue
            leads.append(row)

    if limit:
        leads = leads[:limit]

    return leads


def load_sent_log():
    """Load email send log to track what's been sent."""
    sent = {}  # {place_id: {1: date, 2: date, ...}}
    if os.path.exists(EMAILS_LOG):
        with open(EMAILS_LOG, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                pid = row.get("place_id", "")
                seq = int(row.get("sequence_num", 0))
                if pid not in sent:
                    sent[pid] = {}
                sent[pid][seq] = row.get("sent_date", "")
    return sent


def log_sent(place_id, business_name, email_to, sequence_num, subject):
    """Log a sent email."""
    os.makedirs(DATA_DIR, exist_ok=True)
    file_exists = os.path.exists(EMAILS_LOG)

    with open(EMAILS_LOG, "a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=[
            "place_id", "business_name", "email_to", "sequence_num",
            "subject", "sent_date", "status",
        ])
        if not file_exists:
            writer.writeheader()
        writer.writerow({
            "place_id": place_id,
            "business_name": business_name,
            "email_to": email_to,
            "sequence_num": sequence_num,
            "subject": subject,
            "sent_date": datetime.now().strftime("%Y-%m-%d %H:%M"),
            "status": "sent",
        })


def send_email(to_email, subject, body, from_email=None):
    """Send email via SMTP. Returns True on success."""
    if not SMTP_USER or not SMTP_PASS:
        print("  [SKIP] SMTP not configured — set SMTP_USER and SMTP_PASS env vars")
        return False

    from_addr = from_email or COLD_EMAIL_FROM or SMTP_USER

    msg = MIMEMultipart()
    msg["From"] = f"{OWNER_NAME} <{from_addr}>"
    msg["To"] = to_email
    msg["Subject"] = subject
    msg.attach(MIMEText(body, "plain"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=15) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASS)
            server.send_message(msg)
        return True
    except Exception as e:
        print(f"  [ERROR] Send failed: {e}")
        return False


def preview_emails(leads, sequence_num):
    """Print email previews without sending."""
    sent_log = load_sent_log()

    print(f"\n{'='*60}")
    print(f"  EMAIL PREVIEW — Sequence #{sequence_num}")
    print(f"{'='*60}\n")

    count = 0
    for lead in leads:
        pid = lead.get("place_id", "")
        already_sent = sent_log.get(pid, {})

        if sequence_num in already_sent:
            continue

        subject, body = personalize_email(sequence_num, lead)
        count += 1

        print(f"  ─── To: {lead['business_name']} ({lead.get('phone', 'no phone')}) ───")
        print(f"  Score: {lead.get('score', '?')} | {lead.get('tier', '?')}")
        print(f"  Subject: {subject}")
        print(f"  ---")
        for line in body.split("\n"):
            print(f"  {line}")
        print(f"  {'─'*50}\n")

    print(f"  Total emails to send: {count}\n")


def send_sequence(leads, sequence_num, dry_run=False):
    """Send email sequence to leads."""
    sent_log = load_sent_log()
    sent_count = 0
    skip_count = 0

    for lead in leads:
        pid = lead.get("place_id", "")
        already_sent = sent_log.get(pid, {})

        # Skip if this sequence already sent
        if sequence_num in already_sent:
            skip_count += 1
            continue

        # Skip if previous sequence not sent yet (must go in order)
        if sequence_num > 1 and (sequence_num - 1) not in already_sent:
            continue

        # Need an email address to send to
        # In practice, you'd enrich this from scraping or manual entry
        email_to = lead.get("email", "")
        if not email_to:
            print(f"  [SKIP] {lead['business_name']} — no email address")
            continue

        subject, body = personalize_email(sequence_num, lead)

        if dry_run:
            print(f"  [DRY RUN] Would send to {email_to}: {subject}")
        else:
            success = send_email(email_to, subject, body)
            if success:
                log_sent(pid, lead["business_name"], email_to, sequence_num, subject)
                sent_count += 1
                print(f"  [SENT] {lead['business_name']} → {email_to}")

    print(f"\n  Sent: {sent_count} | Skipped (already sent): {skip_count}\n")


def main():
    parser = argparse.ArgumentParser(description="NorCal Cold Emailer")
    parser.add_argument("--preview", action="store_true", help="Preview emails without sending")
    parser.add_argument("--send", action="store_true", help="Actually send emails")
    parser.add_argument("--sequence", type=int, default=1, choices=[1, 2, 3],
                        help="Which email in the sequence (1=initial, 2=bump, 3=breakup)")
    parser.add_argument("--tier", type=int, choices=[1, 2, 3], help="Filter by tier")
    parser.add_argument("--limit", type=int, help="Max leads to process")
    parser.add_argument("--dry-run", action="store_true", help="Log but don't actually send")
    args = parser.parse_args()

    leads = load_leads(tier_filter=args.tier, limit=args.limit)
    print(f"\n  Loaded {len(leads)} leads" + (f" (Tier {args.tier})" if args.tier else ""))

    if args.preview or (not args.send):
        preview_emails(leads, args.sequence)
    elif args.send:
        send_sequence(leads, args.sequence, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
