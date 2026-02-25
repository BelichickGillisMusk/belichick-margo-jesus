# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

There is no build system. This is a local-first agent config repo.

**Generate an auth token for openclaw-config.json5:**
```bash
openssl rand -hex 32
```

**Install and start the OpenClaw gateway (Mac):**
```bash
npm install -g openclaw@latest
cp openclaw-config.json5 ~/.openclaw/openclaw.json
# Edit ~/.openclaw/openclaw.json — replace GENERATE-WITH token with your actual token
openclaw start
```

**Install a local fallback model (optional):**
```bash
brew install ollama
ollama pull llama3
```

**Preview the HTML UIs:**
```bash
open index.html       # Agent Round Table dashboard
open salesbot.html    # Jon Jones sandboxed sales demo
```

**Build/preview the Jekyll documentation site locally:**
```bash
docker run --rm -v "$(pwd)":/site -p 4000:4000 jekyll/jekyll jekyll serve
```

**No automated test suite exists.** Agent skills are tested manually by sending prompts through OpenClaw or by reviewing output in Slack channels.

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
├── TPS-REPORTS.md           # Agent status reporting system and discovery log format
├── MILA-SEO-MASTER-PLAYBOOK.md  # Local SEO execution playbook (business reference)
├── openclaw-config.json5    # OpenClaw gateway configuration (JSON5 with comments)
├── index.html               # "Agent Round Table" - interactive agent status dashboard UI
├── salesbot.html            # "The Office" - sandboxed sales bot demo (Jon Jones agent prototype)
├── reports/                 # Snapshot TPS reports and discovery logs
│   ├── discoveries-2026-02-13.md
│   └── tps-2026-02-13.md
├── carbteststockton/        # Static site for Cloudflare Pages (carbteststockton.com)
├── cleantruckcheckroseville/ # Static site for Cloudflare Pages (cleantruckcheckroseville.com)
└── skills/                  # OpenClaw skill definitions (agent prompts and knowledge bases)
    ├── belichick-strategy/
    │   └── SKILL.md         # Chief of Staff & orchestration agent
    ├── cipher-finance/
    │   └── SKILL.md         # Finance, invoicing, tax prep agent
    ├── gemini-lead-scraper/
    │   └── SKILL.md         # Google Maps/Places API lead scraper
    ├── jonjones-sales/
    │   └── SKILL.md         # Sales agent with A.C.E.S. framework
    ├── mila-carb-cs/
    │   ├── SKILL.md         # CARB Clean Truck Check customer service agent
    │   └── references/
    │       ├── carb-resources-opportunities.md   # CARB programs and 10 business opportunities
    │       └── clean-truck-check-complete.md     # Full HD I/M regulation knowledge base
    ├── mila-legal/
    │   ├── SKILL.md         # Legal/regulatory research agent
    │   └── references/
    │       └── research-sources.md              # Federal, IL, Chicago legal databases
    ├── musk-creative/
    │   └── SKILL.md         # Websites, Xai, code & creative content agent
    ├── slack-recon-agent/
    │   ├── SKILL.md         # Slack RECON mission command center
    │   └── references/
    │       └── slack-channel-map.md             # Channel routing and notification rules
    └── tps-report/
        └── SKILL.md         # Agent status collection & discovery tracking
```

## Agent Roster

| Agent | Role | Primary Model | Skill Directory |
|-------|------|---------------|-----------------|
| **Belichick** | Chief of Staff & orchestration | Claude Opus (complex) / Gemini (daily) | `skills/belichick-strategy/` |
| **Musk** | Websites, Xai, code & creative | Gemini / Claude Sonnet | `skills/musk-creative/` |
| **Jon Jones** | Sales conversations, lead qualification | Gemini / Claude Sonnet | `skills/jonjones-sales/` |
| **Cipher** | Finance, bookkeeping, tax prep | Gemini / Claude Sonnet | `skills/cipher-finance/` |
| **Kesha** | Marketing, animation, social media | Gemini / Claude Sonnet | Not yet implemented |
| **Mila (CARB CS)** | Customer service for CARB compliance | Gemini / Haiku | `skills/mila-carb-cs/` |
| **Mila (Legal)** | Regulatory research & business opportunity hunting | Gemini / Claude Opus | `skills/mila-legal/` |
| **Sentinel** | Legal/regulatory deep analysis | Gemini / Claude Opus | Uses `mila-legal` skill |
| **Lead Scraper** | Google Maps business lead generation | Gemini (free) | `skills/gemini-lead-scraper/` |
| **Slack RECON** | Mission dispatch & coordination via Slack | All agents | `skills/slack-recon-agent/` |

## Data Flow Architecture

All commands flow through Slack to Make.com to OpenClaw to Agent, with results flowing back via Make.com to Slack:

```
Slack slash command (e.g. /recon-leads)
  → Make.com webhook (bridges internet → localhost)
    → OpenClaw Gateway (127.0.0.1:18789)
      → Belichick dispatches task to specialist agent
        → Agent runs with skill loaded from skills/<name>/SKILL.md
          → Results posted to Make.com → Slack channel
```

**Scheduled tasks** run via OpenClaw cron (6 jobs defined in `openclaw-config.json5`):
- Every 2h (8AM-8PM): `belichick` posts status to `#agent-status`
- Daily 6AM: `sentinel` watches CARB/eCFR → `#recon-legal`
- Monday 7AM: `lead-scraper` scrapes Google Maps → `#recon-leads`
- Wednesday 7AM: `musk` competitor watch → `#recon-market`
- Daily 8AM: `mila-carb` compliance deadlines → `#recon-compliance`
- Friday 5PM: `cipher` weekly budget report → `#alerts`

**Skill routing:** OpenClaw reads the `description` field in each SKILL.md YAML frontmatter to match incoming prompts to agents via trigger words. The skill prompt (`# Agent Name...` section) becomes the agent's full system prompt.

**TPS reporting:** Every agent includes a structured TPS block in responses (see `TPS-REPORTS.md`). Discoveries (better tools, cheaper APIs) are logged for approval — agents must NOT act on discoveries without a `GO` from the operator.

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

### Static Sites (Cloudflare Pages)

Two production static sites in the repo root:
- `carbteststockton/` — deployed to carbteststockton.com
- `cleantruckcheckroseville/` — deployed to cleantruckcheckroseville.com

Both are Cloudflare Pages deployments. No build step — static HTML/CSS/JS only.

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
