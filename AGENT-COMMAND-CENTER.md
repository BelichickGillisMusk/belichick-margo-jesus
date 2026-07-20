# AGENT COMMAND CENTER — ClawdBot Roster

**Last Updated:** 2026-07-20
**Status:** Three local surfaces (Slack, Mila, Scraper) + one Cloud Run service (Samantha).

---

## Quick Start

```bash
# 1. Fill in your keys
cp .env.example .env
# Edit .env with your keys

# 2. Install dependencies
npm install

# 3. Pick what you want to run:
npm run slack     # Slack bot — dispatches agents via slash commands
npm run mila      # Mila CARB chatbot — localhost:3001
npm run scrape    # Lead scraper — one-shot CLI tool

# Samantha runs on Cloud Run (not locally). See the Samantha section below.
# For local dev of Samantha: npm run samantha (requires gcloud ADC)
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
| **Runs On** | localhost:3001 |
| **Model** | Claude Haiku (`claude-haiku-4-5-20251001`) |
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

**Guardrails:**
> ONLY answer about Clean Truck Check, CARB compliance, and related regulations. NEVER give legal advice. NEVER process payments. NEVER access vehicle databases directly. ALWAYS disclose you are an AI assistant.

---

#### 2. SLACK BOT — Agent Dispatch Center
| | |
|---|---|
| **Home** | `src/slack-bot/index.js` |
| **Agents** | `src/slack-bot/agents.js` |
| **Dispatch** | `src/slack-bot/dispatch.js` |
| **Skill** | `skills/slack-recon-agent/SKILL.md` |
| **Start** | `npm run slack` |
| **Runs On** | Local Mac (Slack Bolt socket mode) |
| **Model** | Routes to Haiku/Sonnet per agent |

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
| `/swarm [preset|agent,agent,...] | task` | Configurable squad (default `intel`) | Channel where dispatched |
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
| `full` | All 12 operational agents | "Brain trust" — every specialist weighs in |
| `intel` (default) | Kesha + Musk + Sentinel + Mila-Legal | Market & legal triangulation |
| `ops` | Samantha + DataSync + Website Helper | Day-to-day execution review |
| `revenue` | Jon Jones + Lead Scraper + FinBot + Cipher | Pipeline + money pass |
| `compliance` | Mila-CARB + Mila-Legal + Sentinel + DataSync | CARB question deep dive |

Custom squads work too: `/swarm samantha,jon-jones,musk | should we send a new outbound campaign this week?`

**Guardrails:**
> Authorized users only. Max 10 missions/hour, 2 concurrent. No PII in Slack. Kill switch via `/kill`. Channel isolation enforced.

---

#### 3. LEAD SCRAPER — Google Places Lookup
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

#### 4. SAMANTHA — Cloud Run Executive Assistant
| | |
|---|---|
| **Home** | `src/samantha/index.js` |
| **Config** | `src/samantha/config.js` |
| **Start (local)** | `npm run samantha` (requires `gcloud auth application-default login`) |
| **Deployed** | Google Cloud Run (`samantha` GCP project) |
| **Backend** | Anthropic Claude via Vertex AI (Google ADC — no API key needed on Cloud Run) |
| **Model** | `claude-haiku-4-5@20251001` (override via `SAMANTHA_MODEL`) |
| **Port** | 8080 (Cloud Run) or `PORT` env var for local dev |

**What she does:**
- Executive assistant for Bryan's operation: sales outreach, email drafting, customer follow-up, scheduling
- Phone-friendly Progressive Web App widget (installable on iOS/Android home screen)
- Voice-memo-style conversation in Slack: when `SAMANTHA_URL` is set in the Slack bot env, DMs and @mentions route to her
- Supports multiple personas via `persona` field in the POST body (`samantha` default, `condoleezza` variant)
- Hands off CARB compliance questions to Mila

**Personas:**
| Persona | Description |
|---------|-------------|
| `samantha` | Executive assistant — brief, direct, friendly. Good for quick outreach and status questions. |
| `condoleezza` | Senior ops advisor — authoritative and precise. Better for email drafting, ops planning, and multi-step tasks. |

**API endpoints:**
| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `GET` | `/health` | None | `{ status, agent, backend }` — always returns 200 |
| `GET` | `/` or `/widget` | None | Phone-friendly PWA chat widget (HTML) |
| `GET` | `/api/samantha/status` | Optional token | Config check. Anonymous: `{ ready, timestamp }`. With token: includes missing vars. |
| `POST` | `/api/samantha/chat` | None | Chat request (rate-limited) |

**Chat request body:**
```json
{
  "message": "Draft a follow-up email for the Hayward fleet contact",
  "history": [{ "role": "user", "content": "..." }, { "role": "assistant", "content": "..." }],
  "persona": "condoleezza"
}
```

**Chat response:**
```json
{
  "reply": "Here's a follow-up draft...",
  "persona": "condoleezza"
}
```

**Local dev setup:**
```bash
# 1. Authenticate with Google (needed for Vertex AI)
gcloud auth application-default login

# 2. Set project
export ANTHROPIC_VERTEX_PROJECT_ID=samantha
export CLOUD_ML_REGION=us-east5

