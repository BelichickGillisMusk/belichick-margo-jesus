#!/usr/bin/env python3
"""
NorCal Carb Mobile — Google Calendar Integration
Auto-create calendar events when booking jobs. View today's schedule.

Usage:
    python3 06_calendar.py today                     # show today's schedule
    python3 06_calendar.py tomorrow                  # show tomorrow's schedule
    python3 06_calendar.py create "Valley Fleet" --time "3pm" --obd 3 --ovi 1
    python3 06_calendar.py cancel EVENT_ID

Setup:
    1. Enable Google Calendar API in GCP console
    2. Create service account, download JSON key
    3. Save key to credentials/calendar-sa.json (or set GOOGLE_CALENDAR_CREDENTIALS)
    4. Share your Google Calendar with the service account email
    5. Set GOOGLE_CALENDAR_ID to your calendar ID (usually your Gmail)
"""
import argparse
import os
import sys
from datetime import datetime, timedelta

TOOLKIT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, TOOLKIT_DIR)

from config import (
    GOOGLE_CALENDAR_ID,
    GOOGLE_CALENDAR_CREDENTIALS,
    BUSINESS_NAME,
    BUSINESS_PHONE,
    OWNER_NAME,
    PRICING,
)

SCOPES = ["https://www.googleapis.com/auth/calendar"]


def get_calendar_service():
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
    except ImportError:
        print("  Missing dependencies. Run: pip install google-api-python-client google-auth")
        return None

    if not os.path.exists(GOOGLE_CALENDAR_CREDENTIALS):
        print(f"  Credentials not found: {GOOGLE_CALENDAR_CREDENTIALS}")
        print("  Download service account key from GCP console.")
        return None

    creds = service_account.Credentials.from_service_account_file(
        GOOGLE_CALENDAR_CREDENTIALS, scopes=SCOPES
    )
    return build("calendar", "v3", credentials=creds)


def parse_time(time_str, base_date=None):
    if base_date is None:
        base_date = datetime.now()

    time_str = time_str.strip().lower()

    if "tomorrow" in time_str:
        base_date = base_date + timedelta(days=1)
        time_str = time_str.replace("tomorrow", "").strip()

    if "today" in time_str:
        time_str = time_str.replace("today", "").strip()

    time_str = time_str.strip(" ,-@")
    if not time_str:
        return base_date.replace(hour=9, minute=0, second=0, microsecond=0)

    for fmt in ["%I:%M%p", "%I:%M %p", "%I%p", "%I %p", "%H:%M"]:
        try:
            parsed = datetime.strptime(time_str, fmt)
            return base_date.replace(
                hour=parsed.hour, minute=parsed.minute, second=0, microsecond=0
            )
        except ValueError:
            continue

    return base_date.replace(hour=9, minute=0, second=0, microsecond=0)


def estimate_duration_hours(total_vehicles):
    if total_vehicles <= 3:
        return 1
    if total_vehicles <= 10:
        return 2
    return 3


def build_job_event(company, address, obd=0, ovi=0, smoke=0, appt_time="9am", contact="", phone=""):
    total_vehicles = obd + ovi + smoke
    start = parse_time(appt_time)
    hours = estimate_duration_hours(total_vehicles)
    end = start + timedelta(hours=hours)

    services = []
    if obd:
        services.append(f"{obd}x OBD (${obd * PRICING['obd_test']:.0f})")
    if ovi:
        services.append(f"{ovi}x OVI (${ovi * PRICING['ovi_test']:.0f})")
    if smoke:
        services.append(f"{smoke}x Smoke (${smoke * PRICING['smoke_opacity_test']:.0f})")

    subtotal = (obd * PRICING["obd_test"] + ovi * PRICING["ovi_test"] +
                smoke * PRICING["smoke_opacity_test"])
    discount = 0
    if total_vehicles >= PRICING["fleet_discount_threshold"]:
        discount = subtotal * (PRICING["fleet_discount_pct"] / 100)
    total = subtotal - discount

    description_lines = [
        f"Customer: {company}",
    ]
    if contact:
        description_lines.append(f"Contact: {contact}")
    if phone:
        description_lines.append(f"Phone: {phone}")
    description_lines.append("")
    description_lines.append(f"Services: {', '.join(services)}")
    description_lines.append(f"Vehicles: {total_vehicles}")
    if discount > 0:
        description_lines.append(f"Fleet discount: -${discount:.2f}")
    description_lines.append(f"Total: ${total:.2f}")
    description_lines.append("")
    description_lines.append(f"— {OWNER_NAME}, {BUSINESS_NAME} {BUSINESS_PHONE}")

    return {
        "summary": f"{company} — {total_vehicles} truck test{'s' if total_vehicles != 1 else ''}",
        "location": address or "",
        "description": "\n".join(description_lines),
        "start": {
            "dateTime": start.isoformat(),
            "timeZone": "America/Los_Angeles",
        },
        "end": {
            "dateTime": end.isoformat(),
            "timeZone": "America/Los_Angeles",
        },
        "reminders": {
            "useDefault": False,
            "overrides": [
                {"method": "popup", "minutes": 30},
                {"method": "popup", "minutes": 60},
            ],
        },
    }


