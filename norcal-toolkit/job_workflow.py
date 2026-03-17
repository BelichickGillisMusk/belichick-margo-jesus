#!/usr/bin/env python3
"""
NorCal Carb Mobile — Job Workflow (Call-to-Cash)
The exact workflow for when a call comes in and you book a job.

Usage:
    python3 job_workflow.py                       # interactive walkthrough
    python3 job_workflow.py --quick "Valley Fleet" --obd 3 --ovi 1

This is the scenario from the howto:
"3 OBD tests and 1 OVI test today at 3pm"
"""
import argparse
import os
import sys
from datetime import datetime

TOOLKIT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, TOOLKIT_DIR)

from config import PRICING, BUSINESS_PHONE, BUSINESS_NAME, OWNER_NAME


def calculate_quote(obd=0, ovi=0, smoke=0, fleet_discount=False):
    """Quick price calculator."""
    total_vehicles = obd + ovi + smoke
    subtotal = (obd * PRICING["obd_test"] +
                ovi * PRICING["ovi_test"] +
                smoke * PRICING["smoke_opacity_test"])

    discount = 0
    if fleet_discount or total_vehicles >= PRICING["fleet_discount_threshold"]:
        discount = subtotal * (PRICING["fleet_discount_pct"] / 100)

    return subtotal, discount, subtotal - discount


def interactive_workflow():
    """Walk through the full job workflow interactively."""
    print(f"\n{'='*60}")
    print(f"  NORCAL CARB MOBILE — JOB WORKFLOW")
    print(f"  Call-to-Cash Checklist")
    print(f"{'='*60}")

    # Step 1: Capture
    print(f"\n  STEP 1: CAPTURE THE CALL")
    print(f"  {'─'*40}")
    company = input("  Business name: ").strip() or "Walk-in Customer"
    contact = input("  Contact person: ").strip() or company.split()[0]
    phone = input("  Phone: ").strip()
    email = input("  Email: ").strip()
    address = input("  Service address: ").strip()

    print(f"\n  STEP 2: SCOPE THE JOB")
    print(f"  {'─'*40}")
    obd = int(input("  Number of OBD tests: ").strip() or "0")
    ovi = int(input("  Number of OVI tests: ").strip() or "0")
    smoke = int(input("  Number of Smoke Opacity tests: ").strip() or "0")
    appt_time = input("  Appointment time (e.g., 3pm today): ").strip() or "TBD"

    # Calculate
    subtotal, discount, total = calculate_quote(obd, ovi, smoke)
    total_vehicles = obd + ovi + smoke

    print(f"\n  STEP 3: CONFIRM QUOTE")
    print(f"  {'─'*40}")
    print(f"  Customer:  {company} ({contact})")
    print(f"  Address:   {address}")
    print(f"  Time:      {appt_time}")
    print(f"  Services:")
    if obd: print(f"    {obd}x OBD Test  @ ${PRICING['obd_test']:.0f} = ${obd * PRICING['obd_test']:.2f}")
    if ovi: print(f"    {ovi}x OVI Test  @ ${PRICING['ovi_test']:.0f} = ${ovi * PRICING['ovi_test']:.2f}")
    if smoke: print(f"    {smoke}x Smoke    @ ${PRICING['smoke_opacity_test']:.0f} = ${smoke * PRICING['smoke_opacity_test']:.2f}")
    if discount > 0:
        print(f"    Fleet discount ({PRICING['fleet_discount_pct']}%): -${discount:.2f}")
    print(f"  ───────────────────────────")
    print(f"  TOTAL:     ${total:.2f}")

    confirm = input(f"\n  Send confirmation text/email? (y/n): ").strip().lower()
    if confirm == "y":
        confirmation = (
            f"Confirmed: {company}\n"
            f"{obd + ovi + smoke} vehicle tests at {appt_time}\n"
            f"Address: {address}\n"
            f"Total: ${total:.2f}\n"
            f"— {OWNER_NAME}, {BUSINESS_NAME} {BUSINESS_PHONE}"
        )
        print(f"\n  CONFIRMATION MESSAGE (copy/paste to text or email):")
        print(f"  {'─'*40}")
        for line in confirmation.split("\n"):
            print(f"  {line}")
        print(f"  {'─'*40}")

    # Step 4: Add to CRM
    print(f"\n  STEP 4: ADD TO CRM")
    print(f"  {'─'*40}")
    add_crm = input("  Add to CRM? (y/n): ").strip().lower()
    if add_crm == "y":
        from subprocess import run
        run([sys.executable, os.path.join(TOOLKIT_DIR, "03_crm_tracker.py"),
             "add", company, phone, email, f"Scheduled: {appt_time} | {obd} OBD, {ovi} OVI"],
            cwd=TOOLKIT_DIR)
        # Update status to SCHEDULED
        run([sys.executable, os.path.join(TOOLKIT_DIR, "03_crm_tracker.py"),
             "update", company, "--status", "SCHEDULED",
             "--contact", contact, "--email", email,
             "--note", f"Booked {total_vehicles} tests at {appt_time}"],
            cwd=TOOLKIT_DIR)

    # Step 5: After testing
    print(f"\n  STEP 5: AFTER TESTING (run these after the job)")
    print(f"  {'─'*40}")
    print(f"  a) Update CRM status:")
    print(f"     python3 03_crm_tracker.py update \"{company}\" --status TESTED")
    print(f"")
    print(f"  b) Generate invoice:")
    print(f"     python3 04_invoice_generator.py create \"{company}\" --obd {obd} --ovi {ovi}"
          + (f" --smoke {smoke}" if smoke else "")
          + (f" --fleet-discount" if total_vehicles >= PRICING["fleet_discount_threshold"] else "")
          + f" --phone \"{phone}\" --email \"{email}\" --address \"{address}\"")
    print(f"")
    print(f"  c) Send review request:")
    print(f"     python3 05_review_request.py review \"{company}\" --phone \"{phone}\""
          + (f" --email \"{email}\"" if email else ""))
    print(f"")
    print(f"  d) Post to social:")
    city = address.split(",")[0].strip() if "," in address else "your area"
    print(f"     python3 05_review_request.py social --type job_done --city \"{city}\" --tests {total_vehicles}")
    print(f"")
    print(f"  e) Update CRM to invoiced:")
    print(f"     python3 03_crm_tracker.py update \"{company}\" --status INVOICED")

    print(f"\n{'='*60}")
    print(f"  JOB BOOKED. Go make money.")
    print(f"{'='*60}\n")


