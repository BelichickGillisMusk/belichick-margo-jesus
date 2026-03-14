# Raven (Telegram Bot) Setup - Step by Step

**Bot:** `@norcalro_bot`
**Agent:** Raven
**Time needed:** ~10 minutes
**Cost:** $0 (Telegram bots are free, Cloud Run free tier)

---

## Step 1: Create Artifact Registry Repo (one-time)

```bash
gcloud artifacts repositories create raven-repo \
  --repository-format=docker \
  --location=us-central1 \
  --project=mila-claude-2426-487008
```

---

## Step 2: Deploy Raven to Cloud Run

From the repo root:

```bash
cd belichick-margo-jesus

gcloud builds submit \
  --config=raven-cloudrun/cloudbuild.yaml \
  --project=mila-claude-2426-487008 \
  --substitutions=_ANTHROPIC_API_KEY="YOUR-ANTHROPIC-KEY",_TELEGRAM_BOT_TOKEN="8391551080:AAEe6MR-_y1EJkzpws8XdNLBtvCfW2Mm9Ag",_SMTP_HOST="",_SMTP_USER="",_SMTP_PASS="",_OWNER_EMAIL=""
```

Replace `YOUR-ANTHROPIC-KEY` with your actual Anthropic API key.

**SMTP is optional** — leave blank for now. Emails will be queued until you configure SMTP later.

---

## Step 3: Get the Cloud Run URL

```bash
gcloud run services describe raven-cloudrun \
  --project=mila-claude-2426-487008 \
  --region=us-central1 \
  --format='value(status.url)'
```

You'll get something like: `https://raven-cloudrun-abc123-uc.a.run.app`

---

## Step 4: Set the Telegram Webhook

Replace `<URL>` with your Cloud Run URL from Step 3:

```bash
curl "https://api.telegram.org/bot8391551080:AAEe6MR-_y1EJkzpws8XdNLBtvCfW2Mm9Ag/setWebhook?url=<URL>/telegram/webhook"
```

Should return: `{"ok":true,"result":true,"description":"Webhook was set"}`

---

## Step 5: Update the Config

Open `openclaw-config.json5` and replace `PASTE-YOUR-CLOUD-RUN-URL-HERE` with your actual URL.

---

## Step 6: Test It

1. Open Telegram on your phone
2. Search for `@norcalro_bot`
3. Tap **Start**
4. Type: `Email john@example.com about the meeting tomorrow`
5. Raven should respond with a draft

### Test Commands:
- `/start` — Welcome message
- `/help` — What Raven can do
- `/status` — Uptime and task counts
- `/tasks` — Pending tasks

### Test the health endpoint:
```bash
curl https://<URL>/health
```

---

## Step 7: Lock It Down (Optional)

Get your Telegram chat ID:

1. Send any message to the bot
2. Run:
```bash
curl "https://api.telegram.org/bot8391551080:AAEe6MR-_y1EJkzpws8XdNLBtvCfW2Mm9Ag/getUpdates" | python3 -m json.tool
```
3. Find `"chat": {"id": 123456789}`
4. Add to `openclaw-config.json5`:
```json5
"allowedChatIds": [123456789]
```

---

## Add Email Later

When you want Raven to actually send emails, redeploy with SMTP:

```bash
gcloud builds submit \
  --config=raven-cloudrun/cloudbuild.yaml \
  --project=mila-claude-2426-487008 \
  --substitutions=_ANTHROPIC_API_KEY="YOUR-KEY",_TELEGRAM_BOT_TOKEN="8391551080:AAEe6MR-_y1EJkzpws8XdNLBtvCfW2Mm9Ag",_SMTP_HOST="smtp.gmail.com",_SMTP_USER="you@gmail.com",_SMTP_PASS="your-app-password",_OWNER_EMAIL="you@gmail.com"
```

For Gmail, use an [App Password](https://myaccount.google.com/apppasswords) (not your regular password).

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Bot doesn't respond | Check webhook: `curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getWebhookInfo"` |
| Cloud Run errors | `gcloud logging read --project=mila-claude-2426-487008 --limit=10` |
| "AI service unavailable" | Check `ANTHROPIC_API_KEY` is set correctly on Cloud Run |
| Rate limited | Wait a minute. Default is 30 req/min |

---

## What You Get

Text `@norcalro_bot` on Telegram and Raven will:
- Draft and send emails for you
- Track tasks you throw at it
- Answer business and compliance questions
- Give you status reports on demand

Runs 24/7 on Cloud Run. Scales to zero when idle (free). Wakes up in ~2 seconds when you message it.
