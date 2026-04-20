# FILE-INDEX — HTML/Doc Inventory

Personal lookup so Bryan doesn't recreate files that already exist.
Files are **not renamed or deleted** — use the Recommendation column to
mark each row **K** (keep), **D** (delete), or **R** (review).

- **Scan window:** 2025-06-01 → 2026-04-19
- **Last scanned:** 2026-04-19
- **Sources scanned:** repo (`belichick-margo-jesus`) + Google Drive (connected accounts: `admin@mobilecarbsmoketest.com`, `bryan@norcalcarbmobile.com`)
- **Sources NOT scanned:** MacBook Air filesystem, iCloud Drive, local backups, the Drive folder `1IZkdRXC0NM3-...` — see "Gaps" at bottom

---

## 1. Local repo HTML files (2) — all **KEEP**

| Path | Purpose | Size |
|------|---------|------|
| `index.html` | **Agent Round Table** dashboard — 11-agent status UI (title: "Team Status - Round Table"). Referenced in CLAUDE.md. | 29 KB |
| `salesbot.html` | **The Office** — CSP-hardened Closer sales-bot demo. Do not modify CSP. | 26 KB |

### Deleted 2026-04-19 (not the new mobilecarbsmoketest.com template)

- `carbteststockton/` — old Stockton landing page (cream/brown Playfair theme). Rebuild as its own Cloudflare Worker from the mobilecarbsmoketest.com template with only phone / colors / price / local info swapped.
- `cleantruckcheckroseville/` — old Roseville landing page (Inter dark/orange theme). Same — rebuild as its own Worker.

⚠ Until Worker replacements are live, `carbteststockton.com` and `cleantruckcheckroseville.com` will 404.

---

## 2. Google Drive — `_DR. GILLIS` folder

