# CLAUDE.md

## Project Overview

**BelichickGillisMusk** is a local-first multi-agent AI system built on the OpenClaw platform, designed to run on a Mac. It orchestrates a team of specialized AI agents for business operations including legal research, sales, marketing, customer service (CARB compliance), lead generation, and strategic coordination. The system uses Slack as its command center, Make.com for automation, and prioritizes free-tier Gemini for grunt work with Claude reserved for complex tasks.

**License:** MIT

## Repository Structure

```
belichick-margo-jesus/
├── .github/
│   └── workflows/
│       └── jekyll-docker.yml    # GitHub Actions CI/CD for Jekyll site
├── ARCHITECTURE.md              # Full system architecture, agent roster, cost breakdown, security model
├── CLAUDE.md                    # This file - AI assistant guide
├── LICENSE                      # MIT License
├── MILA-SEO-MASTER-PLAYBOOK.md # Comprehensive local SEO execution playbook
├── README.md                    # Brief project description
├── TPS-REPORTS.md               # Agent status checkpoint tracking
├── openclaw-config.json5        # OpenClaw gateway configuration (JSON5 with comments)
├── index.html                   # "Agent Round Table" - interactive agent status dashboard UI
├── salesbot.html                # "The Office" - sandboxed sales bot demo (Jon Jones agent prototype)
├── carbteststockton/            # Cloudflare Pages landing site - CARB testing in Stockton, CA
│   ├── index.html
│   ├── 404.html
│   ├── _headers
│   ├── _redirects
│   ├── robots.txt
│   └── sitemap.xml
├── cleantruckcheckroseville/    # Cloudflare Pages landing site - Clean Truck Check in Roseville, CA
│   ├── index.html
│   ├── 404.html
│   ├── _headers
│   └── _redirects
├── reports/                     # Discovery reports and TPS status reports
│   ├── discoveries-2026-02-13.md
│   └── tps-2026-02-13.md
└── skills/                      # OpenClaw skill definitions (agent prompts and knowledge bases)
    ├── belichick-strategy/
    │   └── SKILL.md             # Strategy & orchestration agent
    ├── gemini-lead-scraper/
    │   └── SKILL.md             # Google Maps/Places API lead scraper
    ├── jonjones-sales/
    │   └── SKILL.md             # Sales agent with A.C.E.S. framework
    ├── mila-carb-cs/
    │   ├── SKILL.md             # CARB Clean Truck Check customer service agent
    │   └── references/
    │       ├── carb-resources-opportunities.md   # CARB programs and 10 business opportunities
    │       └── clean-truck-check-complete.md     # Full HD I/M regulation knowledge base
    ├── mila-legal/
    │   ├── SKILL.md             # Legal/regulatory research agent
    │   └── references/
    │       └── research-sources.md              # Federal, IL, Chicago legal databases
    ├── musk-creative/
    │   └── SKILL.md             # YouTube/creative content agent
    ├── slack-recon-agent/
    │   ├── SKILL.md             # Slack RECON mission command center
    │   └── references/
    │       └── slack-channel-map.md             # Channel routing and notification rules
    └── tps-report/
        └── SKILL.md             # TPS (Task Progress Status) agent status collection
```

## Agent Roster

| Agent | Role | Primary Model | Skill Directory |
|-------|------|---------------|-----------------|
| **Belichick** | Strategy & orchestration | Claude Opus (complex) / Gemini (daily) | `skills/belichick-strategy/` |
| **Mila (CARB CS)** | Customer service for CARB compliance | Gemini / Haiku | `skills/mila-carb-cs/` |
| **Mila (Legal)** | Regulatory research & business opportunity hunting | Gemini / Claude Opus | `skills/mila-legal/` |
| **Musk** | YouTube content, creative, SEO | Gemini / Claude Sonnet | `skills/musk-creative/` |
| **Jon Jones** | Sales conversations, lead qualification | Gemini / Claude Sonnet | `skills/jonjones-sales/` |
| **Cipher** | Finance, bookkeeping, tax prep | Gemini / Claude Sonnet | Not yet implemented |
| **Kesha** | Marketing, animation, social media | Gemini / Claude Sonnet | Not yet implemented |
| **Sentinel** | Legal/regulatory deep analysis | Gemini / Claude Opus | Uses `mila-legal` skill |
| **Lead Scraper** | Google Maps business lead generation | Gemini (free) | `skills/gemini-lead-scraper/` |
| **Slack RECON** | Mission dispatch & coordination via Slack | All agents | `skills/slack-recon-agent/` |
| **TPS Report** | Agent status collection & tracking | All agents | `skills/tps-report/` |

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

### `salesbot.html` - The Office (Jon Jones Demo)

Sandboxed sales bot demo for the Jon Jones agent. Features:
- Configurable sidebar: bot persona, products, sales rules, objection playbook
- Pattern-matching response engine (no API calls, no network)
- Strict Content Security Policy (`connect-src 'none'`)
- JavaScript sandbox: blocks `eval()`, `fetch()`, `XMLHttpRequest`, `WebSocket`, dynamic script injection
- Security wall overlay on sandbox violation attempts
- Prompt injection detection and deflection

## Landing Pages (Cloudflare Pages)

Two static landing sites deployed via Cloudflare Pages for local SEO lead generation:

### `carbteststockton/` - CARB Test Stockton

Landing page for CARB testing services in Stockton, CA. Includes SEO assets (`robots.txt`, `sitemap.xml`), custom headers, and redirects.

### `cleantruckcheckroseville/` - Clean Truck Check Roseville

Landing page for Clean Truck Check services in Roseville, CA. Includes custom headers and redirects.

Both sites are static HTML with no build system. Cloudflare-specific files (`_headers`, `_redirects`) configure edge behavior.

## Reports

The `reports/` directory stores agent-generated discovery reports and TPS (Task Progress Status) reports. Files follow the naming convention `<type>-<date>.md`. The root-level `TPS-REPORTS.md` serves as the agent status checkpoint tracking file.

## SEO Playbook

`MILA-SEO-MASTER-PLAYBOOK.md` is a comprehensive local SEO execution playbook covering keyword strategy, landing page optimization, Google Business Profile management, and content calendars for the CARB compliance business.

## CI/CD

`.github/workflows/jekyll-docker.yml` provides a GitHub Actions workflow for Jekyll site CI.

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

## What Not to Change

- Do not remove guardrails from any SKILL.md file
- Do not change `openclaw-config.json5` bind from `loopback` to anything public-facing
- Do not add external network calls to `salesbot.html` (it is intentionally sandboxed)
- Do not change the Content Security Policy on `salesbot.html`
- Do not add cloud service dependencies - the system is local-first by design
