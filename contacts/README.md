# Contacts folder — iPad + Android

Drop these files onto a phone and import. One file per test-week so you can knock out a whole week's callbacks in one sitting.

**Gumption:** [https://gumption.co](https://gumption.co) — also `GUMPTION.url` in both import folders. Details in [GUMPTION.md](GUMPTION.md).

If Android glued everyone into one contact with hundreds of numbers, stop and follow [UNDO-ANDROID.md](UNDO-ANDROID.md) before importing again.

## iPad / iPhone

1. AirDrop `import-ipad/all.vcf` (or a single `YYYY-Www.vcf` if you only want that week).
2. Tap the file → **Add All Contacts**.
3. Each card has the company name, phone, address, and a note: `Tested 2026-W32 (Aug 3–9) · VIN · plate · result`.

Or open the Files app → long-press the `.vcf` → Share → Contacts.

## Android — do not use the old all.vcf

The previous multi-card `.vcf` / old Google CSV is what created the mega-contact. Use one of these instead:

**Safest:** open `import-android/one-each/` and import each `.vcf` (one person per file).

**Google account:** [contacts.google.com](https://contacts.google.com) → **Import** → `import-android/all-google.csv` (uses current Google headers: First Name, Phone 1 - Label, File As).

Do **not** import `call-sheet-by-week.csv`.

## What's in here

| File | What it is |
|------|------------|
| `import-android/one-each/*.vcf` | One person, one file — use this on Android |
| `import-android/all-google.csv` | Google Contacts CSV (new headers) |
| `import-ipad/all.vcf` | Every contact, iOS-safe multi-card |
| `weeks/YYYY-Www.vcf` | Just that week's people |
| `call-sheet-by-week.csv` | VIN + plate + date only — not for Contacts |
| `GUMPTION.url` | Shortcut to Gumption |
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
