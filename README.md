# BelichickGillisMusk

AI agent team. Local-first. Ships three real bots.

## Quick Start

```bash
npm install
cp .env.example .env   # fill in your keys
```

## The Bots

### 1. Lead Scraper
Hits Google Places API, pulls business contacts, dumps to Sheets + CSV.

```bash
npm run scrape -- "trucking companies" "Los Angeles CA"
```

Needs: `GOOGLE_PLACES_API_KEY` (optional: `GOOGLE_SHEETS_ID` + service account for Sheets export)

### 2. Slack Bot
Real Slack bot with slash commands that dispatch agents to Claude.

```bash
npm run slack
```

Commands: `/recon-leads`, `/recon-legal`, `/recon-market`, `/recon-compliance`, `/recon-prospect`, `/dispatch`, `/agent-status`, `/roster`, `/budget`, `/kill`

Needs: `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `SLACK_SIGNING_SECRET`, `ANTHROPIC_API_KEY`

### 3. Mila CARB Chatbot
Express server + Claude Haiku answering Clean Truck Check compliance questions.

```bash
npm run mila
```

- Chat API: `POST http://localhost:3001/chat`
- Web widget: `http://localhost:3001/widget`

Needs: `ANTHROPIC_API_KEY`

## Agent Roster

| Agent | Role | Used By |
|-------|------|---------|
| Belichick | Orchestrator | Slack bot (dispatch) |
| Mila-CARB | CARB compliance CS | Chatbot + Slack |
| Mila-Legal | Regulatory research | Slack |
| Sentinel | Legal deep analysis | Slack |
| Kesha | Marketing/trends | Slack |
| Musk | Tech/competitor intel | Slack |
| Jon Jones | Sales/prospect pitches | Slack |
| Cipher | Budget tracking | Slack |
| Lead Scraper | Google Places leads | Scraper + Slack |
