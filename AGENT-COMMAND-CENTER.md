# AGENT COMMAND CENTER — ClawdBot Roster

**Last Updated:** 2026-08-31
**Status:** Active. Node.js bots local-only (Slack, Mila). Samantha on Cloud Run. Boardroom UI on Cloudflare.

---

## Boardroom — Internal Agent Command UI

The Boardroom is the browser-based office interface for dispatching agent plans and tracking tasks.

- **URL:** https://boardroom.bryanoneillgillis.com (private, Cloudflare Access)
- **Source:** `cloudflare/sites/boardroom/index.html`
- **Full docs:** [`cloudflare/sites/boardroom/BOARDROOM.md`](cloudflare/sites/boardroom/BOARDROOM.md)

Key features added in July 2026:
- **Task Dashboard** — browser-persisted (`localStorage`) task tracker; auto-populates from solo dispatches
- **File attachments** — attach `.md` (text extracted) or `.pdf` (downloadable) to any task
- **Solo mode** — defaults to single-agent (Samantha); click `[solo]` for instant per-agent dispatch
- **Solid Agents panel** — Mila (Creative & CX), Sloane (Content & SEO), Elon (Bold Execution)
- **Hermes Superpowers** — full Hermes v0.18+ CLI capabilities in generated plans
- **Communication Webapp** — SMS / GChat / Slack / WhatsApp form via Hermes

The boardroom generates execution plans locally (no API calls) for copying to the agent CLI or Slack.

---

## Quick Start (After Key Rotation)

```bash
# 1. Fill in your new rotated keys
cp .env.example .env
# Edit .env with your new keys

# 2. Install dependencies
npm install

# 3. Pick what you want to run:
npm run slack      # Slack bot — dispatches agents via slash commands
npm run mila       # Mila CARB chatbot — localhost:3001
npm run samantha   # Samantha service — localhost:8080
npm run scrape     # Lead scraper — one-shot CLI tool
```

---

## THE ROSTER — Every Agent, Where It Lives, What It Can't Do

### RUNNING AGENTS

---

#### 1. MILA CARB — Customer Service Bot
| | |
|---|---|
| **Home** | `src/mila-chatbot/index.js` |
| **Skill** | `skills/mila-carb-cs/SKILL.md` |
| **Start** | `npm run mila` |
| **Runs On** | localhost:3001 (dev) or Cloud Run (prod) |
| **Backend** | Vertex AI — Claude Haiku (`claude-haiku-4-5@20251001`) |
| **Auth** | Google ADC (Cloud Run service account in prod; `gcloud auth application-default login` locally) |
| **Knowledge** | `skills/mila-carb-cs/references/clean-truck-check-complete.md` |

**What she does:**
- Answers CARB Clean Truck Check compliance questions
- Provides testing deadlines, fees, requirements
- Directs to CARB portal for payments/lookups

**What she CAN'T do:**
- Access vehicle databases
- Process payments
- Give legal advice
- Collect PII beyond name/email
- Make outbound network calls (CARB knowledge only)
- Run autonomously (manual start only)

**Endpoints:**
| Path | Description |
|------|-------------|
| `POST /chat` | Main chat — accepts `{ message, history?, lead? }` |
| `GET /health` | Always works; reports `backend: "vertex-ai"` |
| `GET /tps` | Auth-gated agent status (requires `x-tps-token` header) |
| `GET /widget` | Embeddable chat UI |
| `DELETE /session/:id` | Clears a session |

**Guardrails:**
> ONLY answer about Clean Truck Check, CARB compliance, and related regulations. NEVER give legal advice. NEVER process payments. NEVER access vehicle databases directly. ALWAYS disclose you are an AI assistant.

---

