#!/usr/bin/env python3
"""
NorCal Carb Mobile — Invoice Generator
Creates professional invoices as HTML (printable/PDF-able) and tracks A/R.

Usage:
    python3 04_invoice_generator.py create "Valley Fleet" --obd 3 --ovi 1
    python3 04_invoice_generator.py create "Delta Trucking" --obd 5 --fleet-discount
    python3 04_invoice_generator.py list                     # all invoices
    python3 04_invoice_generator.py overdue                  # unpaid past due
    python3 04_invoice_generator.py paid INV-20260317-001    # mark as paid
    python3 04_invoice_generator.py remind                   # send payment reminders
"""
import argparse
import csv
import os
import sys
from datetime import datetime, timedelta

from jinja2 import Template

from config import (
    BUSINESS_NAME, BUSINESS_PHONE, BUSINESS_EMAIL, BUSINESS_WEBSITE,
    BUSINESS_ADDRESS, BAR_LICENSE, OWNER_NAME, PRICING,
    DATA_DIR, INVOICES_DIR, CRM_CSV, INVOICE_TERMS_DAYS,
)

# ─── Invoice Tracking ────────────────────────────────────────────

INVOICE_LOG = os.path.join(DATA_DIR, "invoices.csv")

INVOICE_FIELDS = [
    "invoice_id", "customer_name", "customer_phone", "customer_email",
    "customer_address", "date_issued", "date_due", "date_paid",
    "obd_count", "obd_rate", "ovi_count", "ovi_rate",
    "smoke_count", "smoke_rate", "discount_pct", "subtotal",
    "discount_amount", "total", "status", "notes", "file_path",
]


def next_invoice_id():
    """Generate sequential invoice ID."""
    today = datetime.now().strftime("%Y%m%d")
    seq = 1

    if os.path.exists(INVOICE_LOG):
        with open(INVOICE_LOG, "r") as f:
            reader = csv.DictReader(f)
            for row in reader:
                iid = row.get("invoice_id", "")
                if today in iid:
                    try:
                        existing_seq = int(iid.split("-")[-1])
                        seq = max(seq, existing_seq + 1)
                    except ValueError:
                        pass

    return f"INV-{today}-{seq:03d}"


def calculate_totals(obd_count, ovi_count, smoke_count, fleet_discount=False):
    """Calculate line items and totals."""
    obd_rate = PRICING["obd_test"]
    ovi_rate = PRICING["ovi_test"]
    smoke_rate = PRICING["smoke_opacity_test"]
    discount_pct = 0

    obd_total = obd_count * obd_rate
    ovi_total = ovi_count * ovi_rate
    smoke_total = smoke_count * smoke_rate
    subtotal = obd_total + ovi_total + smoke_total

    total_vehicles = obd_count + ovi_count + smoke_count
    if fleet_discount or total_vehicles >= PRICING["fleet_discount_threshold"]:
        discount_pct = PRICING["fleet_discount_pct"]

    discount_amount = subtotal * (discount_pct / 100)
    total = subtotal - discount_amount

    return {
        "obd_rate": obd_rate, "ovi_rate": ovi_rate, "smoke_rate": smoke_rate,
        "obd_total": obd_total, "ovi_total": ovi_total, "smoke_total": smoke_total,
        "subtotal": subtotal, "discount_pct": discount_pct,
        "discount_amount": discount_amount, "total": total,
    }


# ─── HTML Invoice Template ──────────────────────────────────────

