# Agent Cheat Sheet

Quick reference for all commands, endpoints, and where to see things.

---

## Slack Commands

| Command | What It Does | Agent(s) | Output Channel |
|---------|-------------|----------|----------------|
| `/roster` | List all agents and available commands | — | Current channel |
| `/agent-status` | Live status pulse: busy/idle, last task, token count | — | Current channel |
| `/dispatch [agent] [task]` | Send a task to a specific agent | Any single agent | Current channel |
| `/kill [agent]` | Kill a running agent | — | Current channel |
| `/recon-leads [query]` | Find business leads | Lead Scraper | `#recon-leads` |
| `/recon-legal [query]` | Legal/regulatory research | Sentinel + Mila-Legal | `#recon-legal` |
| `/recon-market [query]` | Market & competitive intel | Kesha + Musk | `#recon-market` |
| `/recon-compliance [query]` | CARB compliance questions | Mila-CARB | `#recon-compliance` |
| `/recon-prospect [query]` | Build prospect dossier + leads | Jon Jones + Lead Scraper | `#recon-sales` |
| `/budget` | Token spend & budget report | Cipher | `#alerts` |

### Agent IDs for `/dispatch`

```
lead-scraper    sentinel    mila-legal    mila-carb
kesha           musk        jon-jones     cipher
```

Example: `/dispatch jon-jones Build a pitch for a 50-truck fleet in Fresno`

---

## Web Endpoints (Mila Chatbot)

Start with: `npm run mila` (runs on `localhost:3001` by default)

| URL | Method | What It Does |
|-----|--------|-------------|
| `http://localhost:3001/widget` | GET | Full chat UI — open in browser to talk to Mila |
| `http://localhost:3001/chat` | POST | API endpoint — send `{ "message": "...", "sessionId": "..." }` |
| `http://localhost:3001/health` | GET | Health check — returns status + active session count |
| `http://localhost:3001/session/:id` | DELETE | Clear a conversation session |

---

## Static Sites (Open in Browser)

| File | What You See |
|------|-------------|
| `index.html` | Agent Round Table — interactive dashboard, click agents to cycle status |
| `salesbot.html` | The Office — sandboxed sales bot demo (no network, fully local) |
| `carbteststockton/index.html` | CARB Test Stockton landing page |
| `cleantruckcheckroseville/index.html` | Clean Truck Check Roseville landing page |

---

## npm Scripts

```bash
npm run slack    # Start Slack bot (all /recon commands go live)
npm run mila     # Start Mila chatbot server (localhost:3001)
npm run scrape   # Run lead scraper CLI
npm start        # Same as npm run slack
```

### Lead Scraper CLI

```bash
node src/lead-scraper/index.js "trucking companies" "Sacramento CA"
```

Output: CSV file saved locally + optional Google Sheets append.

---

## Slack Channels to Watch

| Channel | What Shows Up |
|---------|--------------|
| `#recon-command` | Mission dispatch (you to Belichick) |
| `#recon-leads` | Lead scraper results |
| `#recon-legal` | Sentinel + Mila-Legal findings |
| `#recon-market` | Kesha + Musk market intel |
| `#recon-sales` | Jon Jones prospect dossiers |
| `#recon-compliance` | CARB compliance alerts |
| `#agent-status` | Agent dashboard |
| `#alerts` | Budget warnings, errors, kill switches |

---

## Agent Quick Reference

| Agent | What They Do | Model | Personality |
|-------|-------------|-------|-------------|
| **Lead Scraper** | Find businesses via Google Places | Haiku | Data-focused, structured tables |
| **Sentinel** | Legal/regulatory research | Sonnet | Cites statutes, flags risk |
| **Mila-Legal** | Pull legal text from databases | Sonnet | Source-gatherer, summaries |
| **Mila-CARB** | CARB compliance expert | Haiku | Professional, urgent on deadlines |
| **Kesha** | Marketing & content intel | Haiku | Actionable trends, content gaps |
| **Musk** | Competitive/technical analysis | Haiku | Structured reports, recommendations |
| **Jon Jones** | Sales pitches & objection handling | Sonnet | Aggressive but honest (A.C.E.S.) |
| **Cipher** | Finance & token tracking | Haiku | Precise with numbers, flags overages |

---

## Cost Rules

- Monthly cap: **$70 total**
- Flag before starting if task will cost > **$1**
- Stop if burned > **$2** with no result
- Prefer Gemini free tier for simple tasks; Claude for complex

---

## Reports

| File | What It Is |
|------|-----------|
| `reports/tps-*.md` | Weekly agent status checkpoints |
| `reports/discoveries-*.md` | Cost-saving ideas awaiting Bryan's GO / NO / RESEARCH |
| `TPS-REPORTS.md` | How the TPS system works |
