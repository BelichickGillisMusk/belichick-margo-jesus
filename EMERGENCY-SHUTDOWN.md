# Emergency Shutdown Checklist

**Created:** 2026-03-03
**Reason:** Bots/agents may be making uncontrolled Google API calls or racking up GCP charges.

---

## PRIORITY 1: Stop the bleeding (do these first)

### 1. Google Cloud Console — Disable billing (FASTEST KILL SWITCH)

**Go to:** console.cloud.google.com > Billing
**Project:** `mila-claude-2426-487008`

- **Disable billing entirely** to freeze ALL Google API usage immediately
- Or: set a hard budget cap at $10/month with alerts at $5 and $10

### 2. Google Cloud Console — Disable unnecessary services

**Go to:** console.cloud.google.com > APIs & Services > Dashboard

- **Disable Container Registry** — deprecated, paying for storage for nothing
- **Disable Cloud Run** — Mila Cloud Run was built but NOT deployed as of Feb 13
- **Disable Pub/Sub** — not in active use
- **Disable Artifact Registry** — if no containers are stored
- **Check API usage:** look at request counts for last 24 hours. If Google Places API shows thousands of requests, something is looping.

### 3. Make.com — Pause ALL scenarios

**Go to:** make.com > Scenarios

- **Pause/turn off ALL scenarios**
- Check execution history for runaway loops (thousands of executions)
- Look specifically for any scenario that triggers the Lead Scraper or calls Google APIs

---

## PRIORITY 2: Check what's actually running

### 4. GitHub Actions — Review active workflows

**Go to:** github.com/BelichickGillisMusk/belichick-margo-jesus > Actions tab

Running workflows as of last check:
- Mila Autonomous (every 6 hours)
- Mila Evening Wrap-Up (daily 5 PM PT)
- Mila Revenue Report (Monday 1 AM) — blocked, missing API keys
- Mila Calendar Sync (daily 7 AM) — blocked, missing Google credentials

**To disable:** Click workflow > "..." menu > "Disable workflow"

### 5. Google Admin Console — OAuth app review

- Revoke OAuth access for any apps you don't recognize
- Look specifically for Make.com, OpenClaw, or bot-related OAuth grants

---

## PRIORITY 3: After things are calm

### 6. Decide what to keep

| Keep | Maybe | Remove |
|------|-------|--------|
| Mila CARB CS (revenue bot) | Mila Autonomous (GitHub Actions) | Everything else |
| Landing pages (Cloudflare, free) | Evening Wrap-Up | Unused GCP services |
| | | Make.com scenarios that loop |

### 7. Come back to the repo and clean up

Once you know what's working and what's not:
- Remove unused skill definitions from `skills/`
- Clean up `openclaw-config.json5`
- Update `TPS-REPORTS.md`
- Start fresh with only what you need

---

## What's NOT urgent (costs nothing, ignore for now)

- **Landing pages** on Cloudflare (`carbteststockton/`, `cleantruckcheckroseville/`) — static HTML, no API calls
- **salesbot.html** and **index.html** — local prototype files, do nothing
- **Skill SKILL.md files** in the repo — just text files, don't run by themselves
- **OpenClaw config** — set to localhost only, OpenClaw is not installed

---

## Key numbers

| Item | Value |
|------|-------|
| Monthly budget target | $70 ($50 Claude + $20 Cloud Run) |
| Google Places free tier | $200/month credit (~5,000 searches) |
| GCP Project | `mila-claude-2426-487008` |
| Actually running | 2-3 GitHub Actions workflows (~$0.50/week) |
| Agent skills in repo | 8 defined, 0 running via OpenClaw (not installed) |
| OpenClaw status | NOT installed on Mac yet |
