# Telegram Bot Setup - Step by Step

**Time needed:** ~10 minutes
**Cost:** $0 (Telegram bots are free)

---

## Step 1: Create Your Bot on Telegram (2 minutes)

1. Open Telegram on your phone
2. Search for **@BotFather** (the official Telegram bot maker)
3. Tap **Start**
4. Send: `/newbot`
5. BotFather asks: "What name for your bot?" → Type: `NorCal CARB Mobile`
6. BotFather asks: "Choose a username" → Type something like: `norcalcarb_bot` (must end in `bot`)
7. BotFather gives you a **token** that looks like: `7123456789:AAH1234567890abcdefghijklmnop`
8. **COPY THAT TOKEN** — you need it in Step 2

### Optional: Make the bot look nice
While still talking to @BotFather:
- Send `/setdescription` → Pick your bot → Type: `CARB Clean Truck Check compliance help. Ask me anything about emissions testing, deadlines, and fleet compliance.`
- Send `/setabouttext` → Pick your bot → Type: `NorCal CARB Mobile - Compliance made easy`
- Send `/setuserpic` → Pick your bot → Send your logo

---

## Step 2: Save the Token on Your Mac (1 minute)

Open Terminal on your Mac and run:

```bash
# Replace the token below with YOUR token from BotFather
export TELEGRAM_BOT_TOKEN="7123456789:AAH1234567890abcdefghijklmnop"

# Make it permanent (so it survives restarts)
echo 'export TELEGRAM_BOT_TOKEN="7123456789:AAH1234567890abcdefghijklmnop"' >> ~/.zshrc
```

---

## Step 3: Get Your Mila Cloud Run URL (2 minutes)

You need the URL where Mila is running on Google Cloud. Run this in Terminal:

```bash
gcloud run services describe mila-cloudrun \
  --project=mila-claude-2426-487008 \
  --region=us-central1 \
  --format='value(status.url)'
```

This gives you something like: `https://mila-cloudrun-abc123-uc.a.run.app`

**If Mila isn't deployed yet**, deploy her first:

```bash
cd demo-repository
gcloud builds submit --config=mila-cloudrun/cloudbuild.yaml --project=mila-claude-2426-487008
```

Then run the describe command again to get the URL.

---

## Step 4: Update the Config (1 minute)

Open `openclaw-config.json5` and find the telegram section. Replace `PASTE-YOUR-CLOUD-RUN-URL-HERE` with your actual Cloud Run URL from Step 3.

Before:
```json5
"serviceUrl": "PASTE-YOUR-CLOUD-RUN-URL-HERE"
```

After:
```json5
"serviceUrl": "https://mila-cloudrun-abc123-uc.a.run.app"
```

---

## Step 5: Restart OpenClaw (30 seconds)

```bash
# If OpenClaw is running, restart it to pick up the new config
openclaw restart

# Or if starting fresh:
openclaw start
```

---

## Step 6: Test It (1 minute)

1. Open Telegram on your phone
2. Search for your bot name (e.g., `@norcalcarb_bot`)
3. Tap **Start**
4. Type: `Do I need to test my truck in California?`
5. You should get a response from Mila about CARB compliance

### Test Commands:
- `/start` — Should show welcome message
- `/help` — Should show command list
- `/status` — Should show agent status
- `My truck is 2019 Freightliner, do I need OBD test?` — Should route to Mila

---

## Step 7: Lock It Down (Optional but Recommended)

To restrict who can use the bot, get your Telegram chat ID:

1. Send any message to your bot
2. In Terminal, run:
```bash
curl "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/getUpdates" | python3 -m json.tool
```
3. Find `"chat": {"id": 123456789}` — that's your chat ID
4. Add it to `openclaw-config.json5`:
```json5
"allowedChatIds": [123456789]
```

Now only you can use the bot.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Bot doesn't respond | Check `TELEGRAM_BOT_TOKEN` is set: `echo $TELEGRAM_BOT_TOKEN` |
| Cloud Run errors | Check logs: `gcloud logging read --project=mila-claude-2426-487008 --limit=10` |
| "Unauthorized" from Cloud Run | Make sure the Cloud Run service allows unauthenticated access, or set up IAM |
| Bot responds but wrong answers | Check the Mila CARB CS skill in `skills/mila-carb-cs/SKILL.md` |
| Rate limited | Wait a minute. Default is 10 messages/min |

---

## What You Get

Once this is set up, you can text the bot from your phone and:
- Ask CARB compliance questions → Mila answers instantly
- Get fleet compliance info → No waiting for office hours
- Capture leads → Customer info goes to your lead sheet
- Check agent status → Quick pulse on what's running

The bot runs 24/7 through OpenClaw on your Mac. If your Mac sleeps, the bot sleeps too — so keep it plugged in or use a keep-alive utility.
