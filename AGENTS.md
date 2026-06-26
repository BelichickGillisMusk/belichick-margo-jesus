# AGENTS.md

## Cursor Cloud specific instructions

### Overview

This is a Node.js ES module project (`"type": "module"`) with three runtime surfaces:

| Service | Command | Port/Mode | Required Env Vars |
|---------|---------|-----------|-------------------|
| **Mila CARB Chatbot** | `npm run mila` | Express on `:3001` | `ANTHROPIC_API_KEY` (for `/chat`; health/widget work without it) |
| **Slack Bot** | `npm run slack` | Socket Mode (no port) | `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `SLACK_SIGNING_SECRET`, `ANTHROPIC_API_KEY` |
| **Lead Scraper** | `npm run scrape` | CLI (run-and-exit) | `GOOGLE_PLACES_API_KEY` |

### Running tests

All tests use Node's built-in test runner with mocked externals — no API keys needed.

```bash
npm run check   # runs: npm test && npm run smoke && npm run validate:html
```

- `npm test` — 28 unit/integration tests (runtime contract, sessions, missions, scraper, Cloudflare worker, swarm)
- `npm run smoke` — verifies all three entry points import cleanly without booting services
- `npm run validate:html` — checks 9 HTML files for structural integrity

### Mila chatbot (easiest to demo)

Mila is the simplest service to run locally. It starts without Slack credentials and serves:
- `GET /health` — JSON status (always works)
- `GET /tps` — agent reporting endpoint (always works)
- `GET /widget` — embeddable chat UI (always works)
- `POST /chat` — requires a valid `ANTHROPIC_API_KEY`; returns 503 if the key is missing/empty, or 500 if the key is invalid
- `DELETE /session/:id` — clears a chat session

### Slack bot caveats

The Slack bot validates four env vars at startup and **throws immediately** if any are missing: `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `SLACK_SIGNING_SECRET`, `ANTHROPIC_API_KEY`. It cannot be started without real Slack app credentials.

### Lead scraper caveats

The scraper throws at startup if `GOOGLE_PLACES_API_KEY` is not set. Google Sheets export is optional and gracefully degrades to CSV-only if `GOOGLE_SHEETS_ID` is absent.

### Environment setup

Copy `.env.example` to `.env` and fill in real keys. See `README.md` "Runtime contract" for the full variable list.

**dotenv override gotcha:** `dotenv/config` is imported at the top of server entry points, so `.env` is read on process start. Inline env overrides (e.g. `ANTHROPIC_API_KEY=xxx npm run mila`) do NOT override `.env` values — the `dotenv` package loads the file unconditionally. Always edit `.env` directly and restart the server.

### Deprecation warning

Node 22 emits `[DEP0040] DeprecationWarning: The punycode module is deprecated` from the `googleapis` dependency. This is harmless and does not affect functionality.
