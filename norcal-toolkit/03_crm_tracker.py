#!/usr/bin/env python3
"""
NorCal Carb Mobile — Follow-Up Tracker / Mini CRM
Tracks lead status, schedules follow-ups, manages the pipeline.

Usage:
    python3 03_crm_tracker.py status                     # pipeline overview
    python3 03_crm_tracker.py due                        # today's follow-ups
    python3 03_crm_tracker.py add "Company" "phone" "email" "notes"
    python3 03_crm_tracker.py update PLACE_ID --status contacted
    python3 03_crm_tracker.py schedule PLACE_ID --date 2026-03-20 --note "call back"
    python3 03_crm_tracker.py import leads.csv           # import from scraper
    python3 03_crm_tracker.py export google              # export for Google Sheets
"""
import argparse
import csv
import os
import sys
from datetime import datetime, timedelta

from config import DATA_DIR, LEADS_CSV, CRM_CSV, FOLLOWUP_SCHEDULE

# ─── CRM Fields ──────────────────────────────────────────────────

CRM_FIELDS = [
    "place_id", "business_name", "contact_name", "phone", "email",
    "address", "website", "category", "score", "tier",
    "status",           # NEW, CONTACTED, RESPONDED, SCHEDULED, TESTED, INVOICED, PAID, LOST
    "last_contact",     # date of last outreach
    "next_followup",    # date of next scheduled follow-up
    "contact_count",    # number of times contacted
    "notes",            # running notes
    "created_date",
    "updated_date",
]

VALID_STATUSES = [
    "NEW", "CONTACTED", "RESPONDED", "SCHEDULED",
    "TESTED", "INVOICED", "PAID", "LOST",
]


