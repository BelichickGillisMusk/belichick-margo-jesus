# Security — BelichickGillisMusk Runtime

## Controls in place (as of June 2026)

### 1. Mila `/tps` endpoint auth-gate (HIGH)

The `/tps` endpoint on the Mila chatbot server returns leads and session data. Anonymous callers now receive a minimal status-only JSON response. Full data requires the `x-mila-token` request header with the value set in `MILA_STATUS_TOKEN`.

Comparison uses `timingSafeEqual` from Node's `node:crypto` to prevent timing attacks.

```
MILA_STATUS_TOKEN=<random 32+ char token>
# Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 2. Rate limiting — Mila and Samantha chat endpoints (HIGH)

Both `POST /chat` (Mila) and `POST /api/samantha/chat` (Samantha) enforce **20 requests per minute per IP** via `express-rate-limit`. Requests over the limit return HTTP 429. This prevents unbounded Vertex AI credit burn from unauthenticated callers.

### 3. Samantha chat history sanitization (MEDIUM)

The Samantha `/api/samantha/chat` endpoint validates every history entry in the request body before forwarding it to the model. Only entries with:
- `role` equal to `"user"` or `"assistant"` (not `"system"`, not arbitrary strings)
- `content` that is a non-empty string within `SAMANTHA_MAX_MESSAGE_CHARS`

…are forwarded. This blocks prompt injection via crafted history arrays.

### 4. Slack bot fail-open warning (MEDIUM)

The Slack bot emits a startup console warning when `ALLOWED_USER_IDS` is empty, indicating all workspace members can use slash commands. Set `ALLOWED_USER_IDS` to a comma-separated list of Slack user IDs to restrict access.

```
ALLOWED_USER_IDS=U01ABC123,U02DEF456
```

---

## Environment variables that affect security posture

| Variable | Service | Effect |
|----------|---------|--------|
| `MILA_STATUS_TOKEN` | Mila | Token required in `x-mila-token` header for full `/tps` response |
| `SAMANTHA_STATUS_TOKEN` | Samantha | Same pattern for Samantha's `/api/samantha/status` |
| `ALLOWED_USER_IDS` | Slack bot | Restricts slash command usage to listed Slack user IDs (comma-separated). Empty = allow all |
| `MILA_MAX_MESSAGE_CHARS` | Mila | Max characters per incoming message. Rejects oversized payloads. Default: 2000 |
| `SAMANTHA_MAX_MESSAGE_CHARS` | Samantha | Same for Samantha. Default: 2000 |
| `MILA_ALLOWED_ORIGINS` | Mila | CORS allowed origins for `/chat`. Empty = allow all (development only) |
| `SAMANTHA_ALLOWED_ORIGINS` | Samantha | Same for Samantha |

---

## Credential patterns blocked by Jon Jones

The Jon Jones guardian agent regex-scans all outbound content for credential patterns before any external delivery. Blocked patterns include:

```
sk-ant-   # Anthropic API keys
AIzaSy    # Google/Gemini API keys
xoxb-     # Slack bot tokens
ghp_      # GitHub personal access tokens
```

Matches trigger an immediate BLOCK (no agent review). This applies to Slack messages, emails, and any `send_outbound` action.

---

## Reporting a vulnerability

Open a private GitHub security advisory on this repository, or contact the repo owner directly. There is no public bug bounty program.
