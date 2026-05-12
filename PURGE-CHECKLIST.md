# PURGE CHECKLIST — Full Cloud & Startup Audit

**Date:** 2026-03-22
**Situation:** Locked out of auth. Agents and services deployed across multiple clouds without proper constraints. This is the COMPLETE audit of everything that needs to be killed, kept, or reined in.

---

## STEP 1: KILL EVERYTHING EXTERNAL

### 1A. Google Cloud (GCP Project: `mila-claude-2426-487008`)

**What's there:** Cloud Run (Mila chatbot), Pub/Sub, Artifact Registry, Container Registry (deprecated)
**Risk:** Billing-enabled. May be running up charges even idle.

If you have `gcloud` CLI access:
```bash
# NUCLEAR OPTION — delete the entire project
gcloud projects delete mila-claude-2426-487008

# OR just kill billing (safer — can inspect later)
gcloud billing projects unlink mila-claude-2426-487008

# OR surgically remove services
gcloud run services delete mila-chatbot --project=mila-claude-2426-487008 --region=us-central1
gcloud pubsub topics list --project=mila-claude-2426-487008  # then delete each
gcloud artifacts repositories list --project=mila-claude-2426-487008  # then delete each
```

If CLI doesn't work (locked out):
1. https://console.cloud.google.com/billing — unlink the project
2. https://console.cloud.google.com/iam-admin — revoke all service accounts
3. https://console.cloud.google.com/cloud-resource-manager — shut down project
4. Last resort: contact Google Cloud support

---

### 1B. GitHub Actions (in `demo-repository`)

**What's there:** 5 autonomous Mila workflows running on schedules, unsupervised.

| Workflow | Schedule | Status |
|----------|----------|--------|
| `mila-autonomous.yml` | Every 6 hours | RUNNING — costs ~$10/month |
| `evening-wrapup.yml` | Daily 5 PM PT | RUNNING — creates GitHub issues |
| `revenue-report.yml` | Monday 1 AM PT | Blocked on Stripe/PayPal secrets |
| `calendar-sync.yml` | Daily 7 AM PT | Blocked on Google credentials |
| `retention.yml` | Monday 8 AM PT | Blocked on CSV data |

```bash
# Disable ALL workflows
gh workflow disable mila-autonomous.yml -R YOUR_USERNAME/demo-repository
gh workflow disable evening-wrapup.yml -R YOUR_USERNAME/demo-repository
gh workflow disable revenue-report.yml -R YOUR_USERNAME/demo-repository
gh workflow disable calendar-sync.yml -R YOUR_USERNAME/demo-repository
gh workflow disable retention.yml -R YOUR_USERNAME/demo-repository
```

Or via GitHub UI: `demo-repository` → Settings → Actions → General → **Disable Actions** → Save

**This repo** (`belichick-margo-jesus`) has one workflow: `jekyll-docker.yml` — only runs on push to main, just builds static HTML. **Low risk but disable if you want zero cloud:**
```bash
gh workflow disable jekyll-docker.yml -R YOUR_USERNAME/belichick-margo-jesus
```

---

### 1C. Vercel

**Found in:** `ARCHITECTURE.md` line 246 — "The Mila chat widget on your website (proxied through Vercel)"
**What it is:** A Vercel serverless function proxying API calls for the Mila chat widget on your marketing sites.

**To kill:**
1. https://vercel.com/dashboard — find the project
2. Settings → Delete Project (or just remove the deployment)
3. If you can't find it, check: https://vercel.com/account/projects
4. Also check if it's under a team account

**After purge:** The chat widget on your marketing sites will stop working. That's fine — Mila runs locally now via `npm run mila`.

---

### 1D. Cloudflare Workers (Marketing Sites)

**Source:** `cloudflare/sites/<city>/index.html`, generated from `sites-config.json` via `npm run sites:generate`.

| Site | Domain | Content |
|------|--------|---------|
| `cloudflare/sites/hayward/` | `cleantruckcheckhayward.com` | Generated Raiders Silver/Black, phone (415) 900-8563 |
| `cloudflare/sites/roseville/` | `cleantruckcheckroseville.com` | Generated SF Giants Orange/Black, phone (916) 890-4427 |
| `cloudflare/sites/fairfield/` | `cleantruckcheckfairfield.com` | Generated Air Force Academy Blue (light bg), phone (916) 890-4427 |
| `cloudflare/sites/lodi/` | `cleantruckchecklodi.com` | Generated Florida State Garnet (light bg), phone (209) 818-1371 |

**These are STATIC sites — no agents, no API calls, no backend.** They just load Google Fonts. The security headers are already locked down (`connect-src 'self'`). These are safe to keep running.

**Decision:**
- **KEEP** if you want the marketing sites live
- **DELETE** from Netlify dashboard if you want zero external footprint: https://app.netlify.com/

---

### 1E. Make.com (Webhook Automations)