def load_crm():
    """Load CRM data from CSV."""
    records = []
    if os.path.exists(CRM_CSV):
        with open(CRM_CSV, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                records.append(row)
    return records


def save_crm(records):
    """Save CRM data to CSV."""
    os.makedirs(DATA_DIR, exist_ok=True)
    with open(CRM_CSV, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=CRM_FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(records)


def find_record(records, identifier):
    """Find a record by place_id or business name (partial match)."""
    for r in records:
        if r.get("place_id") == identifier:
            return r
        if identifier.lower() in r.get("business_name", "").lower():
            return r
    return None


def import_from_leads(leads_file=None):
    """Import leads from scraper CSV into CRM."""
    src = leads_file or LEADS_CSV
    if not os.path.exists(src):
        print(f"[ERROR] File not found: {src}")
        sys.exit(1)

    crm = load_crm()
    existing_ids = {r["place_id"] for r in crm}
    imported = 0

    with open(src, "r") as f:
        reader = csv.DictReader(f)
        for row in reader:
            pid = row.get("place_id", "")
            if pid in existing_ids:
                continue

            now = datetime.now().strftime("%Y-%m-%d")
            crm.append({
                "place_id": pid,
                "business_name": row.get("business_name", ""),
                "contact_name": "",
                "phone": row.get("phone", ""),
                "email": "",
                "address": row.get("address", ""),
                "website": row.get("website", ""),
                "category": row.get("category", ""),
                "score": row.get("score", "0"),
                "tier": row.get("tier", ""),
                "status": "NEW",
                "last_contact": "",
                "next_followup": now,  # follow up today
                "contact_count": "0",
                "notes": row.get("notes", ""),
                "created_date": now,
                "updated_date": now,
            })
            imported += 1
            existing_ids.add(pid)

    save_crm(crm)
    print(f"  Imported {imported} new leads into CRM ({len(crm)} total)")


def show_status():
    """Show pipeline status overview."""
    crm = load_crm()
    if not crm:
        print("  CRM is empty. Run: python3 03_crm_tracker.py import")
        return

    # Count by status
    status_counts = {}
    for r in crm:
        s = r.get("status", "NEW")
        status_counts[s] = status_counts.get(s, 0) + 1

    # Count by tier
    tier_counts = {"TIER 1": 0, "TIER 2": 0, "TIER 3": 0}
    for r in crm:
        tier = r.get("tier", "")
        for t in tier_counts:
            if t in tier:
                tier_counts[t] += 1

    print(f"\n{'='*60}")
    print(f"  PIPELINE STATUS — {datetime.now().strftime('%Y-%m-%d')}")
    print(f"{'='*60}")
    print(f"  Total leads: {len(crm)}")
    print()

    # Status pipeline
    pipeline_order = ["NEW", "CONTACTED", "RESPONDED", "SCHEDULED", "TESTED", "INVOICED", "PAID", "LOST"]
    for s in pipeline_order:
        count = status_counts.get(s, 0)
        if count > 0:
            bar = "#" * min(count, 40)
            print(f"  {s:12s} [{count:3d}] {bar}")

    print(f"\n  By Tier:")
    for t, c in tier_counts.items():
        print(f"    {t}: {c}")

    # Revenue
    tested = status_counts.get("TESTED", 0) + status_counts.get("INVOICED", 0) + status_counts.get("PAID", 0)
    paid = status_counts.get("PAID", 0)
    print(f"\n  Jobs completed: {tested}")
    print(f"  Paid:           {paid}")
    print(f"{'='*60}\n")


def show_due():
    """Show follow-ups due today or overdue."""
    crm = load_crm()
    today = datetime.now().strftime("%Y-%m-%d")

    due = []
    overdue = []
    for r in crm:
        next_fu = r.get("next_followup", "")
        if not next_fu or r.get("status") in ("PAID", "LOST"):
            continue
        if next_fu <= today:
            if next_fu < today:
                overdue.append(r)
            else:
                due.append(r)

    print(f"\n{'='*60}")
    print(f"  FOLLOW-UPS DUE — {today}")
    print(f"{'='*60}")

    if overdue:
        print(f"\n  OVERDUE ({len(overdue)}):")
        for r in sorted(overdue, key=lambda x: x.get("score", "0"), reverse=True):
            print(f"    [{r.get('score', '?')}] {r['business_name']:30s} {r.get('phone', ''):15s} "
                  f"status={r['status']} due={r['next_followup']} contacts={r.get('contact_count', 0)}")

    if due:
        print(f"\n  DUE TODAY ({len(due)}):")
        for r in sorted(due, key=lambda x: x.get("score", "0"), reverse=True):
            print(f"    [{r.get('score', '?')}] {r['business_name']:30s} {r.get('phone', ''):15s} "
                  f"status={r['status']} contacts={r.get('contact_count', 0)}")

    if not due and not overdue:
        print("  Nothing due today. Go make some calls anyway.")

    print(f"{'='*60}\n")


def add_lead(name, phone="", email="", notes=""):
    """Manually add a lead to CRM."""
    crm = load_crm()
    now = datetime.now().strftime("%Y-%m-%d")

    new_id = f"MANUAL_{datetime.now().strftime('%Y%m%d%H%M%S')}"
    crm.append({
        "place_id": new_id,
        "business_name": name,
        "contact_name": "",
        "phone": phone,
        "email": email,
        "address": "",
        "website": "",
        "category": "manual",
        "score": "5",
        "tier": "TIER 2 — CALL THIS MONTH",
        "status": "NEW",
        "last_contact": "",
        "next_followup": now,
        "contact_count": "0",
        "notes": notes,
        "created_date": now,
        "updated_date": now,
    })

    save_crm(crm)
    print(f"  Added: {name} ({phone})")


def update_lead(identifier, status=None, note=None, contact_name=None, email=None, schedule_date=None):
    """Update a lead's status, notes, or schedule next follow-up."""
    crm = load_crm()
    record = find_record(crm, identifier)

    if not record:
        print(f"  [ERROR] Lead not found: {identifier}")
        return

    now = datetime.now().strftime("%Y-%m-%d")

    if status:
        if status.upper() not in VALID_STATUSES:
            print(f"  [ERROR] Invalid status: {status}. Valid: {', '.join(VALID_STATUSES)}")
            return
        record["status"] = status.upper()

        # Auto-set next follow-up based on contact count
        if status.upper() == "CONTACTED":
            count = int(record.get("contact_count", 0)) + 1
            record["contact_count"] = str(count)
            record["last_contact"] = now

            # Schedule next follow-up from cadence
            if count <= len(FOLLOWUP_SCHEDULE):
                days = FOLLOWUP_SCHEDULE[count - 1]
                record["next_followup"] = (datetime.now() + timedelta(days=days)).strftime("%Y-%m-%d")
            else:
                record["next_followup"] = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")

    if contact_name:
        record["contact_name"] = contact_name

    if email:
        record["email"] = email

    if note:
        existing = record.get("notes", "")
        record["notes"] = f"{existing} | [{now}] {note}" if existing else f"[{now}] {note}"

    if schedule_date:
        record["next_followup"] = schedule_date

    record["updated_date"] = now
    save_crm(crm)
    print(f"  Updated: {record['business_name']} → status={record['status']}, next={record.get('next_followup', 'none')}")


def export_google():
    """Export CRM in a format ready for Google Sheets import."""
    crm = load_crm()
    output = os.path.join(DATA_DIR, "crm_google_sheets.csv")

    with open(output, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=CRM_FIELDS, extrasaction="ignore")
        writer.writeheader()
        writer.writerows(crm)

    print(f"  Exported {len(crm)} records to {output}")
    print(f"  Upload to Google Sheets → File → Import → Upload")


def main():
    parser = argparse.ArgumentParser(description="NorCal CRM Tracker")
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("status", help="Pipeline overview")
    sub.add_parser("due", help="Today's follow-ups")

    add_p = sub.add_parser("add", help="Add a lead manually")
    add_p.add_argument("name", help="Business name")
    add_p.add_argument("phone", nargs="?", default="", help="Phone number")
    add_p.add_argument("email", nargs="?", default="", help="Email address")
    add_p.add_argument("notes", nargs="?", default="", help="Notes")

    update_p = sub.add_parser("update", help="Update a lead")
    update_p.add_argument("identifier", help="Place ID or business name")
    update_p.add_argument("--status", help="New status")
    update_p.add_argument("--note", help="Add a note")
    update_p.add_argument("--contact", help="Contact person name")
    update_p.add_argument("--email", help="Email address")
    update_p.add_argument("--date", help="Schedule follow-up date (YYYY-MM-DD)")

    sched_p = sub.add_parser("schedule", help="Schedule follow-up")
    sched_p.add_argument("identifier", help="Place ID or business name")
    sched_p.add_argument("--date", required=True, help="Follow-up date (YYYY-MM-DD)")
    sched_p.add_argument("--note", default="", help="Note for the follow-up")

    import_p = sub.add_parser("import", help="Import from scraper CSV")
    import_p.add_argument("file", nargs="?", help="CSV file path (default: leads.csv)")

    sub.add_parser("export", help="Export for Google Sheets")

    args = parser.parse_args()

    if args.command == "status":
        show_status()
    elif args.command == "due":
        show_due()
    elif args.command == "add":
        add_lead(args.name, args.phone, args.email, args.notes)
    elif args.command == "update":
        update_lead(args.identifier, status=args.status, note=args.note,
                    contact_name=args.contact, email=args.email, schedule_date=args.date)
    elif args.command == "schedule":
        update_lead(args.identifier, schedule_date=args.date, note=args.note)
    elif args.command == "import":
        import_from_leads(args.file)
    elif args.command == "export":
        export_google()
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
