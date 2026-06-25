# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

SilverbackAI (BelichickGillisMusk) — a local-first multi-agent orchestration system. Belichick (strategist) receives projects, delegates tasks to specialized sub-agents via Claude tool_use, and Jon Jones (guardian) reviews all outbound actions before they leave the machine.

## Commands

```bash
# Install runtime dependencies
cd runtime && npm install

# Give Belichick a project (he delegates to sub-agents)
ANTHROPIC_API_KEY=sk-ant-... node runtime/src/cli.js project "Build a cold email campaign"

# Send a task directly to one agent
node runtime/src/cli.js task closer "Draft 5 cold emails for fleet managers"

# Check agent status (reads agents-site/activity.json)
node runtime/src/cli.js status

# List all agents
node runtime/src/cli.js roster

# Run setup on Mac (installs Homebrew deps, creates ~/.openclaw/)
bash setup.sh

# Validate installation
bash validate.sh
```

No test suite, linter, or CI pipeline exists yet.

## Architecture

**Runtime** (`runtime/src/`): Node.js ES modules. Multi-provider — each agent uses the cheapest model that fits its job.

- `cli.js` — Entry point. Routes `project`, `task`, `status`, `roster`, `keygen`, `keyinfo` commands.
- `orchestrator.js` — Belichick's controller. Defines three tools: `delegate` (assign work to sub-agents), `send_outbound` (external comms, gated by Jon Jones), `report` (final deliverables). Runs a tool_use loop until Belichick is done. Belichick MUST be on Anthropic — only Claude has tool_use.
- `agent.js` — `runAgent()` loads agent's SKILL.md as system prompt, dispatches to the right provider via `providers/index.js`, runs tool_use loop (max 10 iterations), updates activity.json on start/completion.
- `providers/` — Abstraction layer per LLM vendor:
  - `anthropic.js` — Claude (supports tool_use)
  - `openai.js` — ChatGPT + Grok (Grok uses OpenAI-compatible API at `https://api.x.ai/v1`)
  - `gemini.js` — Google Gemini
  - `index.js` — `callProvider(provider, options)` dispatcher + `envVarName(provider)` lookup
- `guardian.js` — Jon Jones outbound gate. First does regex scan for credential patterns (`sk-ant-`, `AIzaSy`, `xoxb-`, `ghp_`, etc.) and blocks immediately. Then calls Jon Jones agent to review content → APPROVE / REWRITE / BLOCK / ESCALATE.
- `activity.js` — Reads/writes `agents-site/activity.json` for the Conference Room dashboard. Tracks per-agent status and a 50-entry activity feed.
- `config.js` — Agent registry (9 agents with provider/model fields). `getProviderKey(provider)` checks env var → `~/.openclaw/openclaw.json` → repo `openclaw-config.json5`. Supports nested config paths like `apiKeys.anthropic`, `apiKeys.openai`, `apiKeys.gemini`, `apiKeys.grok`.

**Execution flow**: User → `cli.js project "..."` → `orchestrator.runProject()` → Belichick gets project + tool definitions → Claude returns `tool_use` blocks → `handleDelegate()` calls `agent.runAgent()` for each sub-agent → sub-agent result feeds back to Belichick → loop until `report` tool or `end_turn`.

**Skills** (`skills/*/SKILL.md`): YAML frontmatter (name, description) + markdown prompt defining role, frameworks, guardrails. Each agent's SKILL.md becomes its system prompt at runtime.

## Agent Registry (provider / model assignments)

Cost-optimized — only Belichick needs Claude Sonnet (tool_use for delegation). Others use cheaper models.

| ID | Name | Provider | Model | Role |
|----|------|----------|-------|------|
| `belichick` | Belichick | anthropic | claude-sonnet-4-20250514 | Orchestrator — breaks projects into tasks, delegates |
| `sloan-carb` | Sloan (CARB CS) | anthropic | claude-haiku-4-5-20251001 | CARB Clean Truck Check support |
| `sloan-legal` | Sloan (Legal) | anthropic | claude-sonnet-4-20250514 | Regulatory research |
| `atlas` | Atlas | openai | gpt-4o-mini | YouTube + blog content |
| `closer` | Closer | anthropic | claude-sonnet-4-20250514 | Sales (A.C.E.S. framework) |
| `jon-jones` | Jon Jones | anthropic | claude-haiku-4-5-20251001 | Security guardian |
| `builder-deploy` | Builder-Deploy | anthropic | claude-haiku-4-5-20251001 | Deploy to Cloudflare/Vercel |
| `lead-scraper` | Lead Scraper | gemini | gemini-2.0-flash | Google Maps/Places (uses Google's stack) |
| `nova` | Nova | grok | grok-2-1212 | Blog & social posts |
| `samantha` | Samantha | anthropic | claude-haiku-4-5-20251001 | Calendar & scheduling (Google Calendar) |

Required API keys (set the env var OR put in `~/.openclaw/openclaw.json` under `apiKeys.<name>`):
- `ANTHROPIC_API_KEY` — required (Belichick + several sub-agents)
- `OPENAI_API_KEY` — for Atlas (gpt-4o-mini)
- `GEMINI_API_KEY` — for Lead Scraper
- `GROK_API_KEY` — for Nova (xAI)

## Deployments

- **`site/`** → Cloudflare Pages at `silverbackai.agency` (static HTML, `_headers` for security)
- **`agents-site/`** → Vercel at `agents.bryanoneillgillis.com` (Conference Room dashboard, reads `activity.json`)
- **`vercel-site/`** → Vercel at `bryanoneillgillis.com` (personal site)

## Security Model (Good Claw / Bad Claw)

Internal agent work (research, drafting, code) is unrestricted. All outbound actions (email, Slack, Discord, file shares) are gatekept by Jon Jones. Three approval tiers: auto-approve (low risk, 30/hr circuit breaker), agent-approve (medium), human-approve (high risk, 60min timeout → auto-reject). `/stop` mode pauses all outbound and queues for batch review.

## Deploy Key (Single Owner)

All agent execution (`project`, `task`) requires a deploy key. Only one person can generate it.

```bash
# Generate key (one time only — save the output)
node runtime/src/cli.js keygen

# Use the key
OPENCLAW_DEPLOY_KEY=<your-key> node runtime/src/cli.js project "..."
```

- Key hash stored at `~/.openclaw/deploy.key` (mode 600) — never committed to git
- `keygen` refuses to run if a key already exists (delete `~/.openclaw/deploy.key` to regenerate)
- Read-only commands (`status`, `roster`) work without a deploy key
- Uses SHA-256 hash + timing-safe comparison — the raw key is never stored

## Key Constraints

- `openclaw-config.json5` is gitignored — contains real API keys, stays local only
- `~/.openclaw/` directory holds runtime config (600 permissions), vault (700), logs, workspaces
- `~/.openclaw/deploy.key` — single-owner deploy key hash, required for all agent execution
- Never auto-upgrade any platform to a paid tier — escalate to human
- All public-facing content must be reviewed by Jon Jones before deploy
- Credential patterns in outbound content are blocked immediately (no agent review needed)
