# Undo the mega-contact (one name, hundreds of numbers)

Android / Google Contacts imported the old multi-card file as **one contact**. Delete that blob, then re-import the split files.

## If you imported through Google Contacts (most likely)

1. On a laptop open [contacts.google.com](https://contacts.google.com)
2. Left sidebar → **Undo import** (or Settings → Undo import)
3. Pick the import from this week → **Undo**
4. That removes the mega-contact and every number it swallowed
5. Re-import **only** `import-android/all-google.csv` (new headers) **or** drop the files in `import-android/one-each/` one at a time

Do **not** import `call-sheet-by-week.csv`. That file is VIN/plate/date only — it is not a contact list.

## If the mega-contact is only on the phone (Samsung / Pixel, no Google undo)

1. Open Contacts → search for the blob (often named after the first company, or "NCM", or has 100+ numbers)
2. Open it → **Delete** (this deletes that one card, not your real people — their numbers live only on that card)
3. Re-import from `import-android/one-each/` — **one `.vcf` per person**. Samsung will not glue those together.

## Then use the new files

| Do this | File |
|---|---|
| Android, safest | `import-android/one-each/*.vcf` (one person per file) |
| Android, Google account | `import-android/all-google.csv` (new First Name / Phone 1 - Label headers) |
| iPad | `import-ipad/all.vcf` (still fine — iOS splits cards correctly) |

Each card now has its own `UID` and a structured `N:` name so a future multi-file import cannot collapse them again.
