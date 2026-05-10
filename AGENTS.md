# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

Local-first multi-agent AI system with three runnable Node.js services and static HTML pages. See `CLAUDE.md` for full architecture, agent roster, and domain knowledge.

### Services

| Service | Command | Port | Notes |
|---------|---------|------|-------|
| Slack Bot | `npm run slack` | Socket Mode | Requires `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `SLACK_SIGNING_SECRET`, `ANTHROPIC_API_KEY` |
| Mila Chatbot | `npm run mila` | 3001 | Requires `ANTHROPIC_API_KEY`; `/health`, `/tps`, `/widget` work without it |
| Lead Scraper | `npm run scrape` | CLI (one-shot) | Requires `GOOGLE_PLACES_API_KEY` |
| Static pages | `python3 -m http.server 8080` | 8080 | `index.html`, `salesbot.html`, landing pages |

### Running tests

```
npm run check        # runs all three: test + smoke + validate:html
npm test             # unit tests only (node --test)
npm run smoke        # smoke-import of all entry points
npm run validate:html # validates static HTML files
```

No API keys are needed to run the test suite.

### Non-obvious caveats

- The `.env` file must exist (copy from `.env.example`). The Mila chatbot loads `dotenv/config` at import time; missing `.env` won't crash but leaves all config at defaults.
- The Mila chatbot loads the knowledge base file at `skills/mila-carb-cs/references/clean-truck-check-complete.md` via `readFileSync` at startup. If this file is missing, the server will crash.
- The `/chat` endpoint returns **503** when `ANTHROPIC_API_KEY` env var is empty/unset, and **500** when the key is set but invalid (the placeholder from `.env.example` triggers the 500 path).
- `salesbot.html` is intentionally fully sandboxed with `connect-src 'none'` CSP — no network calls by design.
- There is no build step; all source is plain ES modules run directly by Node.js.
- The project uses `"type": "module"` (ES modules); all imports use `.js` extensions.