Folder: [_DR. GILLIS](https://drive.google.com/drive/folders/1BNfRFl3EH4cL61UEDBVCEyXgC6F1-oQO)

### 🚨 2a. The duplication problem (action needed)

**21 files named "Copy of index.html" all created TODAY (2026-04-19 15:58)** — looks like a bulk-copy accident. Sizes range 236 B → 38 KB. Likely should all be deleted unless Bryan created them intentionally.

**35+ other `index.html` files** in `_DR. GILLIS` root, dating Jul 2025 → Feb 2026. Same filename, different content snapshots over time. Likely iterative drafts of the same landing page. Most small (345 B – 16 KB), a few larger (38 KB, 16 KB, 11 KB).

**Recommendation:** consolidate — open the largest/most recent few, decide which one is "current", archive or delete the rest. Mass-deleting the 21 same-day "Copy of" duplicates is safe if you didn't intend them.

Full list of `index.html` + `Copy of index.html` files (60+ items) is captured in the Drive search; paste "title='Copy of index.html' or title='index.html'" into Drive search to see them directly.

### 2b. Purpose-named HTML files (easier to categorize)

| Title | Size | Modified | Recommendation |
|-------|------|----------|----------------|
| `norcal-carb-dashboard.html` | 43 KB | 2026-01-17 | **Keep** — looks like a real dashboard |
| `Pw is 11111 GR_Trucking_Fleet_Portal.html` | 48 KB | 2026-01-23 | **Review** — password hint in filename is a security smell; rename or remove |
| `carb_smoke_test_form.html` | 10 KB | 2026-01-17 | **Keep** — intake form |
| `app and c-money carb_smoke_test_form.html` | 10 KB | 2026-01-17 | **Review** — identical size, likely duplicate of above |
| `index.ts.html` | 6 KB | 2025-11-06 | **Review** |
| `index.html.zip` | 8 KB | 2025-12-21 | **Review** — stray archive |
| `index.html.jar` | 1.5 KB | 2025-12-20 | **Review** — stray archive |
| `Mobile CARB - Compliance Made Clear.mht` | 51 KB | 2026-01-21 | **Keep** — web page snapshot |
| `FX4100.mht` | 116 KB | 2026-01-21 | **Review** — FX4100 spec snapshot |
| `Thank You _ NorCal CARB Mobile.mhtml` | 16 KB | 2026-02-21 | **Keep** (1 of 2) |
| `Thank You _ NorCal CARB Mobile.jpg.mhtml` | 16 KB | 2026-02-21 | **Review** — same size, likely duplicate |

### 2c. Business data (non-HTML, summary only)

- **Contacts / CRM:** `contacts.vcf` (1 MB), `contacts (1).vcf` (1 MB, dup), `NorCal_Master_CRM_Complete.xlsx`, `MASTER_VIN_DATABASE_622_20260102` (sheet + CSV), `mila_contacts.csv`, `MIla_contacts_2026-02-02.csv.csv` (+ `.numbers` version), `compliantfleetlookup (1).numbers` (5 MB)
- **Financials:** `Year1_Deductions_Investments.xlsx`, `stripe.sheets`, `NorCal_2025_Tax_Package.xlsx`, 7 PayPal PDF statements in `PayPal again/`, 2 `paypal statement 1.txt`/`2/3/4/6.PDF` copies
- **Strategy docs:** `UNDEFEATED_Look_Ahead_2026-04-16.pdf`, `UNDEFEATED_Strategic_Briefing_2026-04-16.pdf`, `DR GILLIS CEO AI PROMPTS Jan 2026` (doc), `2.10.26 NorCal Work Group.pdf`
- **Google Search Console exports:** 4 subfolders (`...Coverage-2025-09-28`, `...2025-11-01`, `...Performance-on-Search-2025-09-12`, `...2025-12-22`, `...Coverage-Drilldown-...`) each with the usual tiny Chart.csv / Metadata.csv / Queries.csv / Pages.csv / Filters.csv / Devices.csv / Countries.csv / Critical issues.csv / Non-critical issues.csv — safe to archive after ~90 days
- **Takeout archives:** 10 huge ZIPs (~40 GB total) in `FOR CRM CLAUDE RAW UPLOAD INVOICES/Takeout/` — Google Takeout dumps; archive to external drive when done processing
- **Claude working folder:** `Claude/` has `FILES-MANIFEST.md`, `README (1).md`, `DEPLOYMENT-CHECKLIST (1).md`, `EXECUTIVE-SUMMARY (1).md`, `carbcheck-optimized (1).zip`
- **Shortcuts / duplicates:** ~15 Google Drive shortcut files ("prompt.js", "prompt.ts", "Competive Analysis 10/19", etc.) all created 2026-01-09 — cleanup candidates if originals still accessible
- **Misc:** `SKY_ROCK_CARB_ENTRY.txt` + `SKY_ROCK_CARB_ENTRY copy.txt` (identical), `CRM Stuff 12:28.savedSearch` × 2 (identical), 6 `crmf.h` files (all 20 KB identical) created same day 2025-12-21 — mass-dedup candidates
- **Images:** `Silverback.jpg`, `Silverback on Moon.jpg`, `silverback on moon.jpeg` (dup), `silveraiagency.png`, `grok_image_j7psvt.jpg` × 2 (one is 0-byte broken), `chrome_qrcode_1765081721073.png`, `Copy of Engine Number 1/2.jpg` + `Engine Number 1/2.jpg` (dups)

---

## 3. Gaps (not scanned — need your action to unblock)

| Source | Why blocked | How to unblock |
|---|---|---|
| **MacBook Air filesystem** (`~`, `/Applications`, `/Volumes`) | This Claude Code session runs in a Linux container — no access to Mac disk. | Install Claude Code on the Mac (`brew install claude-code`), `cd ~`, run `claude`, ask me to re-run this inventory. Or run the `find` command below and paste the output. |
| **iCloud Drive** | Same — no iCloud filesystem mounted in this container. | Sync iCloud Drive folder locally on Mac, then run Claude Code there. |
| **Mac Time Machine / backup files** | Same. | Access via Mac directly. |
| **Drive folder `1IZkdRXC0NM3-5bK-1_8DsX_tB38mpqWv`** | Shared but still returns 404 to the connected MCP accounts — likely shared with a different Google account, or propagation delay. | Re-share explicitly with `admin@mobilecarbsmoketest.com` or `bryan@norcalcarbmobile.com`, then ask me to re-scan. |

### Mac scan one-liner (run locally)

```bash
find ~ /Applications /Volumes \
  -type f \( -iname '*.html' -o -iname '*.htm' \) \
  -newermt '2025-06-01' \
  -not -path '*/node_modules/*' \
  -not -path '*/Library/Caches/*' \
  -not -path '*/.Trash/*' \
  -printf '%p\t%s\t%TY-%Tm-%Td\n' 2>/dev/null | sort
```

### iCloud + Downloads + Desktop scan (broader)

```bash
find ~/Downloads ~/Desktop ~/Documents "~/Library/Mobile Documents/com~apple~CloudDocs" \
  -type f \
  -newermt '2025-06-01' \
  -size +1c \
  -not -path '*/.Trash/*' \
  -printf '%p\t%s\t%TY-%Tm-%Td\n' 2>/dev/null | sort
```

---

## 4. How to use this file

1. Open this file, skim — especially **Section 2a** (the 21 same-day duplicates are the fastest win).
2. For each row, mark **K** / **D** / **R** in your own notes.
3. Before building a new page or doc, search this file first.
4. To re-run the scan: ask Claude to "update FILE-INDEX.md with fresh Drive + Mac scan".