#### 2. SAMANTHA — Cloud Run Executive Assistant
| | |
|---|---|
| **Home** | `src/samantha/index.js` |
| **Skill** | `skills/samantha-ops/SKILL.md` |
| **Start** | `npm run samantha` |
| **Runs On** | Cloud Run (`samantha` GCP project, `us-east5`) |
| **Backend** | Vertex AI — Claude Haiku (`claude-haiku-4-5@20251001`) |
| **Auth** | Google ADC (Cloud Run service account in prod; `gcloud auth application-default login` locally) |
| **Deploy** | Auto via `.github/workflows/deploy-samantha-cloud-run.yml` on push to `main` |

**What she does:**
- Answers road-side business queries (sales, scheduling, CRM)
- Routes to Mila for CARB compliance questions
- Responds as `samantha` (default) or `condoleezza` persona
- Hosts a phone-friendly PWA widget installable from iOS/Android home screen

**Endpoints:**
| Path | Description |
|------|-------------|
| `POST /api/samantha/chat` | Chat — rate-limited 20 req/min; accepts `{ message, history?, persona? }` |
| `GET /api/samantha/status` | Anonymous: `{ ready, timestamp }`; with `x-samantha-token`: full diagnostic |
| `GET /` or `/widget` | PWA chat widget (cached 5 min) |
| `GET /health` | Always works; reports `backend: "vertex-ai"` |

**Personas:**
| Persona | Description |
|---------|-------------|
| `samantha` | Default — executive assistant, friendly, brief |
| `condoleezza` | Authoritative, direct, road-focused; same capabilities |

**Local dev setup:**
```bash
gcloud auth application-default login
ANTHROPIC_VERTEX_PROJECT_ID=samantha CLOUD_ML_REGION=us-east5 npm run samantha
```

**What she CAN'T do:**
- Run without Vertex AI credentials
- Access vehicle databases or process payments
- Collect SSNs or credit card numbers

---

#### 3. SLACK BOT — Agent Dispatch Center
| | |
|---|---|
| **Home** | `src/slack-bot/index.js` |
| **Agents** | `src/slack-bot/agents.js` |
| **Dispatch** | `src/slack-bot/dispatch.js` |
| **Skill** | `skills/slack-recon-agent/SKILL.md` |
| **Start** | `npm run slack` |
| **Runs On** | Local Mac (Slack Bolt socket mode) |
| **Model** | Routes to Haiku/Sonnet per agent (via `ANTHROPIC_API_KEY`) |

**What it does:**
- Receives `/recon-*` slash commands from Slack
- Dispatches the right agent for the task
- Posts results back to the right channel
- Tracks active missions, enforces timeouts

**Slash Commands:**
| Command | Agent(s) | Channel |
|---------|----------|---------|
| `/recon-leads [query]` | Lead Scraper | #recon-leads |
| `/recon-legal [topic]` | Sentinel + Mila-Legal | #recon-legal |
| `/recon-market [industry]` | Kesha + Musk | #recon-market |
| `/recon-compliance [vin]` | Mila-CARB | #recon-compliance |
| `/recon-prospect [company]` | Jon Jones + Lead Scraper | #recon-sales |
| `/swarm [preset|agent,agent,...] \| task` | Configurable squad (default `intel`) | Channel where dispatched |
| `/agent-status` | Belichick | #agent-status |
| `/roster` | — (instant, no API) | Prints roster |
| `/dispatch [agent] [task]` | Any agent | Varies |
| `/budget` | Cipher | #alerts |
| `/kill [agent]` | Belichick | Kills agent |

**What it CAN'T do:**
- Run without your Slack tokens
- Dispatch more than 2 missions concurrently
- Run more than 10 missions/hour
- Fan out a swarm wider than `SLACK_SWARM_MAX_AGENTS` (default 8) or with parallelism above `SLACK_SWARM_PARALLELISM` (default 3)
- Post to channels outside its map
- Run autonomously (manual start only)

