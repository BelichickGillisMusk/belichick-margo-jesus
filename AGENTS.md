# AGENTS.md

## Cursor Cloud specific instructions

### Services overview

| Service | Command | Port | Requires API Key |
|---------|---------|------|------------------|
| Mila CARB Chatbot | `npm run mila` | 3001 | `ANTHROPIC_API_KEY` (for `/chat`; health/widget work without it) |
| Slack Bot | `npm run slack` | — (Socket Mode) | `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `SLACK_SIGNING_SECRET`, `ANTHROPIC_API_KEY` |
| Lead Scraper | `npm run scrape -- "query" "location"` | — (CLI) | `GOOGLE_PLACES_API_KEY` |

### Running tests

All validation is via `npm run check` which runs three steps:

```bash
npm test              # Node.js test runner (22 tests)
npm run smoke         # Verifies entry points can import without starting services
npm run validate:html # Checks static HTML files
```

### Non-obvious notes

- **ES modules only**: The project uses `"type": "module"` — all imports use ESM syntax. No CommonJS `require()`.
- **No build step**: Source files run directly with Node.js. No transpilation needed.
- **dotenv loaded at import time**: `dotenv/config` is imported at the top of server entry points, so `.env` is read on process start. Restart the server after changing `.env`.
- **Mila chatbot starts without a valid `ANTHROPIC_API_KEY`**: The Express server boots and serves `/health`, `/tps`, and `/widget` even without a key. Only `/chat` requires the key (returns 503 if missing, 500 if invalid).
- **Smoke test imports all entry points**: `npm run smoke` dynamically imports the 3 entry-point modules. If any module has a top-level side-effect that depends on env vars, the smoke test may fail. Currently all entry points guard side-effects behind `isMainModule()`.
- **Node 22 required**: CI uses Node 22 (`actions/setup-node` with `node-version: 22`).
- **punycode deprecation warning is cosmetic**: The `googleapis` package triggers a `[DEP0040]` warning about `punycode`. It does not affect functionality.
