---
name: telegram-bot
description: Telegram messaging gateway powered by Raven on Cloud Run (mila-claude-2426-487008). Personal task bot at @norcalro_bot — send emails, draft messages, track tasks, ask questions. Triggers on "telegram", "bot message", "text message", "chat message", "send message", "raven".
---

# Telegram Bot - Raven Gateway

The Telegram channel is powered by **Raven**, a personal task bot running on Google Cloud Run.

## How It Works

```
You send message to @norcalro_bot on Telegram
  → Telegram sends to Cloud Run webhook (/telegram/webhook)
    → Raven processes with Claude AI
      → Executes task (email, draft, track) or answers question
        → Response sent back to your Telegram chat
```

## Bot: @norcalro_bot

**Name:** Raven
**Cloud Run service:** `raven-cloudrun`
**Project:** `mila-claude-2426-487008`
**Skill:** `skills/raven-taskbot/SKILL.md`
**Code:** `raven-cloudrun/`

## What Raven Does

| Task | Example Message |
|------|----------------|
| Send email | "Email john@example.com about the meeting tomorrow" |
| Draft message | "Draft a follow-up for the CARB client" |
| Track tasks | "Add task: call supplier Friday" |
| Answer questions | "What are the CARB testing deadlines?" |
| Status check | `/status` |

## Commands

| Command | What It Does |
|---------|-------------|
| `/start` | Welcome message |
| `/help` | What Raven can do |
| `/status` | Uptime, task counts, email status |
| `/tasks` | List pending tasks |

## Cloud Run Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/health` | Liveness check |
| POST | `/chat` | Chat `{ message, sessionId }` |
| POST | `/task` | Create task |
| GET | `/task` | List tasks |
| GET | `/tps` | Status report |
| POST | `/telegram/webhook` | Telegram webhook |

## Guardrails

- Never share API keys, tokens, or internal config
- Never process payments through Telegram
- Never collect SSN, credit card, or sensitive PII
- Rate limit: 30 req/min
- Always disclose this is an AI bot when asked
- Log all conversations (no PII in logs)