**Found in:** `skills/slack-recon-agent/SKILL.md`, `ARCHITECTURE.md`
**What it is:** Webhook bridge between Slack slash commands and your local Mac.

**To kill:** https://www.make.com/ → Your scenarios → Disable or delete all scenarios

**After purge:** Slack slash commands won't work until Make.com scenarios are re-enabled. The local `npm run slack` bot still works for direct Slack interaction.

---

### 1F. Cloudflare Tunnel / ngrok

**Found in:** `skills/slack-recon-agent/SKILL.md` line 354 — "localhost via Cloudflare Tunnel or ngrok"
**What it is:** Optional tunnel exposing your localhost to the internet for Make.com webhooks.

**Check if running:**
```bash
# Check for running tunnels
ps aux | grep -i cloudflare
ps aux | grep -i ngrok

# Kill if found
pkill -f cloudflared
pkill -f ngrok
```

**To prevent restart:** Remove from login items (System Settings → General → Login Items)

---

## STEP 2: ROTATE ALL KEYS

| Key | Where to Rotate | Priority |
|-----|----------------|----------|
| `ANTHROPIC_API_KEY` | https://console.anthropic.com/settings/keys | **CRITICAL** |
| `GOOGLE_PLACES_API_KEY` | https://console.cloud.google.com/apis/credentials | **HIGH** |
| `SLACK_BOT_TOKEN` | https://api.slack.com/apps → OAuth & Permissions | **HIGH** |
| `SLACK_APP_TOKEN` | https://api.slack.com/apps → App-Level Tokens | **HIGH** |
| `SLACK_SIGNING_SECRET` | https://api.slack.com/apps → Basic Information | **HIGH** |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Delete the service account entirely at https://console.cloud.google.com/iam-admin/serviceaccounts | **HIGH** |
| `STRIPE_SECRET_KEY` | https://dashboard.stripe.com/apikeys (if you set one up) | **CHECK** |
| `PAYPAL_CLIENT_ID/SECRET` | https://developer.paypal.com/dashboard/applications (if set up) | **CHECK** |

After rotating: update your local `.env` file with new keys only.

---

## STEP 3: CHECK MAC STARTUP ITEMS

Make sure nothing auto-starts agents when you reboot:

```bash
# Check login items
ls ~/Library/LaunchAgents/
ls /Library/LaunchAgents/
ls /Library/LaunchDaemons/

# Check for pm2 processes
pm2 list 2>/dev/null

# Check for running node processes (agents)
ps aux | grep node

# Check for Docker containers
docker ps 2>/dev/null

# Check crontab
crontab -l

# Check for ngrok/cloudflare tunnels
ps aux | grep -E "ngrok|cloudflare"
```

Kill anything suspicious. Remove any launch agents you didn't create.

---

## STEP 4: VERIFY THE PURGE

Run these checks to confirm everything is dead:

```bash
# 1. GCP — should return error or empty
gcloud services list --enabled --project=mila-claude-2426-487008

# 2. GitHub Actions — should show no active runs
gh run list -R YOUR_USERNAME/demo-repository --status=in_progress

# 3. Anthropic — check usage is $0
# Visit: https://console.anthropic.com/settings/usage

# 4. Google Cloud billing — should show $0
# Visit: https://console.cloud.google.com/billing

# 5. Vercel — should show no deployments
# Visit: https://vercel.com/dashboard

# 6. Netlify — check if sites are still deployed (optional to keep)
# Visit: https://app.netlify.com/

# 7. Make.com — should show no active scenarios
# Visit: https://www.make.com/

# 8. Local Mac — should show no rogue processes
ps aux | grep -E "node|ngrok|cloudflare" | grep -v grep
```

---

## STEP 5: CLEAN RESTART

After everything is purged and keys are rotated, the ONLY things that should exist:

```
YOUR MAC (localhost only, nothing internet-facing)
├── ClawdBot Gateway (clawdbot-config.json5)
│   ├── Bind: 127.0.0.1 ONLY
│   ├── Port: 18789
│   ├── Max 2 concurrent agents
│   └── Kill switches: timeouts, token caps, billing backoff
│
├── npm run slack    → Slack bot (dispatches constrained agents)
├── npm run mila     → CARB chatbot (port 3001, sandboxed)
├── npm run scrape   → Lead scraper (CLI only, manual trigger)
│
├── Browser demos (zero network, zero risk)
│   ├── index.html      → Agent dashboard
│   └── salesbot.html   → Sales demo (fully sandboxed)
│
└── OPTIONAL (your choice to keep or kill):
    ├── Netlify: carbteststockton.com (static HTML, no backend)
    ├── Netlify: cleantruckcheckroseville.com (static HTML, no backend)
    └── Make.com: Slack webhook bridge (only if you re-enable)
```

No GCP. No Vercel. No GitHub Actions. No autonomous agents. No tunnels.
Everything starts and stops on YOUR Mac, under YOUR control.