INVOICE_HTML = Template("""<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>Invoice {{ invoice_id }}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a1a; padding: 40px; max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 3px solid #1a1a1a; padding-bottom: 20px; }
  .company h1 { font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
  .company p { font-size: 12px; color: #666; margin-top: 4px; }
  .invoice-meta { text-align: right; }
  .invoice-meta h2 { font-size: 28px; font-weight: 800; color: #1a1a1a; }
  .invoice-meta p { font-size: 13px; color: #666; margin-top: 4px; }
  .addresses { display: flex; justify-content: space-between; margin-bottom: 30px; }
  .addresses div { width: 48%; }
  .addresses h3 { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #999; margin-bottom: 8px; }
  .addresses p { font-size: 14px; line-height: 1.6; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  thead th { background: #1a1a1a; color: #fff; padding: 12px 16px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
  thead th:last-child, thead th:nth-child(3), thead th:nth-child(4) { text-align: right; }
  tbody td { padding: 14px 16px; border-bottom: 1px solid #eee; font-size: 14px; }
  tbody td:last-child, tbody td:nth-child(3), tbody td:nth-child(4) { text-align: right; }
  .totals { display: flex; justify-content: flex-end; }
  .totals table { width: 300px; }
  .totals td { padding: 8px 16px; font-size: 14px; }
  .totals tr:last-child td { font-weight: 800; font-size: 18px; border-top: 2px solid #1a1a1a; padding-top: 12px; }
  .discount td { color: #c0392b; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center; }
  .terms { background: #f8f8f8; padding: 16px; border-radius: 4px; margin-top: 30px; font-size: 13px; }
  .terms strong { display: block; margin-bottom: 6px; }
  .status-badge { display: inline-block; padding: 4px 12px; border-radius: 3px; font-size: 12px; font-weight: 700; text-transform: uppercase; }
  .status-unpaid { background: #ffeaa7; color: #856404; }
  .status-paid { background: #d4edda; color: #155724; }
  .status-overdue { background: #f8d7da; color: #721c24; }
  @media print { body { padding: 20px; } .no-print { display: none; } }
</style>
</head>
<body>
  <div class="header">
    <div class="company">
      <h1>{{ business_name }}</h1>
      <p>{{ business_address }}</p>
      <p>{{ business_phone }} | {{ business_email }}</p>
      <p>BAR License: {{ bar_license }}</p>
    </div>
    <div class="invoice-meta">
      <h2>INVOICE</h2>
      <p><strong>{{ invoice_id }}</strong></p>
      <p>Date: {{ date_issued }}</p>
      <p>Due: {{ date_due }}</p>
      <p><span class="status-badge status-{{ status_class }}">{{ status }}</span></p>
    </div>
  </div>

  <div class="addresses">
    <div>
      <h3>Bill To</h3>
      <p><strong>{{ customer_name }}</strong></p>
      {% if customer_address %}<p>{{ customer_address }}</p>{% endif %}
      {% if customer_phone %}<p>{{ customer_phone }}</p>{% endif %}
      {% if customer_email %}<p>{{ customer_email }}</p>{% endif %}
    </div>
    <div>
      <h3>Service Location</h3>
      <p>On-site mobile testing</p>
      {% if customer_address %}<p>{{ customer_address }}</p>{% endif %}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Service</th>
        <th>Description</th>
        <th>Qty</th>
        <th>Rate</th>
        <th>Amount</th>
      </tr>
    </thead>
    <tbody>
      {% if obd_count > 0 %}
      <tr>
        <td>OBD Test</td>
        <td>On-Board Diagnostics emissions test</td>
        <td style="text-align:right">{{ obd_count }}</td>
        <td style="text-align:right">${{ "%.2f"|format(obd_rate) }}</td>
        <td style="text-align:right">${{ "%.2f"|format(obd_total) }}</td>
      </tr>
      {% endif %}
      {% if ovi_count > 0 %}
      <tr>
        <td>OVI Test</td>
        <td>Opacity / Visual Inspection test</td>
        <td style="text-align:right">{{ ovi_count }}</td>
        <td style="text-align:right">${{ "%.2f"|format(ovi_rate) }}</td>
        <td style="text-align:right">${{ "%.2f"|format(ovi_total) }}</td>
      </tr>
      {% endif %}
      {% if smoke_count > 0 %}
      <tr>
        <td>Smoke Opacity Test</td>
        <td>Smoke opacity measurement</td>
        <td style="text-align:right">{{ smoke_count }}</td>
        <td style="text-align:right">${{ "%.2f"|format(smoke_rate) }}</td>
        <td style="text-align:right">${{ "%.2f"|format(smoke_total) }}</td>
      </tr>
      {% endif %}
    </tbody>
  </table>

  <div class="totals">
    <table>
      <tr>
        <td>Subtotal</td>
        <td>${{ "%.2f"|format(subtotal) }}</td>
      </tr>
      {% if discount_pct > 0 %}
      <tr class="discount">
        <td>Fleet Discount ({{ discount_pct }}%)</td>
        <td>-${{ "%.2f"|format(discount_amount) }}</td>
      </tr>
      {% endif %}
      <tr>
        <td><strong>Total Due</strong></td>
        <td><strong>${{ "%.2f"|format(total) }}</strong></td>
      </tr>
    </table>
  </div>

  <div class="terms">
    <strong>Payment Terms</strong>
    Payment due within {{ terms_days }} days of invoice date.
    Make checks payable to {{ business_name }}.
    For questions, contact {{ business_phone }} or {{ business_email }}.
  </div>

  <div class="footer">
    <p>{{ business_name }} | {{ business_website }}</p>
    <p>Thank you for your business.</p>
  </div>
</body>
</html>""")


