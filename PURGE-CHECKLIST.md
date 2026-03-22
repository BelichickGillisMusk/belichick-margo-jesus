# PURGE CHECKLIST — Lock Down & Restructure

**Date:** 2026-03-22
**Situation:** Locked out of auth. Agents running on GCP and GitHub Actions without proper constraints. Need to purge uncontrolled agents, keep only constrained ones.

---

## STEP 1: IMMEDIATE — Kill External Agents

### Google Cloud (GCP Project: `mila-claude-2426-487008`)

If you have `gcloud` CLI access:
```bash
# Option A: Delete the entire project (nuclear option — kills everything)
gcloud projects delete mila-claude-2426-487008

# Option B: Disable billing (stops all paid services, keeps project)
gcloud billing projects unlink mila-claude-2426-487008

# Option C: Stop specific services
gcloud run services delete mila-chatbot --project=mila-claude-2426-487008 --region=us-central1
gcloud pubsub topics list --project=mila-claude-2426-487008  # then delete each
gcloud artifacts repositories list --project=mila-claude-2426-487008  # then delete each
```

If CLI doesn't work (locked out):
1. Go to https://console.cloud.google.com/billing — unlink the project
2. Go to https://console.cloud.google.com/iam-admin — revoke all service accounts
3. Go to https://console.cloud.google.com/cloud-resource-manager — shut down project
4. Contact Google Cloud support if completely locked out

### GitHub Actions (in `demo-repository`)

```bash
# Disable ALL workflows
gh workflow disable mila-autonomous.yml -R YOUR_USERNAME/demo-repository
gh workflow disable evening-wrapup.yml -R YOUR_USERNAME/demo-repository
gh workflow disable revenue-report.yml -R YOUR_USERNAME/demo-repository
gh workflow disable calendar-sync.yml -R YOUR_USERNAME/demo-repository
gh workflow disable retention.yml -R YOUR_USERNAME/demo-repository
```

Or via GitHub UI:
1. Go to `demo-repository` → Settings → Actions → General
2. Select "Disable Actions" → Save
3. This stops ALL workflows immediately

### API Keys — Rotate Everything

| Key | Where to Rotate | Priority |
|-----|----------------|----------|
| `ANTHROPIC_API_KEY` | https://console.anthropic.com/settings/keys | **CRITICAL** — delete old, create new |
| `GOOGLE_PLACES_API_KEY` | https://console.cloud.google.com/apis/credentials | HIGH |
| `SLACK_BOT_TOKEN` | https://api.slack.com/apps → Your App → OAuth | HIGH |
| `SLACK_APP_TOKEN` | https://api.slack.com/apps → Your App → App-Level Tokens | HIGH |
| `SLACK_SIGNING_SECRET` | https://api.slack.com/apps → Your App → Basic Information | HIGH |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Delete the service account entirely | MEDIUM |

After rotating: update `.env` file locally with new keys.

---

## STEP 2: AGENT HOMES — Where Each Agent Lives & Is Constrained

Every agent gets ONE home. No wandering. No cloud deployments unless explicitly approved.

### Constrained Agents (KEEP)

| Agent | Name | Home | Runs On | Constrained How |
|-------|------|------|---------|-----------------|
| **Mila CARB** | `mila-carb` | `src/mila-chatbot/` | Local Mac (port 3001) | Sandboxed to CARB knowledge base only. No PII. Haiku model. CSP locked. |
| **Lead Scraper** | `lead-scraper` | `src/lead-scraper/` | Local Mac (CLI) | Public Google Places data only. No personal info. CSV output. Manual trigger only. |
| **Slack Bot** | `slack-recon` | `src/slack-bot/` | Local Mac | Authorized users only. Rate limited (10/hr). Kill switch. Channel isolation. |
| **Salesbot Demo** | `closer-demo` | `salesbot.html` | Browser only | Zero network access. `connect-src 'none'`. No eval. Pattern matching only. |
| **Dashboard** | `agent-roundtable` | `index.html` | Browser only | Pure display. No API calls. No data. |

### Skill-Only Agents (KEEP — configs only, never run autonomously)

| Agent | Name | Home | Activation |
|-------|------|------|------------|
| **Belichick** | `belichick` | `skills/belichick-strategy/` | Only via Slack bot dispatch. Never autonomous. |
| **Mila Legal** | `mila-legal` | `skills/mila-legal/` | Only via Slack bot dispatch. Never autonomous. |
| **Atlas** | `atlas` | `skills/atlas-creative/` | Only via Slack bot dispatch. Never autonomous. |
| **Closer** | `closer` | `skills/closer-sales/` | Only via Slack bot dispatch. Never autonomous. |
| **Lead Scraper Skill** | `gemini-scraper` | `skills/gemini-lead-scraper/` | Only via Slack bot dispatch. Never autonomous. |
| **Slack RECON** | `slack-recon-agent` | `skills/slack-recon-agent/` | Routing config only. Not an agent itself. |
| **TPS Reporter** | `tps-report` | `skills/tps-report/` | Reporting format only. Not an agent itself. |

### Agents to PURGE (running uncontrolled externally)

| Agent | Where It Lives Now | Action |
|-------|-------------------|--------|
| **Mila Autonomous** | GitHub Actions (`demo-repository`) | DISABLE workflow. Runs every 6 hours unsupervised. |
| **Mila Evening Wrap-Up** | GitHub Actions (`demo-repository`) | DISABLE workflow. Creates issues daily. |
| **Mila Revenue Report** | GitHub Actions (`demo-repository`) | DISABLE workflow. Blocked on secrets anyway. |
| **Mila Calendar Sync** | GitHub Actions (`demo-repository`) | DISABLE workflow. Blocked on Google creds anyway. |
| **Mila Retention** | GitHub Actions (`demo-repository`) | DISABLE workflow. Blocked on CSV data anyway. |
| **Mila Cloud Run** | GCP `mila-claude-2426-487008` | DELETE service or disable billing. Built but may be deployed. |

---

## STEP 3: VERIFY PURGE

After completing Steps 1-2, verify:

```bash
# Check no GCP services running
gcloud services list --enabled --project=mila-claude-2426-487008

# Check no GitHub Actions running
gh run list -R YOUR_USERNAME/demo-repository --status=in_progress

# Check Anthropic API usage (should be $0 after rotation)
# Visit: https://console.anthropic.com/settings/usage

# Check Google Cloud billing
# Visit: https://console.cloud.google.com/billing
```

---

## STEP 4: CLEAN START with ClawdBot

Once purged, the only things running are LOCAL on your Mac:

```
YOUR MAC (localhost only)
├── ClawdBot Gateway (clawdbot-config.json5)
│   ├── Bind: 127.0.0.1 ONLY — not internet-facing
│   ├── Port: 18789
│   ├── Max 2 concurrent agents
│   └── Kill switches: timeouts, token caps, billing backoff
│
├── npm run slack    → Slack bot (dispatches constrained agents)
├── npm run mila     → CARB chatbot (port 3001, sandboxed)
├── npm run scrape   → Lead scraper (CLI only, manual trigger)
│
└── Browser demos (zero network, zero risk)
    ├── index.html      → Agent dashboard
    └── salesbot.html   → Sales demo (fully sandboxed)
```

No cloud. No GitHub Actions. No autonomous agents. Everything constrained to your Mac.
