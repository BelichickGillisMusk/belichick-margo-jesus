# Slack-Ready Cheat Sheet

Copy-paste the blocks below directly into a Slack message or canvas.

---

## Block 1: Commands

```
*AGENT COMMANDS CHEAT SHEET*

*── RECON Missions ──*
`/recon-leads [query]` → :dart: Lead Scraper → `#recon-leads`
`/recon-legal [query]` → :scales: Sentinel + Mila-Legal → `#recon-legal`
`/recon-market [query]` → :mag: Kesha + Musk → `#recon-market`
`/recon-compliance [query]` → :clipboard: Mila-CARB → `#recon-compliance`
`/recon-prospect [query]` → :bust_in_silhouette: Jon Jones + Lead Scraper → `#recon-sales`
`/budget` → :moneybag: Cipher → `#alerts`

*── Control ──*
`/roster` — List all agents
`/agent-status` — Live status pulse (busy/idle, tokens used today)
`/dispatch [agent] [task]` — Send any agent a direct task
`/kill [agent]` — Kill a running agent

*── Agent IDs for /dispatch ──*
`lead-scraper` · `sentinel` · `mila-legal` · `mila-carb`
`kesha` · `musk` · `jon-jones` · `cipher`

*Example:* `/dispatch jon-jones Build a pitch for a 50-truck fleet in Fresno`
```

---

## Block 2: Web & Sites

```
*SITES & ENDPOINTS*

*── Mila Chatbot (run `npm run mila` first) ──*
:speech_balloon: Chat UI: <http://localhost:3001/widget|localhost:3001/widget>
:gear: API: `POST` <http://localhost:3001/chat|localhost:3001/chat>
:heartbeat: Health: <http://localhost:3001/health|localhost:3001/health>

*── Static Pages (open in browser) ──*
:busts_in_silhouette: Agent Dashboard: `open index.html`
:robot_face: Sales Bot Demo: `open salesbot.html`
:truck: CARB Test Stockton: `open carbteststockton/index.html`
:truck: Clean Truck Check Roseville: `open cleantruckcheckroseville/index.html`

*── GitHub ──*
:octocat: Repo: <https://github.com/BelichickGillisMusk/belichick-margo-jesus|BelichickGillisMusk/belichick-margo-jesus>
```

---

## Block 3: Agent Roster

```
*AGENT ROSTER*

:dart: *Lead Scraper* (Haiku) — Google Places leads, structured tables
:scales: *Sentinel* (Sonnet) — Legal/regulatory research, cites statutes
:books: *Mila-Legal* (Sonnet) — Pulls legal text from Congress.gov, eCFR, ILGA
:clipboard: *Mila-CARB* (Haiku) — CARB compliance expert, urgent on deadlines
:bar_chart: *Kesha* (Haiku) — Marketing intel, content gaps, audience trends
:mag: *Musk* (Haiku) — Competitive/technical analysis, structured reports
:boxing_glove: *Jon Jones* (Sonnet) — Sales pitches, A.C.E.S. framework, objection handling
:coin: *Cipher* (Haiku) — Token spend tracking, budget reports
```

---

## Block 4: Channels

```
*SLACK CHANNELS*

#recon-command — :loudspeaker: Mission dispatch (you → Belichick)
#recon-leads — :dart: Lead scraper results
#recon-legal — :scales: Sentinel + Mila-Legal findings
#recon-market — :mag: Kesha + Musk market intel
#recon-sales — :bust_in_silhouette: Jon Jones prospect dossiers
#recon-compliance — :clipboard: CARB compliance alerts
#agent-status — :green_circle: Agent dashboard
#alerts — :rotating_light: Budget warnings, errors, kill switches
```

---

## Block 5: Cost Rules

```
*COST RULES*

:moneybag: Monthly cap: *$70 total*
:warning: Flag before starting if task > *$1*
:stop_sign: Stop if burned > *$2* with no result
:brain: Gemini free tier for simple tasks, Claude for complex
```

---

## Block 6: Quick Start

```
*QUICK START*

`npm run slack` — Start Slack bot (all /recon commands go live)
`npm run mila` — Start Mila chatbot (<http://localhost:3001/widget|open widget>)
`npm run scrape` — Run lead scraper CLI
`node src/lead-scraper/index.js "trucking companies" "Sacramento CA"` — Scrape leads to CSV
```