**Swarm presets (used by `/swarm` and the *Swarm pulse* button):**
| Preset | Squad | Use For |
|--------|-------|---------|
| `full` | All agents | "Brain trust" — every specialist weighs in |
| `intel` (default) | Kesha + Musk + Sentinel + Mila-Legal | Market & legal triangulation |
| `ops` | Samantha + DataSync + Website Helper | Day-to-day execution review |
| `revenue` | Jon Jones + Lead Scraper + FinBot + Cipher | Pipeline + money pass |
| `compliance` | Mila-CARB + Mila-Legal + Sentinel + DataSync | CARB question deep dive |

Custom squads work too: `/swarm samantha,jon-jones,musk | should we send a new outbound campaign this week?`

**Guardrails:**
> Authorized users only. Max 10 missions/hour, 2 concurrent. No PII in Slack. Kill switch via `/kill`. Channel isolation enforced.

---

#### 4. LEAD SCRAPER — Google Places Lookup
| | |
|---|---|
| **Home** | `src/lead-scraper/index.js` |
| **Skill** | `skills/gemini-lead-scraper/SKILL.md` |
| **Start** | `npm run scrape -- "query" "location"` |
| **Runs On** | Local Mac (CLI, one-shot) |
| **Model** | N/A (Google Places API direct) |

**What it does:**
- Searches Google Places API for businesses
- Pulls public info: name, phone, address, rating, hours
- Outputs to Google Sheets (if configured) or console + CSV

**What it CAN'T do:**
- Scrape personal info or home addresses
- Run on a schedule (manual CLI trigger only)
- Make calls or send emails
- Run autonomously

**Guardrails:**
> ONLY collect publicly available business information. Do NOT scrape personal phone numbers or home addresses. Comply with Google ToS. Do NOT use for spam.

---

### BROWSER-ONLY DEMOS (zero network, zero risk)

---

#### 5. SALESBOT DEMO — The Office
| | |
|---|---|
| **Home** | `salesbot.html` |
| **Start** | Open in browser |
| **Network** | `connect-src 'none'` — ZERO outbound calls |

**Security:** Blocks eval, fetch, XMLHttpRequest, WebSocket, dynamic scripts. Pattern-matching only. No API. No data leaves the browser.

---

#### 6. AGENT DASHBOARD — Round Table
| | |
|---|---|
| **Home** | `index.html` |
| **Start** | Open in browser |
| **Network** | None — pure display |

**What it is:** Visual status display for all agents. Click to cycle states. No data, no API calls.

---

### SKILL-ONLY AGENTS (never run alone — only via Slack bot dispatch)

These are PROMPT CONFIGS, not running processes. They only activate when the Slack bot dispatches them.

| # | Agent | Skill File | Role | Model | Key Constraint |
|---|-------|-----------|------|-------|----------------|
| 7 | **Belichick** | `skills/belichick-strategy/SKILL.md` | Strategy, delegation | Opus/Gemini | Never greenlights without legal review. Keeps human in loop. |
| 8 | **Mila Legal** | `skills/mila-legal/SKILL.md` | Law & regulation research | Gemini/Opus | Never suggests illegal activity. Always cites statutes. |
| 9 | **Atlas/Musk** | `skills/musk-creative/SKILL.md` | YouTube, creative, SEO | Gemini/Sonnet | No misleading clickbait. Respects copyright. Can't publish. |
| 10 | **Jon Jones** | `skills/jonjones-sales/SKILL.md` | Sales, objection handling | Gemini/Sonnet | **FULLY SANDBOXED.** No external API calls. No PII collection. Products from config only. |
| 11 | **Sentinel** | Uses `mila-legal` skill | Deep legal/regulatory analysis | Opus | Same constraints as Mila Legal. |
| 12 | **Cipher** | Not yet implemented | Finance, bookkeeping | Sonnet | Planned — not active. |
| 13 | **TPS Reporter** | `skills/tps-report/SKILL.md` | Status reporting format | N/A | Framework only. $1+ flag before starting. $70/month cap. |

---

### STATIC MARKETING SITES (Netlify — your choice to keep)