def create_invoice(customer_name, obd=0, ovi=0, smoke=0, fleet_discount=False,
                   customer_phone="", customer_email="", customer_address="", notes=""):
    """Create an invoice and save as HTML + log entry."""
    os.makedirs(INVOICES_DIR, exist_ok=True)
    os.makedirs(DATA_DIR, exist_ok=True)

    inv_id = next_invoice_id()
    now = datetime.now()
    date_issued = now.strftime("%Y-%m-%d")
    date_due = (now + timedelta(days=INVOICE_TERMS_DAYS)).strftime("%Y-%m-%d")

    totals = calculate_totals(obd, ovi, smoke, fleet_discount)

    # Render HTML
    html = INVOICE_HTML.render(
        invoice_id=inv_id,
        business_name=BUSINESS_NAME,
        business_address=BUSINESS_ADDRESS,
        business_phone=BUSINESS_PHONE,
        business_email=BUSINESS_EMAIL,
        business_website=BUSINESS_WEBSITE,
        bar_license=BAR_LICENSE,
        customer_name=customer_name,
        customer_phone=customer_phone,
        customer_email=customer_email,
        customer_address=customer_address,
        date_issued=date_issued,
        date_due=date_due,
        status="UNPAID",
        status_class="unpaid",
        obd_count=obd, obd_rate=totals["obd_rate"], obd_total=totals["obd_total"],
        ovi_count=ovi, ovi_rate=totals["ovi_rate"], ovi_total=totals["ovi_total"],
        smoke_count=smoke, smoke_rate=totals["smoke_rate"], smoke_total=totals["smoke_total"],
        subtotal=totals["subtotal"],
        discount_pct=totals["discount_pct"],
        discount_amount=totals["discount_amount"],
        total=totals["total"],
        terms_days=INVOICE_TERMS_DAYS,
    )

    # Save HTML file
    html_path = os.path.join(INVOICES_DIR, f"{inv_id}.html")
    with open(html_path, "w") as f:
        f.write(html)

    # Log to CSV
    file_exists = os.path.exists(INVOICE_LOG)
    with open(INVOICE_LOG, "a", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=INVOICE_FIELDS)
        if not file_exists:
            writer.writeheader()
        writer.writerow({
            "invoice_id": inv_id,
            "customer_name": customer_name,
            "customer_phone": customer_phone,
            "customer_email": customer_email,
            "customer_address": customer_address,
            "date_issued": date_issued,
            "date_due": date_due,
            "date_paid": "",
            "obd_count": obd,
            "obd_rate": totals["obd_rate"],
            "ovi_count": ovi,
            "ovi_rate": totals["ovi_rate"],
            "smoke_count": smoke,
            "smoke_rate": totals["smoke_rate"],
            "discount_pct": totals["discount_pct"],
            "subtotal": totals["subtotal"],
            "discount_amount": totals["discount_amount"],
            "total": totals["total"],
            "status": "UNPAID",
            "notes": notes,
            "file_path": html_path,
        })

    print(f"\n  Invoice created: {inv_id}")
    print(f"  Customer:  {customer_name}")
    print(f"  Services:  {obd} OBD, {ovi} OVI, {smoke} Smoke")
    if totals["discount_pct"] > 0:
        print(f"  Discount:  {totals['discount_pct']}% fleet discount (-${totals['discount_amount']:.2f})")
    print(f"  Total:     ${totals['total']:.2f}")
    print(f"  Due:       {date_due}")
    print(f"  File:      {html_path}")
    print(f"\n  Open in browser to print/save as PDF.\n")

    return inv_id


