#!/usr/bin/env python3
"""
NorCal Carb Mobile — Daily Workflow Runner
Run this every morning. It executes the full daily cycle:

    python3 daily_workflow.py              # full daily run
    python3 daily_workflow.py --step 3     # run specific step only
    python3 daily_workflow.py --dry-run    # preview everything, change nothing

THE DAILY LOOP:
    1. Scrape new leads (weekly on Monday, skip other days)
    2. Import new leads into CRM
    3. Show today's follow-ups (who to call/email)
    4. Send cold email sequences (Tier 1 first)
    5. Pipeline status check
    6. Generate a social media post
    7. Check overdue invoices
    8. Batch review requests for yesterday's tested jobs
"""
import os
import sys
import subprocess
from datetime import datetime

TOOLKIT_DIR = os.path.dirname(os.path.abspath(__file__))


def run_step(script, args=None, description=""):
    """Run a toolkit script as a subprocess."""
    cmd = [sys.executable, os.path.join(TOOLKIT_DIR, script)]
    if args:
        cmd.extend(args)

    print(f"\n{'='*60}")
    print(f"  STEP: {description}")
    print(f"  CMD:  {' '.join(cmd)}")
    print(f"{'='*60}\n")

    result = subprocess.run(cmd, cwd=TOOLKIT_DIR, capture_output=False)
    return result.returncode == 0


def daily_workflow(step=None, dry_run=False):
    """Execute the daily workflow."""
    today = datetime.now()
    day_name = today.strftime("%A")
    date_str = today.strftime("%Y-%m-%d")

    print(f"\n{'#'*60}")
    print(f"  NORCAL CARB MOBILE — DAILY WORKFLOW")
    print(f"  {day_name}, {date_str}")
    print(f"{'#'*60}")

    steps = {
        1: {
            "desc": "Scrape New Leads (Monday only)",
            "script": "01_lead_scraper.py",
            "args": [],
            "condition": day_name == "Monday",
            "skip_msg": "Lead scraping runs on Mondays. Skipping.",
        },
        2: {
            "desc": "Import Leads to CRM",
            "script": "03_crm_tracker.py",
            "args": ["import"],
            "condition": True,
        },
        3: {
            "desc": "Today's Follow-Ups (WHO TO CALL)",
            "script": "03_crm_tracker.py",
            "args": ["due"],
            "condition": True,
        },
        4: {
            "desc": "Cold Email — Tier 1 Sequence #1",
            "script": "02_cold_emailer.py",
            "args": ["--preview", "--tier", "1", "--sequence", "1"] if dry_run
                    else ["--send", "--tier", "1", "--sequence", "1", "--dry-run"],
            "condition": True,
        },
        5: {
            "desc": "Pipeline Status",
            "script": "03_crm_tracker.py",
            "args": ["status"],
            "condition": True,
        },
        6: {
            "desc": "Generate Social Media Post",
            "script": "05_review_request.py",
            "args": ["social", "--type", "tip"],
            "condition": True,
        },
        7: {
            "desc": "Check Overdue Invoices",
            "script": "04_invoice_generator.py",
            "args": ["overdue"],
            "condition": True,
        },
        8: {
            "desc": "Batch Review Requests",
            "script": "05_review_request.py",
            "args": ["batch-review"],
            "condition": True,
        },
    }

    for num, s in steps.items():
        if step and num != step:
            continue

        if not s.get("condition", True):
            print(f"\n  [SKIP] Step {num}: {s.get('skip_msg', 'Condition not met')}")
            continue

        run_step(s["script"], s["args"], f"Step {num}: {s['desc']}")

    print(f"\n{'#'*60}")
    print(f"  DAILY WORKFLOW COMPLETE — {datetime.now().strftime('%H:%M')}")
    print(f"  Next: Make your calls. Close your deals.")
    print(f"{'#'*60}\n")


def main():
    import argparse
    parser = argparse.ArgumentParser(description="NorCal Daily Workflow")
    parser.add_argument("--step", type=int, help="Run specific step only (1-8)")
    parser.add_argument("--dry-run", action="store_true", help="Preview mode, no changes")
    args = parser.parse_args()

    daily_workflow(step=args.step, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