# 3. Run
npm run samantha
# → http://localhost:8080
```

**What she CAN'T do:**
- Process payments or collect credit cards / SSNs
- Push to calendars or send emails autonomously (drafts only)
- Run without Google ADC or Vertex AI access (Cloud Run uses service account automatically)
- Run autonomously (human-triggered only)

**Guardrails:**
> Never collect or persist sensitive PII. Disclose AI identity when asked. Hand off CARB compliance questions to Mila. Financial data in session only — never persist.

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
| 6 | **Belichick** | `skills/belichick-strategy/SKILL.md` | Strategy, delegation | Opus/Gemini | Never greenlights without legal review. Keeps human in loop. |
| 7 | **Mila Legal** | `skills/mila-legal/SKILL.md` | Law & regulation research | Gemini/Opus | Never suggests illegal activity. Always cites statutes. |
| 8 | **Atlas/Musk** | `skills/musk-creative/SKILL.md` | YouTube, creative, SEO | Gemini/Sonnet | No misleading clickbait. Respects copyright. Can't publish. |
| 9 | **Jon Jones** | `skills/jonjones-sales/SKILL.md` | Sales, objection handling | Gemini/Sonnet | **FULLY SANDBOXED.** No external API calls. No PII collection. Products from config only. |
| 10 | **Sentinel** | Uses `mila-legal` skill | Deep legal/regulatory analysis | Opus | Same constraints as Mila Legal. |
| 11 | **Cipher** | Not yet implemented | Finance, bookkeeping | Sonnet | Planned — not active. |
| 12 | **TPS Reporter** | `skills/tps-report/SKILL.md` | Status reporting format | N/A | Framework only. $1+ flag before starting. $70/month cap. |

---

### STATIC MARKETING SITES (Netlify — your choice to keep)

| Site | Domain | What It Is | Risk |
|------|--------|-----------|------|
| `carbteststockton/` | `carbteststockton.com` | Static HTML marketing page. No backend. Loads Google Fonts only. | **NONE** — pure HTML |
| `cleantruckcheckroseville/` | `cleantruckcheckroseville.com` | Static HTML marketing page. No backend. Phone is PLACEHOLDER. | **NONE** — pure HTML |

Both have security headers: `X-Frame-Options: DENY`, `connect-src 'self'`, no eval.
Manage at: https://app.netlify.com/

---

## THINGS THAT ARE NOW DEAD (post-purge)

| Service | What Was There | Status |
|---------|---------------|--------|
| **GCP Cloud Run (old)** | Old Mila chatbot (`mila-claude-2426-487008`) | KILLED — replaced by Samantha on Cloud Run |
| **GCP Pub/Sub** | Auto-enabled with old Cloud Run | KILLED |
| **GCP Artifact Registry** | Docker image storage | KILLED |
| **GCP Container Registry** | Deprecated, still active | KILLED |
| **GitHub Actions** (demo-repo) | 5 autonomous Mila workflows | DISABLED |
| **Vercel** | Mila chat widget proxy | KILLED |
| **Make.com** | Slack webhook bridge | DISABLED |
| **Cloudflare Tunnel/ngrok** | Localhost exposure | KILLED |

> **Note:** Samantha runs on GCP Cloud Run in the `samantha` project — this is intentional and active. Only the old, deprecated Mila Cloud Run deployment was killed.

---

## NETWORK ACCESS SUMMARY

| What | Allowed | Direction |
|------|---------|-----------|
| Anthropic API (Claude) | Yes, local only (Slack bot) | Mac → api.anthropic.com |
| Vertex AI / Anthropic on Vertex | Yes, Cloud Run only (Samantha) | Cloud Run → vertexai.googleapis.com |
| Slack API (bot) | Yes, local only | Mac → slack.com |
| Google Places API | Yes, manual trigger only | Mac → maps.googleapis.com |
| Google Sheets API | Yes, manual trigger only | Mac → sheets.googleapis.com |
| Google Fonts | Yes, static sites only | Browser → fonts.googleapis.com |
| Everything else | **NO** | — |

Local services bind to 127.0.0.1 only. Samantha on Cloud Run uses Google's internal network for Vertex AI auth (no key file needed).

---

## ENV VARIABLES NEEDED

See `.env.example` for the full list. Key vars by surface:

```bash
# ── Shared ──
ANTHROPIC_API_KEY=sk-ant-your-key      # Used by Slack bot (not Samantha)
SAMANTHA_GOOGLE_WORKSPACE_EMAIL=samantha@norcalcarbmobile.com

# ── Slack Bot ──
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
SLACK_SIGNING_SECRET=your-signing-secret
ALLOWED_USER_IDS=U01ABC123DEF          # Comma-separated Slack member IDs
SLACK_MAX_CONCURRENT_MISSIONS=2
SLACK_DAILY_TOKEN_BUDGET=60000
SLACK_SWARM_MAX_AGENTS=8
SLACK_SWARM_PARALLELISM=3
# Connect Slack DMs to Samantha (optional):
SAMANTHA_URL=https://your-cloud-run-url

# ── Samantha (Cloud Run + Vertex AI) ──
# Auth: Google Application Default Credentials (ADC)
# On Cloud Run: automatic via service account. Local dev: `gcloud auth application-default login`
PORT=8080
ANTHROPIC_VERTEX_PROJECT_ID=samantha
CLOUD_ML_REGION=us-east5
# SAMANTHA_MODEL=claude-haiku-4-5@20251001   # optional override
# SAMANTHA_MAX_TOKENS=1024                   # optional override
# SAMANTHA_ALLOWED_ORIGINS=https://your-domain.com   # restrict CORS
SAMANTHA_STATUS_TOKEN=                       # openssl rand -hex 32 — unlocks full /api/samantha/status payload

# ── Mila Chatbot ──
MILA_PORT=3001
MILA_ALLOWED_ORIGINS=http://localhost:3001
MILA_MAX_MESSAGE_CHARS=2000
MILA_SESSION_TTL_MINUTES=720
MILA_STATUS_TOKEN=                           # openssl rand -hex 32 — unlocks full /tps payload

# ── Lead Scraper ──
GOOGLE_PLACES_API_KEY=your-google-places-key
GOOGLE_SHEETS_ID=your-spreadsheet-id         # optional — CSV-only if absent
GOOGLE_SERVICE_ACCOUNT_KEY=./google-service-account.json
```