def quick_workflow(company, obd=0, ovi=0, smoke=0, phone="", email="", address=""):
    """Non-interactive quick booking."""
    subtotal, discount, total = calculate_quote(obd, ovi, smoke)
    total_vehicles = obd + ovi + smoke

    print(f"\n  QUICK BOOKING: {company}")
    print(f"  {'─'*40}")
    print(f"  {obd} OBD + {ovi} OVI + {smoke} Smoke = ${total:.2f}")

    if total_vehicles >= PRICING["fleet_discount_threshold"]:
        print(f"  Fleet discount applied: -${discount:.2f}")

    # Add to CRM
    from subprocess import run
    run([sys.executable, os.path.join(TOOLKIT_DIR, "03_crm_tracker.py"),
         "add", company, phone, email, f"{obd} OBD, {ovi} OVI, {smoke} Smoke"],
        cwd=TOOLKIT_DIR, capture_output=True)
    run([sys.executable, os.path.join(TOOLKIT_DIR, "03_crm_tracker.py"),
         "update", company, "--status", "SCHEDULED"],
        cwd=TOOLKIT_DIR, capture_output=True)

    print(f"  Added to CRM as SCHEDULED")
    print(f"\n  After job, run:")
    print(f"  python3 04_invoice_generator.py create \"{company}\" --obd {obd} --ovi {ovi}"
          + (f" --smoke {smoke}" if smoke else ""))
    print()


def main():
    parser = argparse.ArgumentParser(description="NorCal Job Workflow")
    parser.add_argument("--quick", metavar="COMPANY", help="Quick booking (non-interactive)")
    parser.add_argument("--obd", type=int, default=0)
    parser.add_argument("--ovi", type=int, default=0)
    parser.add_argument("--smoke", type=int, default=0)
    parser.add_argument("--phone", default="")
    parser.add_argument("--email", default="")
    parser.add_argument("--address", default="")
    args = parser.parse_args()

    if args.quick:
        quick_workflow(args.quick, obd=args.obd, ovi=args.ovi, smoke=args.smoke,
                       phone=args.phone, email=args.email, address=args.address)
    else:
        interactive_workflow()


if __name__ == "__main__":
    main()
