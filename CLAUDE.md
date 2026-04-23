# CLAUDE.md

## Project Overview

**BelichickGillisMusk** is a local-first multi-agent AI system built on the OpenClaw platform, designed to run on a Mac. It orchestrates a team of specialized AI agents for business operations including legal research, sales, marketing, customer service (CARB compliance), lead generation, and strategic coordination. The system uses Slack as its command center, Make.com for automation, and prioritizes free-tier Gemini for grunt work with Claude reserved for complex tasks.

**License:** MIT

## Repository Structure

```
belichick-margo-jesus/
├── .env.example             # Template for required environment variables
├── .github/
│   └── workflows/
│       └── jekyll-docker.yml  # CI: Jekyll static site build via Docker
├── .gitignore               # Ignores node_modules, .env, *.csv, service account keys
├── ARCHITECTURE.md          # Full system architecture, agent roster, cost breakdown, security model
├── CLAUDE.md                # This file - AI assistant guide
├── LICENSE                  # MIT License
├── MILA-SEO-MASTER-PLAYBOOK.md  # Step-by-step SEO execution plan for NorCal Carb Mobile
├── README.md                # Brief project description
├── TPS-REPORTS.md           # Agent checkpoint system: TPS format, discoveries workflow, cost caps
├── carbteststockton/        # Landing page for CARB Test Stockton service
│   ├── 404.html
│   ├── _headers
│   ├── _redirects
│   ├── index.html           # SEO-optimized with JSON-LD LocalBusiness schema, geo-targeting
│   ├── robots.txt
│   └── sitemap.xml
├── cleantruckcheckroseville/  # Landing page for Clean Truck Check Roseville service
│   ├── 404.html
│   ├── _headers
│   ├── _redirects
│   └── index.html           # Premium dark theme with CSS design system, orange accent
├── index.html               # "Agent Round Table" - interactive agent status dashboard UI
├── openclaw-config.json5    # OpenClaw gateway configuration (JSON5 with comments)
├── package.json             # Node.js project config (ES modules, @slack/bolt, Anthropic SDK, Express)
├── reports/                 # Agent-generated reports and discoveries
│   ├── discoveries-2026-02-13.md  # Queued cost-saving discoveries awaiting approval
│   └── tps-2026-02-13.md         # Weekly agent status checkpoint
├── salesbot.html            # "The Office" - sandboxed sales bot demo (Closer agent prototype)
├── skills/                  # OpenClaw skill definitions (agent prompts and knowledge bases)
│   ├── belichick-strategy/
│   │   └── SKILL.md         # Strategy & orchestration agent
│   ├── gemini-lead-scraper/
│   │   └── SKILL.md         # Google Maps/Places API lead scraper
│   ├── jonjones-sales/
│   │   └── SKILL.md         # Sales agent with A.C.E.S. framework
│   ├── mila-carb-cs/
│   │   ├── SKILL.md         # CARB Clean Truck Check customer service agent
│   │   └── references/
│   │       ├── carb-resources-opportunities.md   # CARB programs and 10 business opportunities
│   │       └── clean-truck-check-complete.md     # Full HD I/M regulation knowledge base
│   ├── mila-legal/
│   │   ├── SKILL.md         # Legal/regulatory research agent
│   │   └── references/
│   │       └── research-sources.md              # Federal, IL, Chicago legal databases
│   ├── musk-creative/
│   │   └── SKILL.md         # YouTube/creative content & competitive analysis agent
│   ├── slack-recon-agent/
│   │   ├── SKILL.md         # Slack RECON mission command center
│   │   └── references/
│   │       └── slack-channel-map.md             # Channel routing and notification rules
│   └── tps-report/
│       └── SKILL.md         # Agent reporting framework: TPS format, discoveries, cost governance
└── src/                     # Node.js application code
    ├── lead-scraper/
    │   └── index.js         # Google Places API scraper → CSV / Google Sheets export
    ├── mila-chatbot/
    │   └── index.js         # Express server: CARB compliance chatbot with session history & widget
    └── slack-bot/
        ├── agents.js        # Agent roster config: 11 agents with models, channels, system prompts
        ├── dispatch.js      # Claude API dispatch engine: single-agent & parallel multi-agent execution
        └── index.js         # Slack bot entry point: commands, mission tracking, token cost reporting
```

## Agent Roster

