# Contacts folder — iPad + Android

Drop these files onto a phone and import. One file per test-week so you can knock out a whole week's callbacks in one sitting.

## iPad / iPhone

1. AirDrop `import-ipad/all.vcf` (or a single `YYYY-Www.vcf` if you only want that week).
2. Tap the file → **Add All Contacts**.
3. Each card has the company name, phone, address, and a note: `Tested 2026-W32 (Aug 3–9) · VIN · plate · result`.

Or open the Files app → long-press the `.vcf` → Share → Contacts.

## Android

**Option A (easiest):** open `import-android/all-google.csv` in Google Contacts on the phone or at [contacts.google.com](https://contacts.google.com) → **Import**. Group membership is `NCM ::: 2026-W32` so you can filter by week.

**Option B:** open any `.vcf` in `import-ipad/` — Android Contacts imports vCard 3.0 natively.

## What's in here

| File | What it is |
|------|------------|
| `all.vcf` | Every contact that has a phone or email |
| `all-google.csv` | Same list, Google Contacts CSV |
| `weeks/YYYY-Www.vcf` | Just that week's people (iPad) |
| `weeks/YYYY-Www.csv` | Just that week's people (Android) |
| `call-sheet-by-week.csv` | Every test (VIN + plate + date) even when we don't have a name yet |
| `SUMMARY.md` | Week-by-week counts |

## Refresh after you export the Drive sheets

The `.gsheet` / `.gdoc` files are shortcuts, not data. On a laptop:

1. Open each Google file
2. **File → Download → Comma-separated values (.csv)**
3. Drop them here:

```
reports/inputs/stripe.csv         ← NCM-STRIPE — SS NorCal
reports/inputs/invoices.csv       ← CLIENTS INVOICE SIMPLE
reports/inputs/squarespace.csv    ← Squarespace orders
reports/inputs/crm.csv            ← Master CRM
reports/inputs/sms-leads.csv      ← INCOMING-SMS-LEADS (already loaded)
reports/inputs/tests.xlsx         ← 8.15 Export TESTS (already loaded)
```

4. Run `npm run contacts`

New rows merge on phone or email. Week tags come from the CARB test date, not the invoice date — so a truck tested the week of Aug 3 shows up in that week's call file even if you invoiced later.
