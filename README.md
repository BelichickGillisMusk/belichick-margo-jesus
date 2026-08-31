# BelichickGillisMusk

AI agent team. Local-first. Ships four runtime surfaces: a Slack bot, a CARB compliance chatbot, an orchestrator AI, and a lead scraper.

## Runtime surfaces

| Surface | Entry point | Mode |
|---------|-------------|------|
| Slack bot | `src/slack-bot/index.js` | Local or deployed |
| Mila chatbot | `src/mila-chatbot/index.js` | Local or Cloud Run |
| Samantha | `src/samantha/index.js` | Cloud Run (Vertex AI) |
| Lead scraper | `src/lead-scraper/index.js` | CLI, operator-run |

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

Samantha is the boss/orchestrator entry point for road-side handoff. The runtime assumes `samantha@norcalcarbmobile.com` is the Google Workspace approval identity unless you override `SAMANTHA_GOOGLE_WORKSPACE_EMAIL`.

Samantha runs as a separate Express service on Cloud Run (see [Cloud Run deployment](#cloud-run-deployment)). When `SAMANTHA_URL` is set in the Slack bot's environment, direct messages and `@Samantha` Slack mentions route through the Cloud Run service instead of the local `dispatch.js` call. Each Slack user gets a rolling 20-turn conversation history that resets on process restart.

From Slack you can:

- use `/dispatch samantha [task]` for broad "take this and move it forward" requests
- use `/dispatch website-helper [task]` for GitHub → Cloudflare/Vercel shipping help
- DM @Samantha directly when `SAMANTHA_URL` is set — she carries context within the session
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
- `npm run smoke` verifies all entry points can be imported safely without booting services during CI.
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

**Slash commands:**

| Command | Mission type | Agents |
|---------|-------------|--------|
| `/recon-leads` | Lead Hunt | lead-scraper |
| `/recon-legal` | Legal Recon | sentinel, mila-legal |
| `/recon-market` | Market Intel | kesha, musk |
| `/recon-compliance` | Compliance Check | mila-carb, datasync |
| `/recon-prospect` | Prospect Deep Dive | jon-jones, lead-scraper |
| `/recon-deploy` | Deploy Assist | samantha, website-helper |
| `/recon-data` | Data Sync | datasync |
| `/recon-finance` | Financial Reconciliation | finbot |
| `/recon-aplus` | A+ Client Hunt | aplus-hunter, jon-jones |
| `/dispatch [agent] [task]` | Single-agent dispatch | any agent by ID |
| `/swarm [preset\|agent1 agent2 ...] [task]` | Parallel swarm | preset or custom list |
| `/agent-status` | Show mission log | — |
| `/budget` | Token spend report | — |
| `/kill [agent\|all]` | Cancel active missions | — |
| `/roster` | Show agents + quick actions | — |

**Swarm presets** (used with `/swarm`):

| Preset | Agents |
|--------|--------|
| `intel` (default) | kesha, musk, sentinel, mila-legal |
| `ops` | samantha, datasync, website-helper |
| `revenue` | jon-jones, lead-scraper, aplus-hunter, finbot, cipher |
| `compliance` | mila-carb, mila-legal, sentinel, datasync |
| `full` | All agents |

Needs: `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `SLACK_SIGNING_SECRET`, `ANTHROPIC_API_KEY`

Operational notes:
- Tracks mission lifecycle as `queued`, `running`, `completed`, `failed`, or `cancelled`.
- Enforces concurrent-mission and daily-token guardrails from environment variables.
- Swarm runs agents in parallel batches (configurable via `SLACK_SWARM_PARALLELISM`, default 3).
- Uses `/budget` for local token visibility instead of spending tokens on a reporting prompt.
- Quick-action buttons on `/roster` let you trigger common workflows without typing a full command.

### 3. Mila CARB Chatbot

Express server + Claude Haiku answering Clean Truck Check compliance questions. Deployed to Cloud Run; also runs locally.

```bash
npm run mila
```

- Chat API: `POST http://localhost:3001/chat`
- Health: `GET http://localhost:3001/health` — reports `backend: "vertex-ai"`
- TPS endpoint: `GET http://localhost:3001/tps` — auth-gated with `x-tps-token` header
- Web widget: `http://localhost:3001/widget`
- Delete session: `DELETE http://localhost:3001/session/:id`

Needs: Vertex AI credentials (`ANTHROPIC_VERTEX_PROJECT_ID`, `CLOUD_ML_REGION`). On Cloud Run, the service account identity provides credentials automatically. Locally, run `gcloud auth application-default login`. `ANTHROPIC_API_KEY` is **not** used by Mila.

Operational notes:
- Session history, TTL, CORS policy, and lead retention are configurable via environment variables.
- The knowledge base is loaded from `skills/mila-carb-cs/references/clean-truck-check-complete.md` at startup. Missing file → startup failure.
- `/chat` accepts an optional `lead` object with `name`, `email`, and `need` for explicit capture.
- Rate limited: 20 requests/minute per IP.

### 4. Samantha (Cloud Run)

Phone-friendly AI assistant deployed to Cloud Run. Talks to Claude via Vertex AI.

```bash
npm run samantha   # runs locally on port 8080
```

- Chat API: `POST http://localhost:8080/api/samantha/chat` — accepts `{ message, history, persona }`
- Widget: `GET http://localhost:8080/` — PWA chat UI, home-screen installable
- Status: `GET http://localhost:8080/api/samantha/status`
- Health: `GET http://localhost:8080/health`

Valid `persona` values: `"samantha"` (default executive assistant) or `"condoleezza"` (same role, more direct/road-focused tone).

Needs: Vertex AI credentials (same as Mila). See [Cloud Run deployment](#cloud-run-deployment) for the GCP setup.

## Runtime contract

### Shared (Slack bot)
- `ANTHROPIC_API_KEY` — required for Slack bot agent dispatch
- `SAMANTHA_GOOGLE_WORKSPACE_EMAIL` — Google Workspace identity (default: `samantha@norcalcarbmobile.com`)

### Slack bot
- `SLACK_BOT_TOKEN` — required
- `SLACK_APP_TOKEN` — required
- `SLACK_SIGNING_SECRET` — required
- `ALLOWED_USER_IDS` — comma-separated Slack user IDs allowed to use the bot (empty = all workspace members)
- `SLACK_MAX_CONCURRENT_MISSIONS` — max parallel missions (default: `2`)
- `SLACK_DAILY_TOKEN_BUDGET` — daily token cap (default: `60000`)
- `SLACK_MISSION_TOKEN_WARN_THRESHOLD` — warn threshold per mission (default: `12000`)
- `SLACK_SWARM_PARALLELISM` — agents per batch in `/swarm` (default: `3`)
- `SLACK_SWARM_MAX_AGENTS` — max agents in a custom swarm (default: `8`)
- `SAMANTHA_URL` — Cloud Run URL for Samantha DM routing (optional; DM integration disabled when unset)

### Mila chatbot
- `MILA_PORT` — port to listen on (default: `3001`)
- `MILA_ALLOWED_ORIGINS` — comma-separated allowed CORS origins
- `MILA_MAX_MESSAGE_CHARS` — max chars per message (default: `2000`)
- `MILA_SESSION_HISTORY_LIMIT` — messages kept per session (default: `20`)
- `MILA_SESSION_TTL_MINUTES` — idle session expiry (default: `720`)
- `MILA_MAX_ACTIVE_SESSIONS` — max concurrent sessions before LRU eviction (default: `200`)
- `MILA_LEAD_RETENTION_LIMIT` — max leads stored in-process (default: `200`)
- `ANTHROPIC_VERTEX_PROJECT_ID` — GCP project ID (default: `samantha`)
- `CLOUD_ML_REGION` — Vertex AI region (default: `us-east5`)
- `MILA_MODEL` — Claude model on Vertex (default: `claude-haiku-4-5@20251001`)
- `TPS_TOKEN` — auth token for `GET /tps` (optional; endpoint is unguarded when unset)

### Samantha service
- `PORT` — port to listen on (default: `8080`)
- `ANTHROPIC_VERTEX_PROJECT_ID` — GCP project ID (default: `samantha`)
- `CLOUD_ML_REGION` — Vertex AI region (default: `us-east5`)
- `SAMANTHA_MODEL` — Claude model on Vertex (default: `claude-haiku-4-5@20251001`)
- `SAMANTHA_MAX_TOKENS` — max response tokens (default: `1024`)
- `SAMANTHA_ALLOWED_ORIGINS` — comma-separated CORS origins (same-origin requests always allowed)
- `SAMANTHA_STATUS_TOKEN` — shared secret for the full `/api/samantha/status` diagnostic response

### Lead scraper
- `GOOGLE_PLACES_API_KEY` — required
- `GOOGLE_SHEETS_ID` — optional; CSV-only output when absent
- `GOOGLE_SERVICE_ACCOUNT_KEY` — JSON key for Sheets write access
- `SCRAPER_REQUEST_RETRIES` — retry count for transient Google API errors
- `SCRAPER_REQUEST_DELAY_MS` — delay between requests

## Agent roster

Defined in `src/slack-bot/agents.js` (runtime source of truth). `skills/*/SKILL.md` files are the human-facing prompt layer.

| Agent ID | Name | Role | Model | Surface |
|----------|------|------|-------|---------|
| `samantha` | Samantha | Chief operating intelligence — route planning, dispatch, CRM, ops | claude-sonnet-4 | Slack + Cloud Run |
| `datasync` | DataSync | CARB portal sync, VIN decode, fleet DB, test archival | claude-sonnet-4 | Slack |
| `finbot` | FinBot | QuickBooks/Stripe/PayPal reconciliation, invoice matching | claude-sonnet-4 | Slack |
| `website-helper` | Website Helper | GitHub → Cloudflare/Vercel deployment guidance | claude-sonnet-4-5 | Slack |
| `lead-scraper` | Lead Scraper | Google Places lead generation, public contact research | claude-haiku-4-5 | Scraper + Slack |
| `sentinel` | Sentinel | Deep legal and regulatory analysis with statute citations | claude-sonnet-4-5 | Slack |
| `mila-legal` | Mila-Legal | Regulatory source gathering from primary legal databases | claude-sonnet-4-5 | Slack |
| `mila-carb` | Mila-CARB | Clean Truck Check compliance customer support | claude-haiku-4-5 | Chatbot + Slack |
| `kesha` | Kesha | Marketing, content intelligence, audience opportunities | claude-haiku-4-5 | Slack |
| `musk` | Musk | Competitor analysis, tech stack intel, pricing | claude-haiku-4-5 | Slack |
| `jon-jones` | Jon Jones | Sales enablement, prospect pitches, objection handling | claude-sonnet-4-5 | Slack |
| `cipher` | Cipher | Token spend tracking, budget reporting | claude-haiku-4-5 | Slack |
| `aplus-hunter` | A+ Hunter | A+ client retest sales — pull overdue retests, book hard | claude-sonnet-4-5 | Slack |

## Cloud Run deployment

Both Mila and Samantha deploy to Google Cloud Run using the `samantha` GCP project. They authenticate to Vertex AI via the Cloud Run service account — no API key file required.

**One-time GCP setup** (in the `samantha` project):

```bash
gcloud services enable run.googleapis.com aiplatform.googleapis.com \
  artifactregistry.googleapis.com cloudbuild.googleapis.com \
  --project=samantha

gcloud iam service-accounts create samantha \
  --display-name "Samantha Cloud Run runtime" --project=samantha

for role in roles/aiplatform.user roles/run.invoker roles/logging.logWriter; do
  gcloud projects add-iam-policy-binding samantha \
    --member="serviceAccount:samantha@samantha.iam.gserviceaccount.com" \
    --role="$role"
done
```

**Deploy triggers:** The GitHub Actions workflows deploy automatically on push to `main` when the relevant source paths change:
- `.github/workflows/deploy-samantha-cloud-run.yml` — triggers on `src/samantha/**`
- `.github/workflows/deploy-mila-cloud-run.yml` — triggers on `src/mila-chatbot/**`, `skills/mila-carb-cs/**`

Both workflows also support manual `workflow_dispatch` triggers from the Actions tab.

**Required repo secrets:**
- `GCP_SA_KEY` — JSON key for a deploy service account (roles: `run.admin`, `iam.serviceAccountUser`, `artifactregistry.writer`, `cloudbuild.builds.editor`, `storage.admin`)
- `SAMANTHA_STATUS_TOKEN` — used by the Samantha workflow's post-deploy health probe (Mila does not require this)

The workflows guard against missing secrets and skip (not fail) the deploy when secrets are absent.
