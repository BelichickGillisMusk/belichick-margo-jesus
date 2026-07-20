# BelichickGillisMusk

AI agent team. Local-first. Ships three real bots plus a road-ready Samantha orchestration layer.

## Runtime surfaces

| Surface | Entry point | Mode | Key dep |
|---------|-------------|------|---------|
| **Slack bot** | `src/slack-bot/index.js` | Local, Socket Mode | `ANTHROPIC_API_KEY` |
| **Mila chatbot** | `src/mila-chatbot/index.js` | Local, Express `:3001` | `ANTHROPIC_API_KEY` |
| **Lead scraper** | `src/lead-scraper/index.js` | Local, CLI one-shot | `GOOGLE_PLACES_API_KEY` |
| **Samantha** | `src/samantha/index.js` | Cloud Run (GCP), Express `:8080` | Vertex AI ADC |

`src/slack-bot/agents.js` is the runtime source of truth for agent definitions used by the Slack app. The `skills/*/SKILL.md` files remain the human-facing prompt and operating-reference layer.

`src/shared/runtime-contract.js` exports the canonical list of all four surfaces and their required env vars — use it as the single reference for surface enumeration in tests and docs.

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

## Samantha — Cloud Run executive assistant

Samantha is a separate Express service deployed to Google Cloud Run. She communicates with Claude through Anthropic on Vertex AI using the Cloud Run service account's Google Application Default Credentials — no `ANTHROPIC_API_KEY` needed for her at runtime.

**API:**

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | `{ status, agent, backend }` — always 200 |
| `/` or `/widget` | GET | Phone-friendly PWA chat widget |
| `/api/samantha/status` | GET | Config readiness. Full payload requires `x-samantha-token` header. |
| `/api/samantha/chat` | POST | Chat (rate-limited). Body: `{ message, history?, persona? }` |

**Personas:** `samantha` (default — brief, friendly) and `condoleezza` (authoritative, better for ops drafting). Pass via `persona` in the POST body.

**Local development:**

```bash
# One-time: authenticate with Google
gcloud auth application-default login

# Set required env vars (or add to .env)
export ANTHROPIC_VERTEX_PROJECT_ID=samantha
export CLOUD_ML_REGION=us-east5

npm run samantha
# → http://localhost:8080/widget  (phone PWA)
# → POST http://localhost:8080/api/samantha/chat
```

**Slack DM mode:** When `SAMANTHA_URL` is set in the Slack bot's `.env`, Slack DMs and @mentions to the bot are forwarded to Samantha rather than going unhandled. Leave it blank to disable.

**Samantha-first road workflow:**

The runtime assumes `samantha@norcalcarbmobile.com` is the Google Workspace approval identity unless you override `SAMANTHA_GOOGLE_WORKSPACE_EMAIL`.

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
- `ANTHROPIC_API_KEY` — used by Slack bot (not Samantha)
- `SAMANTHA_GOOGLE_WORKSPACE_EMAIL`

### Slack bot
- `SLACK_BOT_TOKEN`
- `SLACK_APP_TOKEN`
- `SLACK_SIGNING_SECRET`
- `ALLOWED_USER_IDS`
- `SLACK_MAX_CONCURRENT_MISSIONS`
- `SLACK_DAILY_TOKEN_BUDGET`
- `SLACK_MISSION_TOKEN_WARN_THRESHOLD`
- `SLACK_SWARM_MAX_AGENTS`
- `SLACK_SWARM_PARALLELISM`
- `SAMANTHA_URL` — optional; when set, Slack DMs/mentions forward to Samantha

### Samantha (Cloud Run)
Authentication is via Google Application Default Credentials. No `ANTHROPIC_API_KEY` needed — Samantha calls Claude through Vertex AI.
- `PORT` (default `8080`)
- `ANTHROPIC_VERTEX_PROJECT_ID` (default `samantha`)
- `CLOUD_ML_REGION` (default `us-east5`)
- `SAMANTHA_MODEL` — optional; defaults to `claude-haiku-4-5@20251001`
- `SAMANTHA_MAX_TOKENS` — optional; defaults to `1024`
- `SAMANTHA_ALLOWED_ORIGINS` — comma-separated; restricts CORS (default: same-origin + localhost)
- `SAMANTHA_STATUS_TOKEN` — optional; generate with `openssl rand -hex 32` to unlock the full `/api/samantha/status` payload

### Mila chatbot
- `MILA_PORT`
- `MILA_ALLOWED_ORIGINS`
- `MILA_MAX_MESSAGE_CHARS`
- `MILA_SESSION_HISTORY_LIMIT`
- `MILA_SESSION_TTL_MINUTES`
- `MILA_MAX_ACTIVE_SESSIONS`
- `MILA_LEAD_RETENTION_LIMIT`
- `MILA_STATUS_TOKEN` — optional; unlocks full `/tps` payload

### Lead scraper
- `GOOGLE_PLACES_API_KEY`
- `GOOGLE_SHEETS_ID`
- `GOOGLE_SERVICE_ACCOUNT_KEY`
- `SCRAPER_REQUEST_RETRIES`
- `SCRAPER_REQUEST_DELAY_MS`

## Agent roster

| Agent | Role | Surface |
|-------|------|---------|
| Samantha | Cloud Run executive assistant (Vertex AI) | Samantha service + Slack |
| Condoleezza | Ops advisor persona (same service as Samantha) | Samantha service |
| Website Helper | Deployment helper | Slack |
| Mila-CARB | CARB compliance CS | Chatbot + Slack |
| Mila-Legal | Regulatory research | Slack |
| Sentinel | Legal deep analysis | Slack |
| Kesha | Marketing/trends | Slack |
| Musk | Tech/competitor intel | Slack |
| Jon Jones | Sales/prospect pitches | Slack |
| Cipher | Budget tracking | Slack |
| Lead Scraper | Google Places leads | Scraper + Slack |
