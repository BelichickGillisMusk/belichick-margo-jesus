# BelichickGillisMusk

AI agent team. Local-first. Ships three real bots plus a road-ready Samantha orchestration layer.

## Runtime surfaces

The current runtime is intentionally split into three surfaces:

- **Slack bot** — `src/slack-bot/index.js`
- **Mila chatbot** — `src/mila-chatbot/index.js`
- **Lead scraper** — `src/lead-scraper/index.js`

`src/slack-bot/agents.js` is the runtime source of truth for agent definitions used by the Slack app. The `skills/*/SKILL.md` files remain the human-facing prompt and operating-reference layer.

## Quick start

```bash
npm install
cp .env.example .env   # fill in your keys
npm run check
```

## Cloud agent startup bootstrap

To prepare Cursor Cloud agents with Hermes Agent available on startup, run:

```bash
npm run setup:hermes
```

The bootstrap script is idempotent and does the following:

- ensures `~/.local/bin` is on `PATH` for the current shell and future bash/profile sessions
- installs `uv` if it is missing
- installs Python 3.11 through `uv` if `python3.11` is missing
- installs Playwright Chromium system dependencies on Ubuntu/apt hosts when root or sudo is available
- runs the Hermes Agent installer unless a cached `~/.hermes/hermes-agent` install and `~/.local/bin/hermes` launcher already exist

For Cursor environment setup, use this startup command:

```bash
npm ci && npm run setup:hermes
```

Run `hermes setup` after startup to configure provider credentials. Hermes config and API keys live under `~/.hermes/` and should not be committed.

## Samantha-first road workflow

Samantha is now the boss/orchestrator entry point for road-side handoff. The runtime assumes `samantha@norcalcarbmobile.com` is the Google Workspace approval identity unless you override `SAMANTHA_GOOGLE_WORKSPACE_EMAIL`.

From Slack you can now:

- use `/dispatch samantha [task]` for broad “take this and move it forward” requests
- use `/dispatch website-helper [task]` for GitHub → Cloudflare/Vercel shipping help
- use `/roster` and tap quick actions for:
  - **Samantha pulse**
  - **Lead pulse**
  - **Deploy pulse**
  - **Compliance pulse**
  - **Budget**

These quick actions are designed for phone-first use so you can kick off common work without typing a long command.

## Validation

The repo now includes lightweight validation that matches the actual Node codebase:

```bash
npm test
npm run smoke
npm run validate:html
npm run check
```

- `npm test` runs built-in Node tests for shared runtime helpers, mission tracking, Mila session handling, and scraper CSV logic.
- `npm run smoke` verifies the three entry points can be imported safely without booting services during CI.
- `npm run validate:html` checks key static HTML deliverables for basic document integrity.

GitHub Actions runs the same checks in `.github/workflows/node-validation.yml`.

## The bots

### 1. Lead Scraper

Hits Google Places API, pulls business contacts, dumps to Sheets + CSV.

```bash
npm run scrape -- "trucking companies" "Los Angeles CA"
```

Needs: `GOOGLE_PLACES_API_KEY` (optional: `GOOGLE_SHEETS_ID` + service account for Sheets export)

Operational notes:
- Retries transient Google API failures.
- Appends a sheet header only when the target sheet is empty.
- Writes CSV values with proper escaping.
- Supports numbered company-list research via:

```bash
npm run scrape -- --companies-file /absolute/path/to/companies.txt "California"
```

or

```bash
npm run scrape -- --companies-text $'1. Company One\n2. Company Two' "California"
```

- For company-list research, the scraper:
  - preserves list numbering
  - checks public website/contact pages for real public emails
  - does **not** use Hunter or ZoomInfo
  - returns `UNKNOWN` when no public email can be verified after trying public sources
  - recommends outreach targets in this order: Fleet Manager, COO, CEO

### 2. Slack Bot

Real Slack bot with slash commands that dispatch agents to Claude.

```bash
npm run slack
```

Commands: `/recon-leads`, `/recon-legal`, `/recon-market`, `/recon-compliance`, `/recon-prospect`, `/recon-deploy`, `/dispatch`, `/agent-status`, `/budget`, `/kill`, `/roster`

Needs: `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `SLACK_SIGNING_SECRET`, `ANTHROPIC_API_KEY`

Operational notes:
- Tracks mission lifecycle as `queued`, `running`, `completed`, `failed`, or `cancelled`.
- Enforces concurrent-mission and daily-token guardrails from environment variables.
- Uses `/budget` for local token visibility instead of spending tokens on a reporting prompt.
- Adds quick-action buttons so common Samantha-led workflows can be triggered from Slack without typing a full mission.

### 3. Mila CARB Chatbot

Express server + Claude Haiku answering Clean Truck Check compliance questions.

```bash
npm run mila
```

- Chat API: `POST http://localhost:3001/chat`
- Health: `GET http://localhost:3001/health`
- TPS endpoint: `GET http://localhost:3001/tps`
- Web widget: `http://localhost:3001/widget`

Needs: `ANTHROPIC_API_KEY`

Operational notes:
- Session history, TTL, CORS policy, and lead retention are configurable via environment variables.
- The knowledge base is loaded from `skills/mila-carb-cs/references/clean-truck-check-complete.md` at startup.
- `/chat` accepts an optional `lead` object with `name`, `email`, and `need` for explicit capture.

## Runtime contract

### Shared
- `ANTHROPIC_API_KEY`
- `SAMANTHA_GOOGLE_WORKSPACE_EMAIL`

### Slack bot
- `SLACK_BOT_TOKEN`
- `SLACK_APP_TOKEN`
- `SLACK_SIGNING_SECRET`
- `ALLOWED_USER_IDS`
- `SLACK_MAX_CONCURRENT_MISSIONS`
- `SLACK_DAILY_TOKEN_BUDGET`
- `SLACK_MISSION_TOKEN_WARN_THRESHOLD`

### Mila chatbot
- `MILA_PORT`
- `MILA_ALLOWED_ORIGINS`
- `MILA_MAX_MESSAGE_CHARS`
- `MILA_SESSION_HISTORY_LIMIT`
- `MILA_SESSION_TTL_MINUTES`
- `MILA_MAX_ACTIVE_SESSIONS`
- `MILA_LEAD_RETENTION_LIMIT`

### Lead scraper
- `GOOGLE_PLACES_API_KEY`
- `GOOGLE_SHEETS_ID`
- `GOOGLE_SERVICE_ACCOUNT_KEY`
- `SCRAPER_REQUEST_RETRIES`
- `SCRAPER_REQUEST_DELAY_MS`

## Agent roster

| Agent | Role | Used By |
|-------|------|---------|
| Samantha | Boss/orchestrator | Slack |
| Website Helper | Deployment helper | Slack |
| Mila-CARB | CARB compliance CS | Chatbot + Slack |
| Mila-Legal | Regulatory research | Slack |
| Sentinel | Legal deep analysis | Slack |
| Kesha | Marketing/trends | Slack |
| Musk | Tech/competitor intel | Slack |
| Jon Jones | Sales/prospect pitches | Slack |
| Cipher | Budget tracking | Slack |
| Lead Scraper | Google Places leads | Scraper + Slack |
