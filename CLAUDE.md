# CLAUDE.md

## Project Overview

**BelichickGillisMusk** is a local-first multi-agent AI system built on the OpenClaw platform, designed to run on a Mac. It orchestrates a team of specialized AI agents for business operations including legal research, sales, marketing, customer service (CARB compliance), lead generation, and strategic coordination. The system uses Slack as its command center, Make.com for automation, and prioritizes free-tier Gemini for grunt work with Claude reserved for complex tasks.

**License:** MIT

## Repository Structure

```
belichick-margo-jesus/
├── ARCHITECTURE.md          # Full system architecture, agent roster, cost breakdown, security model
├── CLAUDE.md                # This file - AI assistant guide
├── LICENSE                  # MIT License
├── README.md                # Brief project description
├── openclaw-config.json5    # OpenClaw gateway configuration (JSON5 with comments)
├── index.html               # "Agent Round Table" - interactive agent status dashboard UI
├── salesbot.html            # "The Office" - sandboxed sales bot demo (Closer agent prototype)
└── skills/                  # OpenClaw skill definitions (agent prompts and knowledge bases)
    ├── atlas-creative/
    │   └── SKILL.md         # YouTube/creative content agent
    ├── belichick-strategy/
    │   └── SKILL.md         # Strategy & orchestration agent
    ├── closer-sales/
    │   └── SKILL.md         # Sales agent with A.C.E.S. framework
    ├── gemini-lead-scraper/
    │   └── SKILL.md         # Google Maps/Places API lead scraper
    ├── mila-carb-cs/
    │   ├── SKILL.md         # CARB Clean Truck Check customer service agent
    │   └── references/
    │       ├── carb-resources-opportunities.md   # CARB programs and 10 business opportunities
    │       └── clean-truck-check-complete.md     # Full HD I/M regulation knowledge base
    ├── mila-legal/
    │   ├── SKILL.md         # Legal/regulatory research agent
    │   └── references/
    │       └── research-sources.md              # Federal, IL, Chicago legal databases
    └── slack-recon-agent/
        ├── SKILL.md         # Slack RECON mission command center
        └── references/
            └── slack-channel-map.md             # Channel routing and notification rules
```

## Agent Roster

| Agent | Role | Primary Model | Skill Directory |
|-------|------|---------------|-----------------|
| **Belichick** | Strategy & orchestration | Claude Opus (complex) / Gemini (daily) | `skills/belichick-strategy/` |
| **Mila (CARB CS)** | Customer service for CARB compliance | Gemini / Haiku | `skills/mila-carb-cs/` |
| **Mila (Legal)** | Regulatory research & business opportunity hunting | Gemini / Claude Opus | `skills/mila-legal/` |
| **Atlas** | YouTube content, creative, SEO | Gemini / Claude Sonnet | `skills/atlas-creative/` |
| **Closer** | Sales conversations, lead qualification | Gemini / Claude Sonnet | `skills/closer-sales/` |
| **Cipher** | Finance, bookkeeping, tax prep | Gemini / Claude Sonnet | Not yet implemented |
| **Nova** | Marketing, animation, social media | Gemini / Claude Sonnet | Not yet implemented |
| **Sentinel** | Legal/regulatory deep analysis | Gemini / Claude Opus | Uses `mila-legal` skill |
| **Lead Scraper** | Google Maps business lead generation | Gemini (free) | `skills/gemini-lead-scraper/` |
| **Slack RECON** | Mission dispatch & coordination via Slack | All agents | `skills/slack-recon-agent/` |

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
SLACK_BOT_TOKEN
SLACK_APP_TOKEN
SLACK_SIGNING_SECRET
GOOGLE_PLACES_API_KEY
```

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
- Configuration is JSON5 format (comments allowed) in `openclaw-config.json5`
- UI prototypes are standalone HTML files at the repo root (no build system)

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
