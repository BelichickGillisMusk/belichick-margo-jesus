# AGENT COMMAND CENTER — ClawdBot Roster

**Last Updated:** 2026-03-22
**Status:** Post-purge. All agents local-only. No cloud, no autonomous ops.

---

## Quick Start (After Key Rotation)

```bash
# 1. Fill in your new rotated keys
cp .env.example .env
# Edit .env with your new keys

# 2. Install dependencies
npm install

# 3. Pick what you want to run:
npm run slack     # Slack bot — dispatches agents via slash commands
npm run mila      # Mila CARB chatbot — localhost:3001
npm run scrape    # Lead scraper — one-shot CLI tool
```

---

## THE ROSTER — Every Agent, Where It Lives, What It Can't Do

### RUNNING AGENTS (local Mac only)

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

### BROWSER-ONLY DEMOS (zero network, zero risk)

---

#### 4. SALESBOT DEMO — The Office
| | |
|---|---|
| **Home** | `salesbot.html` |
| **Start** | Open in browser |
| **Network** | `connect-src 'none'` — ZERO outbound calls |

**Security:** Blocks eval, fetch, XMLHttpRequest, WebSocket, dynamic scripts. Pattern-matching only. No API. No data leaves the browser.

---

#### 5. AGENT DASHBOARD — Round Table
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
| **GCP Cloud Run** | Mila chatbot (`mila-claude-2426-487008`) | KILLED |
| **GCP Pub/Sub** | Auto-enabled with Cloud Run | KILLED |
| **GCP Artifact Registry** | Docker image storage | KILLED |
| **GCP Container Registry** | Deprecated, still active | KILLED |
| **GitHub Actions** (demo-repo) | 5 autonomous Mila workflows | DISABLED |
| **Vercel** | Mila chat widget proxy | KILLED |
| **Make.com** | Slack webhook bridge | DISABLED |
| **Cloudflare Tunnel/ngrok** | Localhost exposure | KILLED |

---

## NETWORK ACCESS SUMMARY

| What | Allowed | Direction |
|------|---------|-----------|
| Anthropic API (Claude) | Yes, local only | Mac → api.anthropic.com |
| Slack API (bot) | Yes, local only | Mac → slack.com |
| Google Places API | Yes, manual trigger only | Mac → maps.googleapis.com |
| Google Sheets API | Yes, manual trigger only | Mac → sheets.googleapis.com |
| Google Fonts | Yes, static sites only | Browser → fonts.googleapis.com |
| Everything else | **NO** | — |

No inbound connections. Nothing listens on a public port. ClawdBot binds to 127.0.0.1 only.

---

## ENV VARIABLES NEEDED (after key rotation)

```bash
# Required for Slack bot
SLACK_BOT_TOKEN=xoxb-YOUR-NEW-TOKEN
SLACK_APP_TOKEN=xapp-YOUR-NEW-TOKEN
SLACK_SIGNING_SECRET=YOUR-NEW-SECRET

# Required for Mila chatbot
ANTHROPIC_API_KEY=sk-ant-YOUR-NEW-KEY

# Required for Lead Scraper
GOOGLE_PLACES_API_KEY=YOUR-NEW-KEY

# Optional (Google Sheets export)
GOOGLE_SHEETS_ID=your-spreadsheet-id
GOOGLE_SERVICE_ACCOUNT_KEY=./google-service-account.json

# Optional (Mila chatbot port, defaults to 3001)
MILA_PORT=3001
```