def create_event(service, event_body):
    event = service.events().insert(
        calendarId=GOOGLE_CALENDAR_ID, body=event_body
    ).execute()
    return event.get("id"), event.get("htmlLink")


def list_events(service, target_date=None, max_results=10):
    if target_date is None:
        target_date = datetime.now()

    start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = start_of_day + timedelta(days=1)

    events_result = service.events().list(
        calendarId=GOOGLE_CALENDAR_ID,
        timeMin=start_of_day.isoformat() + "-08:00",
        timeMax=end_of_day.isoformat() + "-08:00",
        maxResults=max_results,
        singleEvents=True,
        orderBy="startTime",
    ).execute()

    return events_result.get("items", [])


def delete_event(service, event_id):
    service.events().delete(
        calendarId=GOOGLE_CALENDAR_ID, eventId=event_id
    ).execute()


def show_schedule(target_date=None, label="Today"):
    service = get_calendar_service()
    if not service:
        print(f"\n  [DEMO MODE] Calendar not configured. Showing placeholder.")
        print(f"  Set up credentials to see real calendar data.\n")
        return

    events = list_events(service, target_date)
    date_str = (target_date or datetime.now()).strftime("%A, %B %d")

    print(f"\n  CALENDAR — {label.upper()} ({date_str})")
    print(f"  {'─' * 45}")

    if not events:
        print(f"  No appointments scheduled.")
    else:
        for event in events:
            start = event["start"].get("dateTime", event["start"].get("date"))
            if "T" in start:
                time_str = datetime.fromisoformat(start.replace("Z", "+00:00")).strftime("%-I:%M %p")
            else:
                time_str = "All day"
            summary = event.get("summary", "(no title)")
            location = event.get("location", "")
            loc_str = f" @ {location}" if location else ""
            print(f"  {time_str:>10}  {summary}{loc_str}")

    print(f"  {'─' * 45}")
    print(f"  {len(events)} event{'s' if len(events) != 1 else ''} scheduled\n")

    return events


def cmd_create(args):
    service = get_calendar_service()
    if not service:
        return

    event_body = build_job_event(
        company=args.company,
        address=args.address or "",
        obd=args.obd,
        ovi=args.ovi,
        smoke=args.smoke,
        appt_time=args.time or "9am",
        contact=args.contact or "",
        phone=args.phone or "",
    )

    event_id, link = create_event(service, event_body)
    print(f"\n  Calendar event created!")
    print(f"  Event ID: {event_id}")
    print(f"  Link: {link}")
    print(f"  Time: {event_body['start']['dateTime']}")
    print()
    return event_id


def cmd_cancel(args):
    service = get_calendar_service()
    if not service:
        return

    try:
        delete_event(service, args.event_id)
        print(f"\n  Event {args.event_id} cancelled.\n")
    except Exception as e:
        print(f"\n  Error cancelling event: {e}\n")


def main():
    parser = argparse.ArgumentParser(description="NorCal Calendar Manager")
    sub = parser.add_subparsers(dest="command")

    sub.add_parser("today", help="Show today's schedule")
    sub.add_parser("tomorrow", help="Show tomorrow's schedule")

    create_p = sub.add_parser("create", help="Create a job event")
    create_p.add_argument("company", help="Business name")
    create_p.add_argument("--time", default="9am", help="Appointment time (e.g. '3pm', '2:30pm tomorrow')")
    create_p.add_argument("--address", default="", help="Service location")
    create_p.add_argument("--obd", type=int, default=0, help="Number of OBD tests")
    create_p.add_argument("--ovi", type=int, default=0, help="Number of OVI tests")
    create_p.add_argument("--smoke", type=int, default=0, help="Number of smoke opacity tests")
    create_p.add_argument("--contact", default="", help="Contact person name")
    create_p.add_argument("--phone", default="", help="Contact phone number")

    cancel_p = sub.add_parser("cancel", help="Cancel a calendar event")
    cancel_p.add_argument("event_id", help="Google Calendar event ID")

    args = parser.parse_args()

    if args.command == "today":
        show_schedule(datetime.now(), "Today")
    elif args.command == "tomorrow":
        show_schedule(datetime.now() + timedelta(days=1), "Tomorrow")
    elif args.command == "create":
        cmd_create(args)
    elif args.command == "cancel":
        cmd_cancel(args)
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
