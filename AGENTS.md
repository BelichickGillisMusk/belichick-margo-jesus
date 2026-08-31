# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a Node.js ES module project (`"type": "module"`) with four runtime surfaces:

| Service | Command | Port/Mode | Required Env Vars |
|---------|---------|-----------|-------------------|
| **Mila CARB Chatbot** | `npm run mila` | Express on `:3001` | `ANTHROPIC_VERTEX_PROJECT_ID`, `CLOUD_ML_REGION` (Vertex AI; health/widget work without any creds locally) |
| **Samantha** | `npm run samantha` | Express on `:8080` | `ANTHROPIC_VERTEX_PROJECT_ID`, `CLOUD_ML_REGION` (Vertex AI; deployed to Cloud Run) |
| **Slack Bot** | `npm run slack` | Socket Mode (no port) | `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `SLACK_SIGNING_SECRET`, `ANTHROPIC_API_KEY` |
| **Lead Scraper** | `npm run scrape` | CLI (run-and-exit) | `GOOGLE_PLACES_API_KEY` |

**Important:** Mila and Samantha use **Vertex AI** (Claude on Google Cloud), not the standalone Anthropic API. They authenticate via Google Application Default Credentials — on Cloud Run this is the service account identity; locally you need to run `gcloud auth application-default login`. `ANTHROPIC_API_KEY` is **not** required for either of these services.

The Slack bot's `dispatch.js` still calls Claude directly via the Anthropic SDK and requires `ANTHROPIC_API_KEY`.

### Running tests

All tests use Node's built-in test runner with mocked externals — no API keys needed.

```bash
npm run check   # runs: npm test && npm run smoke && npm run validate:html
```

- `npm test` — unit/integration tests (runtime contract, sessions, missions, scraper, Cloudflare worker, swarm)
- `npm run smoke` — verifies all entry points import cleanly without booting services
- `npm run validate:html` — checks HTML files for structural integrity

### Mila chatbot (easiest to demo)

Mila is the simplest service to run locally. It starts without Slack credentials and serves:
- `GET /health` — JSON status (always works; reports `backend: "vertex-ai"`)
- `GET /tps` — agent reporting endpoint (auth-gated: requires `x-tps-token` header matching `TPS_TOKEN` env var)
- `GET /widget` — embeddable chat UI (always works)
- `POST /chat` — calls Claude Haiku via Vertex AI; returns 503 on Vertex auth errors, 400 on bad input
- `DELETE /session/:id` — clears a chat session

Mila loads its CARB compliance knowledge base from `skills/mila-carb-cs/references/clean-truck-check-complete.md` at startup. If that file is missing, startup fails.

### Samantha service

Samantha is the road-side AI assistant, deployed to Cloud Run. It exposes:
- `GET /health` — JSON status with `backend: "vertex-ai"`
- `GET /` or `/widget` — phone-friendly PWA chat widget (static HTML, cached 5 min)
- `POST /api/samantha/chat` — rate-limited (20 req/min); accepts `{ message, history, persona }`. Valid `persona` values: `"samantha"` (default) or `"condoleezza"`
- `GET /api/samantha/status` — anonymous callers get `{ ready, timestamp }`; callers with a valid `x-samantha-token` header get full diagnostic payload including Vertex config and fix instructions

### Slack bot caveats

The Slack bot validates four env vars at startup and **throws immediately** if any are missing: `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `SLACK_SIGNING_SECRET`, `ANTHROPIC_API_KEY`. It cannot be started without real Slack app credentials.

Set `SAMANTHA_URL` to the Cloud Run URL to enable Samantha DM and @mention routing. Without it, the DM integration is disabled but the rest of the bot keeps working.

### Lead scraper caveats

The scraper throws at startup if `GOOGLE_PLACES_API_KEY` is not set. Google Sheets export is optional and gracefully degrades to CSV-only if `GOOGLE_SHEETS_ID` is absent.

### Environment setup

Copy `.env.example` to `.env` and fill in real keys. See `README.md` "Runtime contract" for the full variable list.

**dotenv override gotcha:** `dotenv/config` is imported at the top of server entry points, so `.env` is read on process start. Inline env overrides (e.g. `ANTHROPIC_API_KEY=xxx npm run slack`) do NOT override `.env` values — the `dotenv` package loads the file unconditionally. Always edit `.env` directly and restart the server.

### Deprecation warning

Node 22 emits `[DEP0040] DeprecationWarning: The punycode module is deprecated` from the `googleapis` dependency. This is harmless and does not affect functionality.