| Site | Domain | What It Is | Risk |
|------|--------|-----------|------|
| `carbteststockton/` | `carbteststockton.com` | Static HTML marketing page. No backend. Loads Google Fonts only. | **NONE** — pure HTML |
| `cleantruckcheckroseville/` | `cleantruckcheckroseville.com` | Static HTML marketing page. No backend. Phone is PLACEHOLDER. | **NONE** — pure HTML |

Both have security headers: `X-Frame-Options: DENY`, `connect-src 'self'`, no eval.
Manage at: https://app.netlify.com/

---

## SERVICES — Active vs Dead

### Active cloud services

| Service | What It Is | GCP Project |
|---------|-----------|-------------|
| **Samantha Cloud Run** | Executive AI assistant (Vertex AI backend) | `samantha` |
| **Mila Cloud Run** | CARB chatbot (Vertex AI backend) | `samantha` |
| **Artifact Registry** | Docker image storage for Cloud Run deploys | `samantha` |

### Dead (post-purge)

| Service | What Was There | Status |
|---------|---------------|--------|
| **Old Mila Cloud Run** | First-gen Mila chatbot (`mila-claude-2426-487008`, Anthropic API) | KILLED |
| **GCP Pub/Sub** | Auto-enabled with old Cloud Run | KILLED |
| **GCP Container Registry** | Deprecated registry (pre-Artifact Registry) | KILLED |
| **GitHub Actions** (demo-repo) | 5 autonomous Mila workflows | DISABLED |
| **Vercel** | Mila chat widget proxy | KILLED |
| **Make.com** | Slack webhook bridge | DISABLED |
| **Cloudflare Tunnel/ngrok** | Localhost exposure | KILLED |

---

## NETWORK ACCESS SUMMARY

| What | Allowed | Direction |
|------|---------|-----------|
| Vertex AI (Claude via GCP) | Yes, Cloud Run + local ADC | Cloud Run / Mac → aiplatform.googleapis.com |
| Anthropic API (Claude direct) | Yes, Slack bot only | Mac → api.anthropic.com |
| Slack API (bot) | Yes, local only | Mac → slack.com |
| Google Places API | Yes, manual trigger only | Mac → maps.googleapis.com |
| Google Sheets API | Yes, manual trigger only | Mac → sheets.googleapis.com |
| Google Fonts | Yes, static sites only | Browser → fonts.googleapis.com |
| Everything else | **NO** | — |

---

## ENV VARIABLES NEEDED

```bash
# Required for Slack bot (Anthropic SDK — direct API, not Vertex)
SLACK_BOT_TOKEN=xoxb-YOUR-NEW-TOKEN
SLACK_APP_TOKEN=xapp-YOUR-NEW-TOKEN
SLACK_SIGNING_SECRET=YOUR-NEW-SECRET
ANTHROPIC_API_KEY=sk-ant-YOUR-NEW-KEY

# Required for Mila (Vertex AI — NOT ANTHROPIC_API_KEY)
ANTHROPIC_VERTEX_PROJECT_ID=samantha
CLOUD_ML_REGION=us-east5

# Required for Samantha (Vertex AI — same as Mila)
# ANTHROPIC_VERTEX_PROJECT_ID and CLOUD_ML_REGION shared above
SAMANTHA_STATUS_TOKEN=your-status-token   # optional; auth-gates /api/samantha/status

# Optional — routes Slack DM @Samantha to Cloud Run service
SAMANTHA_URL=https://samantha-XXXXXX-uc.a.run.app

# Required for Lead Scraper
GOOGLE_PLACES_API_KEY=YOUR-NEW-KEY

# Optional (Google Sheets export)
GOOGLE_SHEETS_ID=your-spreadsheet-id
GOOGLE_SERVICE_ACCOUNT_KEY=./google-service-account.json

# Optional (Mila chatbot port, defaults to 3001)
MILA_PORT=3001
```

> **Local Vertex AI auth:** Run `gcloud auth application-default login` before starting Mila or Samantha locally. On Cloud Run, the service account provides credentials automatically.