def list_invoices():
    """List all invoices."""
    if not os.path.exists(INVOICE_LOG):
        print("  No invoices yet.")
        return

    with open(INVOICE_LOG, "r") as f:
        reader = csv.DictReader(f)
        invoices = list(reader)

    print(f"\n{'='*80}")
    print(f"  ALL INVOICES")
    print(f"{'='*80}")
    print(f"  {'ID':<22s} {'Customer':<25s} {'Total':>10s} {'Due':<12s} {'Status':<10s}")
    print(f"  {'-'*22} {'-'*25} {'-'*10} {'-'*12} {'-'*10}")

    total_outstanding = 0
    total_paid = 0

    for inv in invoices:
        total = float(inv.get("total", 0))
        status = inv.get("status", "UNPAID")
        if status == "PAID":
            total_paid += total
        else:
            total_outstanding += total

        print(f"  {inv['invoice_id']:<22s} {inv['customer_name']:<25s} "
              f"${total:>8.2f} {inv.get('date_due', ''):<12s} {status:<10s}")

    print(f"\n  Outstanding: ${total_outstanding:.2f} | Paid: ${total_paid:.2f}")
    print(f"{'='*80}\n")


def show_overdue():
    """Show overdue invoices."""
    if not os.path.exists(INVOICE_LOG):
        print("  No invoices yet.")
        return

    today = datetime.now().strftime("%Y-%m-%d")
    overdue = []

    with open(INVOICE_LOG, "r") as f:
        reader = csv.DictReader(f)
        for inv in reader:
            if inv.get("status") != "PAID" and inv.get("date_due", "9999") < today:
                overdue.append(inv)

    print(f"\n{'='*60}")
    print(f"  OVERDUE INVOICES — {today}")
    print(f"{'='*60}")

    if not overdue:
        print("  All invoices current. Nice.")
    else:
        total = 0
        for inv in overdue:
            amt = float(inv.get("total", 0))
            total += amt
            days = (datetime.now() - datetime.strptime(inv["date_due"], "%Y-%m-%d")).days
            print(f"  {inv['invoice_id']}  {inv['customer_name']:<25s}  "
                  f"${amt:.2f}  {days}d overdue  {inv.get('customer_phone', '')}")
        print(f"\n  Total overdue: ${total:.2f}")

    print(f"{'='*60}\n")


def mark_paid(invoice_id):
    """Mark an invoice as paid."""
    if not os.path.exists(INVOICE_LOG):
        print("  No invoices found.")
        return

    invoices = []
    found = False

    with open(INVOICE_LOG, "r") as f:
        reader = csv.DictReader(f)
        for inv in reader:
            if inv["invoice_id"] == invoice_id:
                inv["status"] = "PAID"
                inv["date_paid"] = datetime.now().strftime("%Y-%m-%d")
                found = True
                print(f"  Marked PAID: {invoice_id} — {inv['customer_name']} — ${inv['total']}")
            invoices.append(inv)

    if not found:
        print(f"  Invoice not found: {invoice_id}")
        return

    with open(INVOICE_LOG, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=INVOICE_FIELDS)
        writer.writeheader()
        writer.writerows(invoices)


def main():
    parser = argparse.ArgumentParser(description="NorCal Invoice Generator")
    sub = parser.add_subparsers(dest="command")

    create_p = sub.add_parser("create", help="Create a new invoice")
    create_p.add_argument("customer", help="Customer name")
    create_p.add_argument("--obd", type=int, default=0, help="Number of OBD tests")
    create_p.add_argument("--ovi", type=int, default=0, help="Number of OVI tests")
    create_p.add_argument("--smoke", type=int, default=0, help="Number of smoke opacity tests")
    create_p.add_argument("--fleet-discount", action="store_true", help="Apply fleet discount")
    create_p.add_argument("--phone", default="", help="Customer phone")
    create_p.add_argument("--email", default="", help="Customer email")
    create_p.add_argument("--address", default="", help="Customer address")
    create_p.add_argument("--notes", default="", help="Invoice notes")

    sub.add_parser("list", help="List all invoices")
    sub.add_parser("overdue", help="Show overdue invoices")

    paid_p = sub.add_parser("paid", help="Mark invoice as paid")
    paid_p.add_argument("invoice_id", help="Invoice ID (e.g., INV-20260317-001)")

    sub.add_parser("remind", help="Show who needs payment reminders")

    args = parser.parse_args()

    if args.command == "create":
        create_invoice(
            args.customer, obd=args.obd, ovi=args.ovi, smoke=args.smoke,
            fleet_discount=args.fleet_discount, customer_phone=args.phone,
            customer_email=args.email, customer_address=args.address, notes=args.notes,
        )
    elif args.command == "list":
        list_invoices()
    elif args.command == "overdue":
        show_overdue()
    elif args.command == "paid":
        mark_paid(args.invoice_id)
    elif args.command == "remind":
        show_overdue()  # same view — overdue = needs reminder
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
