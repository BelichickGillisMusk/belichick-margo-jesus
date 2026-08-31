# Boardroom — Internal Agent Command UI

**URL:** https://boardroom.bryanoneillgillis.com  
**Access:** Private — Cloudflare Access / Zero Trust  
**Hosting:** Cloudflare Pages (no Vercel)  
**Source:** `cloudflare/sites/boardroom/index.html`

---

## Purpose

The Boardroom is the browser-based internal office interface for dispatching AI agents. It generates structured execution plans for the active agent team and tracks tasks via a browser-persisted Task Dashboard. It does **not** make API calls — task plans are rendered locally and copied to the agent CLI or Slack.

---

## Agent Roster

| Agent | Role | Notes |
|-------|------|-------|
| Samantha | Lead Orchestrator | Default single-agent target; multi-model |
| Condoleeza | Workspace Guru | Gmail / Drive / Calendar / Sheets / Apps Script |
| Mila | Creative & CX | ⭐ Solid Agent — reliable, always-on |
| Sloane | Content & SEO | ⭐ Solid Agent — reliable, always-on |
| Elon | Bold Execution | ⭐ Solid Agent — reliable, always-on |
| Hermes | Execution Engine | Full CLI superpowers (v0.18+) |
| Nora | Nurture & follow-up | Sequences, outreach |

**Solid Agents** (Mila, Sloane, Elon) are the reliable specialist core. Hermes is the execution powerhouse for anything requiring terminal, browser, deploys, or external integrations.

---

## Key UI Features

### Dispatch flow

1. Write a task in the **Task / Request** textarea.
2. Select agents by clicking the agent list (defaults to single-agent / Samantha).
3. Optionally attach a `.md` or `.pdf` file.
4. Click **Go** to generate an execution plan.

Plans are formatted for OpenClaw + Hermes and can be copied to your agent CLI or Slack `/dispatch`.

### Solo mode (single-agent dispatch)

- The UI **defaults to Samantha as the single agent**.
- Click **[solo]** next to any agent to instantly select only that agent.
- Single-agent dispatches auto-log to the Task Dashboard.

### Task Dashboard

The Task Dashboard (📋) is browser-persisted (`localStorage`) and Mila-powered:

- All tasks and their progress states are stored in the browser.
- Tasks auto-populate when you dispatch in solo mode.
- Use the **Quick Assign** form to manually add tasks with an agent assignment and optional file attachment.
- Click progress indicators or buttons to update task status.
- Deleting browser data clears the dashboard.

### File attachments

Both the main task input and Quick Assign accept file attachments:

| Format | Behavior |
|--------|----------|
| `.md` | Text is extracted and included inline in the task plan |
| `.pdf` | Included as a downloadable reference link (content not extracted) |

Only `.md` and `.pdf` are supported. Other formats are rejected.

### Communication Webapp

A dedicated **SMS / GChat / Slack / WhatsApp** form sends Hermes-formatted comms tasks:

- Select the channel (SMS, Google Chat, Slack, WhatsApp).
- Enter the recipient/channel and message.
- Clicking Send logs the communication to the activity feed and formats a Hermes comms command.

### Shortcuts & Reminders

Pre-built shortcut buttons cover common agent tasks:

- Mila: Make Task Dashboard, creative briefs, email CX flows
- Sloane: Blog posts, SEO content, satire
- Elon: Bold plans, first-principles analysis, ship decisions
- Hermes: Deploy to Cloudflare, run scripts, send comms, memory ops
- Samantha: Orchestrate full-team plans

---

## Hermes Superpowers Reference

When Hermes is included in the team, the plan includes full Hermes CLI capabilities:

| Category | Capabilities |
|----------|-------------|
| Core | `chat`, `skills`, `bundles`, `plugins`, `tools`, `mcp`, `computer-use`, `claw` |
| Execution | Terminal, headless browser, file ops, scripts, git |
| Integrations | Google (full), Slack, Twilio, Drive, Gmail, webhooks, cron, gateway |
| Orchestration | `moa`, fallback, sessions, memory-graph, checkpoints |
| Deploy & Infra | Cloudflare (wrangler / Pages / Workers / KV), `serve`, `dashboard`, `gui` |
| Collab | `kanban`, `project` (multi-folder workspaces), `hooks`, pairing |
| Channels | WhatsApp, Slack, portal, webhook, cron, `send` |

Invoke Hermes explicitly in your task: `"Hermes, use skills + mcp + computer-use + claw to…"`

Local Hermes binary: `~/.local/bin/hermes`

---

## Configuration & Identity

Agent identity and capability bindings come from:

- `IDENTITY.md` per agent (creature/vibe/avatar definitions)
- `AGENTS.md` per agent (operational rules and constraints)
- OpenClaw `config-agents` (bindings, channel isolation, routing)

The boardroom UI reads these patterns from its in-page AGENTS config array. Changes to the live Hermes config or IDENTITY files are not automatically reflected in the UI — update the `AGENTS` array in `index.html` to sync.

---

## Deploying Updates

The boardroom is a single static HTML file. To deploy changes:

```bash
# From repo root
wrangler pages deploy cloudflare/sites/boardroom \
  --project-name boardroom-bryanoneillgillis
```

Or push to the Cloudflare Pages GitHub integration (branch triggers auto-deploy).

The `_headers` file in `cloudflare/sites/boardroom/` controls HTTP security headers.

---

## Access Control

All traffic to `boardroom.bryanoneillgillis.com` is gated by **Cloudflare Access**. Only authenticated users (Google SSO or approved emails) can load the page. No credentials or API keys are stored in the HTML.