| Agent | Role | Primary Model | Skill / Code |
|-------|------|---------------|--------------|
| **Belichick** | Strategy & orchestration | Claude Opus (complex) / Gemini (daily) | `skills/belichick-strategy/` |
| **Mila (CARB CS)** | Customer service for CARB compliance | Gemini / Haiku | `skills/mila-carb-cs/`, `src/mila-chatbot/` |
| **Mila (Legal)** | Regulatory research & business opportunity hunting | Gemini / Claude Opus | `skills/mila-legal/` |
| **Musk** | YouTube content, creative, competitive analysis | Gemini / Claude Haiku | `skills/musk-creative/` |
| **Jon Jones** | Sales conversations, lead qualification (A.C.E.S.) | Gemini / Claude Sonnet | `skills/jonjones-sales/` |
| **Cipher** | Finance, bookkeeping, token spend tracking | Gemini / Claude Haiku | Defined in `src/slack-bot/agents.js` |
| **Kesha** | Marketing & content intelligence | Gemini / Claude Haiku | Defined in `src/slack-bot/agents.js` |
| **Sentinel** | Legal/regulatory deep analysis | Gemini / Claude Sonnet | Defined in `src/slack-bot/agents.js` |
| **Lead Scraper** | Google Maps business lead generation | Gemini (free) | `skills/gemini-lead-scraper/`, `src/lead-scraper/` |
| **Slack RECON** | Mission dispatch & coordination via Slack | All agents | `skills/slack-recon-agent/`, `src/slack-bot/` |
| **TPS Report** | Agent reporting & discoveries governance | N/A (framework) | `skills/tps-report/` |

## Development Workflow

### Prerequisites

- Node.js (ES modules — `"type": "module"` in package.json)
- Environment variables configured (copy `.env.example` to `.env`)

### npm Scripts

```bash
npm run slack    # Start Slack bot (src/slack-bot/index.js)
npm run mila     # Start Mila CARB chatbot server (src/mila-chatbot/index.js)
npm run scrape   # Run lead scraper (src/lead-scraper/index.js)
npm start        # Alias for npm run slack
```

### Key Dependencies

- `@slack/bolt` — Slack bot framework (Socket Mode)
- `@anthropic-ai/sdk` — Claude API client
- `express` — Web server for Mila chatbot
- `googleapis` — Google Places + Sheets APIs
- `dotenv` — Environment variable loading
- `cors` — CORS middleware for chatbot

### Source Code Architecture (`src/`)

**Slack Bot** (`src/slack-bot/`):
- `index.js` — Entry point; registers Slack commands (`/roster`, `/dispatch`, `/kill`, `/recon-*`, `/budget`), tracks active missions in memory, reports token usage
- `agents.js` — Declares all 11 agents with their Claude model, Slack channel, and system prompt; defines mission-to-agent mappings for RECON commands
- `dispatch.js` — `runAgent(agentId, task)` calls Claude API with agent-specific system prompt; `runMission(agentIds[], task)` runs multiple agents in parallel via `Promise.all()`; single-turn only (no conversation history)

**Mila Chatbot** (`src/mila-chatbot/`):
- Express server with session-based multi-turn conversation (20-message rolling window)
- Loads `clean-truck-check-complete.md` knowledge base into system prompt
- Endpoints: `POST /chat`, `GET /health`, `GET /widget` (embeddable chat UI), `DELETE /session/:id`
- Uses Claude Haiku for cost efficiency

**Lead Scraper** (`src/lead-scraper/`):
- Google Places API text search → place details → CSV export
- Optional Google Sheets append via service account
- Rate-limited (200ms between API calls)
- CLI args: `node src/lead-scraper/index.js "query" "location"`

## Key Configuration

### OpenClaw Gateway (`openclaw-config.json5`)

- **Bind:** `loopback` (127.0.0.1 only - not internet-accessible)
- **Port:** 18789
- **Auth:** Token-based (generate with `openssl rand -hex 32`)
- **Max concurrent agents:** 2
- **Context token cap:** 60,000 per turn
- **Agent timeout:** 300 seconds (5 min silence)
- **Sub-agent auto-kill:** 30 min idle
- **Cron session retention:** 6 hours
- **Slack integration:** Enabled with 8 dedicated channels

### Slack Channels (RECON Operations)

All RECON channels use the `#recon-` prefix. Key channels:
- `#recon-command` - Mission dispatch (human to Belichick)
- `#recon-leads` - Lead scraper output
- `#recon-legal` - Regulatory intelligence
- `#recon-market` - Market research
- `#recon-sales` - Prospect dossiers
- `#recon-compliance` - CARB compliance alerts
- `#agent-status` - Agent status dashboard
- `#alerts` - Budget warnings, kill switches, failures

### Environment Variables Required

```
# Slack Bot
SLACK_BOT_TOKEN=xoxb-...
SLACK_APP_TOKEN=xapp-...
SLACK_SIGNING_SECRET=...

# Anthropic (Claude)
ANTHROPIC_API_KEY=sk-ant-...

# Google
GOOGLE_PLACES_API_KEY=...
GOOGLE_SHEETS_ID=...                        # Optional: for lead scraper Sheets export
GOOGLE_SERVICE_ACCOUNT_KEY=./google-service-account.json  # Optional: for Sheets auth

# Server
MILA_PORT=3001                              # Mila chatbot Express server port
```

