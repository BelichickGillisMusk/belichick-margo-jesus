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

**Runtime** (`runtime/src/`): Node.js ES modules using `@anthropic-ai/sdk`. Model: `claude-sonnet-4-20250514`.

- `cli.js` — Entry point. Routes `project`, `task`, `status`, `roster` commands.
- `orchestrator.js` — Belichick's controller. Defines three tools: `delegate` (assign work to sub-agents), `send_outbound` (external comms, gated by Jon Jones), `report` (final deliverables). Runs a tool_use loop until Belichick is done.
- `agent.js` — `runAgent()` wraps Claude API calls. Loads agent's SKILL.md as system prompt, runs tool_use loop (max 10 iterations), updates activity.json on start/completion.
- `guardian.js` — Jon Jones outbound gate. First does regex scan for credential patterns (`sk-ant-`, `AIzaSy`, `xoxb-`, `ghp_`, etc.) and blocks immediately. Then calls Jon Jones agent to review content → APPROVE / REWRITE / BLOCK / ESCALATE.
- `activity.js` — Reads/writes `agents-site/activity.json` for the Conference Room dashboard. Tracks per-agent status and a 50-entry activity feed.
- `config.js` — Agent registry (8 agents mapped to skill dirs). `getApiKey()` checks: env var → `~/.openclaw/openclaw.json` → repo `openclaw-config.json5`.

**Execution flow**: User → `cli.js project "..."` → `orchestrator.runProject()` → Belichick gets project + tool definitions → Claude returns `tool_use` blocks → `handleDelegate()` calls `agent.runAgent()` for each sub-agent → sub-agent result feeds back to Belichick → loop until `report` tool or `end_turn`.

**Skills** (`skills/*/SKILL.md`): YAML frontmatter (name, description) + markdown prompt defining role, frameworks, guardrails. Each agent's SKILL.md becomes its system prompt at runtime.

## Agent Registry

| ID | Name | Skill Dir | Role |
|----|------|-----------|------|
| `belichick` | Belichick | belichick-strategy | Orchestrator — breaks projects into tasks, delegates |
| `mila-carb` | Mila (CARB CS) | mila-carb-cs | CARB Clean Truck Check compliance support |
| `mila-legal` | Mila (Legal) | mila-legal | Regulatory research, business opportunity finder |
| `atlas` | Atlas | atlas-creative | YouTube content strategy, video production |
| `closer` | Closer | closer-sales | Sales agent (A.C.E.S. framework) |
| `jon-jones` | Jon Jones | jon-jones-guardian | Security guardian — reviews all outbound |
| `builder-deploy` | Builder-Deploy | builder-deploy | Deploy to Cloudflare/Vercel (free tier first) |
| `lead-scraper` | Lead Scraper | gemini-lead-scraper | Google Maps/Places API lead generation |

## Deployments

- **`site/`** → Cloudflare Pages at `silverbackai.agency` (static HTML, `_headers` for security)
- **`agents-site/`** → Vercel at `agents.bryanoneillgillis.com` (Conference Room dashboard, reads `activity.json`)
- **`vercel-site/`** → Vercel at `bryanoneillgillis.com` (personal site)

## Security Model (Good Claw / Bad Claw)

Internal agent work (research, drafting, code) is unrestricted. All outbound actions (email, Slack, Discord, file shares) are gatekept by Jon Jones. Three approval tiers: auto-approve (low risk, 30/hr circuit breaker), agent-approve (medium), human-approve (high risk, 60min timeout → auto-reject). `/stop` mode pauses all outbound and queues for batch review.

## Key Constraints

- `openclaw-config.json5` is gitignored — contains real API keys, stays local only
- `~/.openclaw/` directory holds runtime config (600 permissions), vault (700), logs, workspaces
- Never auto-upgrade any platform to a paid tier — escalate to human
- All public-facing content must be reviewed by Jon Jones before deploy
- Credential patterns in outbound content are blocked immediately (no agent review needed)