## CI/CD

### GitHub Actions (`jekyll-docker.yml`)

- Triggers on push to `main` and on pull requests
- Builds static site using `jekyll/builder` Docker image
- `--future` flag includes future-dated posts

## Landing Pages

Two SEO-optimized service landing pages for CARB compliance testing businesses:

- **`carbteststockton/`** — CARB Test Stockton: $85 OBD / $200 smoke opacity, JSON-LD LocalBusiness schema, geo-targeting for San Joaquin County
- **`cleantruckcheckroseville/`** — Clean Truck Check Roseville: premium dark theme with orange accent, CSS design system with custom properties

Both include `_headers`, `_redirects`, `robots.txt`/`sitemap.xml` for static hosting (Netlify/Cloudflare Pages compatible).

## Reports & Governance

### TPS Reports (`TPS-REPORTS.md`, `skills/tps-report/`)

Every agent reports progress using the TPS format:
- STATUS (ONLINE / COMPLETED / ERROR / BLOCKED)
- WHAT I DID, TOKENS USED, COST ESTIMATE, RED FLAGS, NEXT ACTION

### Discoveries System

When an agent finds something better/faster/free, it logs a Discovery and **waits for Bryan's approval** (GO / NO / RESEARCH) before acting. Discoveries are tracked in `reports/`.

### Cost Governance

- Monthly budget cap: **$70 total** across all agents
- Flag if task will cost > $1 before starting
- Stop if burned > $2 with no result
- Track cumulative cost per session

## Skill File Format

Each skill is defined in a `SKILL.md` file with YAML frontmatter:

```markdown
---
name: skill-name
description: Detailed description with trigger words
---

# Agent Name - Role Description

[System prompt, workflows, output formats, guardrails]
```

The `description` field includes trigger words that OpenClaw uses to route requests to the correct agent. Reference files go in a `references/` subdirectory within the skill folder.

## HTML Prototypes

### `index.html` - Agent Round Table

Interactive status dashboard showing all agents arranged in a circle. Each agent has three states:
- **Active** (blue halo) - agent is working
- **Inactive** (yarmulke cap) - agent is offline
- **Trouble** (red pulsing) - agent has an error

Click an agent or use the bottom buttons to cycle status. Pure client-side HTML/CSS/JS with no dependencies.

### `salesbot.html` - The Office (Closer Demo)

Sandboxed sales bot demo for the Closer agent. Features:
- Configurable sidebar: bot persona, products, sales rules, objection playbook
- Pattern-matching response engine (no API calls, no network)
- Strict Content Security Policy (`connect-src 'none'`)
- JavaScript sandbox: blocks `eval()`, `fetch()`, `XMLHttpRequest`, `WebSocket`, dynamic script injection
- Security wall overlay on sandbox violation attempts
- Prompt injection detection and deflection

## Development Conventions

### File Organization
- Agent definitions go in `skills/<agent-name>/SKILL.md`
- Reference/knowledge base data goes in `skills/<agent-name>/references/`
- Application code goes in `src/<component>/index.js`
- Configuration is JSON5 format (comments allowed) in `openclaw-config.json5`
- UI prototypes are standalone HTML files at the repo root (no build system)
- Landing pages go in their own directories at repo root (e.g., `carbteststockton/`)
- Agent-generated reports go in `reports/`

### Security Principles
- **Local-first:** Everything runs on localhost, nothing in the cloud
- **Sandboxed agents:** Each agent has explicit guardrails in its SKILL.md
- **No PII collection:** Agents never collect credit cards, SSNs, or sensitive data
- **Cost control:** Prefer Gemini free tier for 80% of work; Claude only for complex tasks
- **Kill switches:** Max concurrent agents, idle timeouts, token caps, billing backoffs
- **Slack security:** User allowlist, rate limiting (10 missions/hr), channel isolation

### Agent Design Patterns
- Every agent SKILL.md must include a **Guardrails** section
- Agents must disclose they are AI when asked
- Output formats are standardized per agent (see each SKILL.md)
- Belichick orchestrates and delegates; other agents are specialists
- Agents should cite specific rules/regulations/sources in responses
- The delegation format is: `TO / TASK / CONTEXT / DEADLINE / OUTPUT / CONSTRAINTS`
- Agents finding improvements log Discoveries and wait for human approval before acting

### Domain Knowledge (CARB Compliance)
The primary business domain is **California Air Resources Board (CARB) Clean Truck Check** compliance:
- Applies to all diesel/alt-fuel vehicles over 14,000 lbs GVWR operating in CA
- No exemptions for out-of-state, low-use, or small fleets
- Testing frequency: 2x/year currently, **4x/year starting October 2027** (OBD vehicles)
- Penalties: up to $10,000/vehicle/day
- Key opportunity: mobile credentialed testing services (free training, no brick-and-mortar needed)
- The `clean-truck-check-complete.md` file is the authoritative knowledge base

### Cloudflare City Sites — Master Reference

Each city has a one-page landing site on Cloudflare Workers + KV. **Do not duplicate content between cities.** Each site targets a unique service area. Full spec in `sites-config.json` and `CLOUDFLARE-SITES-MASTER.md`.

**Global:**
- Company: NorCal CARB Mobile LLC
- CARB Tester ID: IF530523 (Valid Jun 2027)
- Hours: Mon-Fri 6am-5pm, Sat 8am-4pm
- Rating: 4.9 stars, 47+ reviews
- Free retest: 1 free if fail
- Always link to cleantruckcheckvin.app
- Template source: `cloudflare/sites/hayward/index.html` (44K leather/copper rustic design)

| City | Phone | OBD | OVI | Fleet OBD/OVI | Colors (Team) | Coverage | Domain | KV Namespace ID |
|------|-------|-----|-----|---------------|---------------|----------|--------|-----------------|
| **Stockton** | (209) 818-1371 | $69 | $179 | $49/$149 | Red/Gold (Stockton Heat) | Stockton, Lodi, Tracy, Manteca, Modesto, Turlock, Ripon, Escalon + Fresno by appt | carbteststockton.com | `ed51efc25c9c442bbb984a8fce905ee5` |
| **Roseville** | (916) 890-4427 | $79 | $209 | $69/$169 | Orange/Black/Cream (SF Giants) | Roseville, Rocklin, Lincoln, Citrus Heights, Folsom, Auburn, Elk Grove, Sacramento | cleantruckcheckroseville.com | `a7499c3416a74d37a828e6e29f0b727f` |
| **Fairfield** | (916) 890-4427 | $79 | $209 | $69/$169 | Blue/Silver (Air Force Academy, LIGHT bg) | Fairfield, Vacaville, Vallejo, Napa, Dixon, Davis, Woodland, Suisun City | cleantruckcheckfairfield.com | `18c13f0d18cd49519e1f3688484fc9dc` |
| **Lodi** | (209) 818-1371 | $75 | $209 | $69/$169 | Garnet/Gold (Florida State, LIGHT bg) | Lodi, Woodbridge, Acampo, Galt, Lockeford, Stockton, Tracy + Fresno by appt | cleantruckchecklodi.com | TBD |
| **Hayward** | (415) 900-8563 | $85 | $179 | $69/$169 | Silver/Black (Raiders) | Hayward, Union City, Fremont, Castro Valley, San Leandro, Alameda, Pleasanton, Livermore | cleantruckcheckhayward.com | `f55313eabf3b415d83fb7036e4873834` |
| **Bay Area** | (415) 900-8563 | $79 | $219 | $75/$199 | Orange/Black/Cream (SF Giants) | San Jose to Novato — full Bay Area corridor | carb-clean-truck-check.com | — |
| **San Diego** | (619) 786-4328 | $119 | $219 | $69/$169 | Brown/Gold (Padres) | San Diego, Chula Vista, Oceanside, Escondido, Carlsbad, El Cajon | mobilecarbsmoketest.com | — |

**NEVER brand a one-page landing site to norcalcarbmobile.com** — that is the main business site (built separately, not a one-pager). One-pagers are city-specific satellite sites only.

**Rules:**
- Each city's service areas must NOT overlap with another city's
- Pricing varies per city — see table above (NOT universal)
- Motorhome pricing: OBD $99, OVI $250 (all cities)
- All sites use the same worker code pattern (HTML from KV, /api/book endpoint, robots.txt, sitemap.xml)
- Template source: `cloudflare/sites/hayward/index.html` (Hayward rustic design — adapt colors per city)
- Hours: Mon-Fri 6am-5pm, Sat 8am-4pm

## What Not to Change

- Do not remove guardrails from any SKILL.md file
- Do not change `openclaw-config.json5` bind from `loopback` to anything public-facing
- Do not add external network calls to `salesbot.html` (it is intentionally sandboxed)
- Do not change the Content Security Policy on `salesbot.html`
- Do not add cloud service dependencies - the system is local-first by design
- Do not act on Discoveries without Bryan's approval (GO / NO / RESEARCH)
- Do not commit `.env`, `google-service-account.json`, or CSV files (see `.gitignore`)
