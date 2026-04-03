---
name: slack-recon-agent
description: Slack-based command center for dispatching agents on RECON missions - lead scraping, legal research, market intelligence, competitor analysis, and compliance monitoring. Agents report findings back to dedicated Slack channels. Use when coordinating multi-agent intelligence gathering, running lead pipelines, monitoring regulations, or getting real-time agent status updates. Triggers on "recon", "slack", "intelligence", "dispatch", "scout", "monitor", "surveillance", "lead hunt", "market intel", "research mission".
---

# Slack RECON Agent - Mission Command Center

Your Slack workspace is the war room. Agents get dispatched from Slack. Findings come back to Slack. Everything is logged, organized, and actionable.

## Architecture

```
SLACK WORKSPACE (BelichickGillisMusk HQ)
│
├── #recon-command ──────── Belichick dispatches missions here
├── #recon-leads ────────── Lead Scraper drops prospect lists
├── #recon-legal ────────── Sentinel/Mak report regulatory intel
├── #recon-market ───────── Kesha/Musk report market intelligence
├── #recon-sales ────────── Jon Jones reports on prospect engagement
├── #recon-compliance ───── Mak-CARB posts compliance alerts
├── #agent-status ───────── All agents report online/busy/done
└── #alerts ─────────────── Kill switch triggers, budget warnings, failures
```

## Agent Roster - Who Does What

This is the brain. Every command maps to a name. Every name maps to a job.

### `/roster` - Prints This to Slack Anytime You Forget

```
BELICHICKGILLISMUSK AGENT ROSTER
================================

AGENT           HANDLES                         SLASH COMMAND
─────           ───────                         ─────────────
Belichick       Dispatch, strategy, delegation  /dispatch, /kill, /agent-status
Lead Scraper    Find businesses, pull contacts  /recon-leads
Sentinel        Laws, regulations, compliance   /recon-legal
Mak-Legal      Statute research, citations     /recon-legal (supports Sentinel)
Mak-CARB       Clean Truck Check, VIN lookup   /recon-compliance
Kesha           Trends, SEO, audience research  /recon-market
Musk            Competitor sites, tech recon    /recon-market (supports Kesha)
Jon Jones       Prospect dossiers, pitch craft  /recon-prospect
Cipher          Token budget, cost tracking     /budget

MULTI-AGENT MISSIONS (more than one agent deploys):
  /recon-legal    → Sentinel (analysis) + Mak-Legal (source gathering)
  /recon-market   → Kesha (trends/audience) + Musk (competitor sites)
  /recon-prospect → Lead Scraper (public info) + Jon Jones (pitch strategy)
```

### Plain English Cheat Sheet

Don't remember the command? Just remember what you want:

| You Want To...                        | Say This                                      | Agent(s) On It              |
|---------------------------------------|-----------------------------------------------|-----------------------------|
| Find trucking companies in a city     | `/recon-leads trucking companies in Dallas TX` | **Lead Scraper**            |
| Check if a new law creates a business | `/recon-legal CARB 2027 quarterly testing`     | **Sentinel** + **Mak-Legal** |
| See who's competing with you          | `/recon-market diesel emissions testing CA`    | **Kesha** + **Musk**          |
| Check a truck's compliance status     | `/recon-compliance 1HGBH41JXMN109186`         | **Mak-CARB**               |
| Build a pitch for a prospect          | `/recon-prospect Pacific Fleet LLC`            | **Jon Jones** + **Lead Scraper** |
| See how much you're spending          | `/budget`                                      | **Cipher**                  |
| See who's busy right now              | `/agent-status`                                | **Belichick**               |
| Send any agent on a custom task       | `/dispatch Sentinel research Chicago zoning`   | **Whatever you pick**       |
| Stop a runaway agent                  | `/kill Sentinel`                               | **Belichick** (kills it)    |
| Forgot everything above               | `/roster`                                      | Prints this whole card      |

---

## Slack App Setup

### 1. Create Slack App
- Go to https://api.slack.com/apps → Create New App
- Choose "From Scratch"
- Name: `BelichickGillisMusk-HQ`
- Workspace: your target workspace

### 2. Bot Token Scopes (OAuth & Permissions)
Required scopes:
```
chat:write          - Post messages to channels
chat:write.public   - Post to channels bot hasn't joined
channels:read       - List channels
channels:history    - Read channel messages (for commands)
commands            - Register slash commands
files:write         - Upload lead sheets, reports
reactions:add       - React to messages (status indicators)
users:read          - Identify who's sending commands
```

### 3. Slash Commands
Register these slash commands in your Slack app:

| Command | Description | Dispatches To |
|---------|-------------|---------------|
| `/recon-leads [query]` | Scrape business leads | **Lead Scraper** (Gemini) |
| `/recon-legal [topic]` | Research regulations | **Sentinel** + **Mak-Legal** |
| `/recon-market [industry]` | Market intelligence | **Kesha** + **Musk** |
| `/recon-compliance [vin]` | Check vehicle compliance | **Mak-CARB** |
| `/recon-prospect [company]` | Deep dive on a prospect | **Jon Jones** + **Lead Scraper** |
| `/agent-status` | Get all agent statuses | **Belichick** |
| `/roster` | Print full agent-to-task cheat sheet | **Belichick** (instant, no API cost) |
| `/dispatch [agent] [task]` | Direct dispatch to any agent | **Belichick** (router) |
| `/kill [agent]` | Emergency stop an agent | **Belichick** |
| `/budget` | Current token spend report | **Cipher** |

### 4. Event Subscriptions
Subscribe to these events for real-time agent interaction:
```
message.channels    - Monitor command channels for natural language tasks
app_mention         - Respond when @BelichickGillisMusk-HQ is mentioned
```

### 5. Environment Variables
```bash
# Add to your .env or Mac keychain
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_APP_TOKEN=xapp-your-app-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_WEBHOOK_RECON_LEADS=https://hooks.slack.com/services/xxx/yyy/zzz
SLACK_WEBHOOK_RECON_LEGAL=https://hooks.slack.com/services/xxx/yyy/zzz
SLACK_WEBHOOK_RECON_MARKET=https://hooks.slack.com/services/xxx/yyy/zzz
SLACK_WEBHOOK_ALERTS=https://hooks.slack.com/services/xxx/yyy/zzz
```

## RECON Mission Types

### MISSION: Lead Hunt
**Command:** `/recon-leads trucking companies in Los Angeles CA`
**Agent:** Lead Scraper (Gemini + Google Places API)
**Channel:** #recon-leads

Workflow:
1. User fires `/recon-leads` in Slack
2. Belichick receives, validates, dispatches to Lead Scraper
3. Lead Scraper queries Google Places API
4. Results posted to #recon-leads as formatted table
5. CSV attached as file for import to Sheets
6. Jon Jones auto-notified if high-value prospects found

Output format in Slack:
```
:dart: [Lead Scraper] LEAD HUNT COMPLETE: "trucking companies in Los Angeles CA"
Found: 47 businesses | High-value: 12 | Already in pipeline: 3

Top Prospects:
┌─────────────────────┬───────────────┬────────┬─────────┐
│ Business            │ Phone         │ Rating │ Reviews │
├─────────────────────┼───────────────┼────────┼─────────┤
│ Pacific Fleet LLC   │ (213) 555-... │ 4.8    │ 342     │
│ SoCal Trucking Inc  │ (310) 555-... │ 4.6    │ 218     │
│ LA Freight Masters  │ (323) 555-... │ 4.5    │ 156     │
└─────────────────────┴───────────────┴────────┴─────────┘

Full list: [lead-hunt-2025-01-15.csv attached]
```

### MISSION: Legal Recon
**Command:** `/recon-legal new CARB regulations 2027 quarterly testing`
**Agent:** Sentinel + Mak-Legal
**Channel:** #recon-legal

Workflow:
1. User fires `/recon-legal` in Slack
2. Belichick dispatches to Sentinel (deep analysis) + Mak-Legal (source gathering)
3. Agents run in parallel - Sentinel on legal databases, Mak on regulatory sites
4. Consolidated report posted to #recon-legal

Output format in Slack:
```
:scales: [Sentinel + Mak-Legal] LEGAL RECON COMPLETE: "CARB 2027 quarterly testing"

REGULATION: HD I/M Quarterly Testing Mandate
EFFECTIVE: October 1, 2027
CITATION: California Code of Regulations, Title 13, Division 3

KEY FINDINGS:
- OBD-equipped vehicles (2013+ diesel, 2018+ alt fuel) must test 4x/year
- Agricultural vehicles and CA motorhomes exempt (stay at 1x/year)
- Creates massive demand for credentialed testers

BUSINESS OPPORTUNITY:
- Estimated 1.2M additional tests/year needed statewide
- Current tester capacity insufficient
- Mobile testing operations = lowest barrier to entry

RISK: Low | LICENSING: CARB credentialed tester (free training)
```

### MISSION: Market Intel
**Command:** `/recon-market diesel emissions testing California`
**Agent:** Kesha + Musk
**Channel:** #recon-market

Workflow:
1. User fires `/recon-market` in Slack
2. Belichick dispatches Kesha (audience/trend research) + Musk (competitor sites)
3. Kesha analyzes search trends, content gaps, audience size
4. Musk reviews competitor websites, pricing, positioning
5. Combined market intelligence report posted to #recon-market

Output format in Slack:
```
:mag: [Kesha + Musk] MARKET INTEL: "diesel emissions testing California"

MARKET SIZE: ~$340M/year (projected with 2027 quarterly mandate)
SEARCH VOLUME: "diesel emissions test near me" - 12,400/mo (trending UP)
COMPETITORS: 47 credentialed testers listed on CARB site

TOP COMPETITORS:
1. [Competitor A] - 3 locations, 4.2 rating, website outdated
2. [Competitor B] - Mobile only, 4.7 rating, strong SEO
3. [Competitor C] - Fleet-focused, no consumer presence

CONTENT GAPS:
- No competitor has YouTube presence
- "How to prepare for Clean Truck Check" = 0 quality results
- Spanish-language content = massive unserved market

RECOMMENDATION: Mobile-first, bilingual, YouTube-driven brand
```

### MISSION: Compliance Check
**Command:** `/recon-compliance 1HGBH41JXMN109186`
**Agent:** Mak-CARB
**Channel:** #recon-compliance

Workflow:
1. User fires `/recon-compliance` with VIN
2. Mak-CARB looks up vehicle details and compliance status
3. Posts compliance summary with next deadlines and action items

Output format in Slack:
```
:clipboard: [Mak-CARB] COMPLIANCE CHECK: VIN ...9186

VEHICLE: 2021 Freightliner Cascadia | GVWR: 33,000 lbs
STATUS: NON-COMPLIANT (test overdue)
LAST TEST: 2024-08-15 (PASS)
NEXT DUE: 2025-02-15 (OVERDUE)

ACTION REQUIRED:
1. Schedule test immediately - DMV hold risk
2. Fee status: $31.18 annual fee UNPAID for 2025
3. After Oct 2027: quarterly testing required

PENALTY RISK: $10,000/day per vehicle
```

### MISSION: Prospect Deep Dive
**Command:** `/recon-prospect Pacific Fleet LLC`
**Agent:** Jon Jones + Lead Scraper
**Channel:** #recon-sales

Workflow:
1. User fires `/recon-prospect` with company name
2. Lead Scraper pulls all public info (Google, LinkedIn, web)
3. Jon Jones analyzes the prospect and builds a custom pitch
4. Combined dossier posted to #recon-sales

Output format in Slack:
```
:bust_in_silhouette: [Jon Jones + Lead Scraper] PROSPECT DOSSIER: Pacific Fleet LLC

COMPANY INFO:
- Fleet size: ~85 vehicles (estimated from DOT records)
- Location: Los Angeles, CA
- Primary routes: CA, AZ, NV
- Rating: 4.8 (342 Google reviews)
- Website: pacificfleet.example.com

COMPLIANCE EXPOSURE:
- 85 vehicles x $31.18/year = $2,650/year in fees alone
- 85 vehicles x 4 tests/year (2027) = 340 tests/year needed
- Current tester: Unknown

SALES ANGLE (by Jon Jones):
- Pain point: Managing 340 annual compliance tests
- Pitch: Fleet compliance management package
- Pricing: $X/vehicle/year (all-inclusive)
- Objection prep: "We already have a tester" → mobility + scheduling advantage
- Decision maker: Operations Manager (likely)

NEXT STEP: Outreach call or email via Jon Jones
```

## Belichick Dispatch Protocol

When a RECON command comes through Slack, Belichick follows this protocol:

```
1. RECEIVE command from Slack
2. VALIDATE:
   - Is the requesting user authorized?
   - Is the requested agent available?
   - Is there budget for this mission?
3. DISPATCH to appropriate agent(s)
   - Post dispatch confirmation to #agent-status (see format below)
   - Set agent status to BUSY
4. MONITOR execution
   - Enforce timeout (5 min max)
   - Watch for errors
5. DELIVER results to appropriate channel
   - ALWAYS lead with agent name (see message format rules below)
   - Attach files if applicable
6. LOG mission
   - Agent used, tokens consumed, time elapsed
   - Post summary to #agent-status
```

### Message Format Rules - Agent Names FIRST

Every Slack message from the system follows this format so you always know WHO is talking:

**Dispatch confirmation** (posted to #agent-status):
```
[DISPATCHED] Lead Scraper → /recon-leads "trucking companies in Dallas TX"
  Requested by: @gillis | Channel: #recon-leads | Timeout: 5 min
```

**Agent working** (posted to #agent-status):
```
[BUSY] Lead Scraper — querying Google Places API (47 results so far)
[BUSY] Sentinel + Mak-Legal — scanning eCFR + ILGA databases
```

**Mission complete** (posted to target channel):
```
[Lead Scraper] LEAD HUNT COMPLETE: "trucking companies in Dallas TX"
[Sentinel + Mak-Legal] LEGAL RECON COMPLETE: "CARB 2027 quarterly testing"
[Kesha + Musk] MARKET INTEL: "diesel emissions testing California"
[Mak-CARB] COMPLIANCE CHECK: VIN ...9186
[Jon Jones + Lead Scraper] PROSPECT DOSSIER: Pacific Fleet LLC
```

**Errors** (posted to #alerts):
```
[TIMEOUT] Sentinel — /recon-legal timed out after 5 min. Task killed.
[ERROR] Lead Scraper — Google Places API returned 429 (rate limited). Retry in 60s.
[KILL] Belichick killed Sentinel per @gillis command.
```

The pattern is always: `[AGENT NAME] what happened`. No exceptions.

## Make.com Integration (Webhook Bridge)

If running OpenClaw locally, use Make.com as the webhook bridge between Slack and your Mac:

```
Slack Slash Command
  → Make.com Webhook (receives the command)
    → HTTP Request to OpenClaw Gateway (localhost via Cloudflare Tunnel or ngrok)
      → Belichick dispatches agent
        → Agent completes task
          → OpenClaw → Make.com → Slack Incoming Webhook
            → Results posted to correct channel
```

### Make.com Scenario Setup:
1. **Trigger:** Slack - Watch for slash command
2. **Router:** Route based on command type (leads/legal/market/compliance/prospect)
3. **HTTP Module:** POST to OpenClaw gateway with task payload
4. **Wait Module:** Wait for agent response (up to 5 min)
5. **Slack Module:** Post formatted results to target channel
6. **Error Handler:** Post failure to #alerts if agent times out or errors

## Cron-Based Recurring RECON

### Status Pulse (the board you can always check)

Belichick posts a status pulse to `#agent-status` on a cron schedule so you ALWAYS know the state of the board without asking.

**Schedule:** Every 2 hours during business hours (8 AM - 8 PM), plus on-demand via `/agent-status`

**Status Pulse format:**
```
AGENT STATUS PULSE — Feb 15, 2026 10:00 AM
============================================

AGENT           STATUS     LAST MISSION                              AGO
─────           ──────     ────────────                              ───
Belichick       IDLE       Dispatched Sentinel to /recon-legal       2h
Lead Scraper    IDLE       /recon-leads "trucking cos Dallas TX"     4h
Sentinel        BUSY       /recon-legal "CARB 2027 quarterly"        12m
Mak-Legal      BUSY       Supporting Sentinel (source gathering)    12m
Mak-CARB       IDLE       /recon-compliance VIN ...9186             1d
Kesha           IDLE       /recon-market "diesel emissions CA"       3d
Musk            IDLE       Supporting Kesha (competitor sites)       3d
Jon Jones       IDLE       /recon-prospect "Pacific Fleet LLC"       5d
Cipher          IDLE       /budget (weekly report)                   2d

ACTIVE MISSIONS: 1
  Sentinel + Mak-Legal → /recon-legal "CARB 2027 quarterly" (12m, ~1,200 tokens)

TODAY: 3 missions completed | 4,800 tokens used | $0.07 spent
THIS WEEK: 14 missions | 32,000 tokens | $0.48 spent
```

**Cron config for OpenClaw** (add to cron jobs):
```json5
{
  "name": "agent-status-pulse",
  "schedule": "0 8,10,12,14,16,18,20 * * *",  // Every 2 hours 8AM-8PM
  "agent": "belichick",
  "task": "Post current agent status pulse to #agent-status on Slack",
  "channel": "#agent-status"
}
```

### Recurring RECON Missions

Automated recon that runs on schedule - you wake up and the intel is already in your channels:

| Mission | Schedule | Agent | Channel |
|---------|----------|-------|---------|
| Agent status pulse | Every 2h (8AM-8PM) | Belichick | #agent-status |
| New CARB regulation check | Daily 6 AM | Sentinel | #recon-legal |
| Lead scrape: new trucking companies | Weekly Monday 7 AM | Lead Scraper | #recon-leads |
| Competitor website changes | Weekly Wednesday 7 AM | Musk | #recon-market |
| Fleet compliance deadline alerts | Daily 8 AM | Mak-CARB | #recon-compliance |
| Token budget report | Weekly Friday 5 PM | Cipher | #alerts |

**Cron config for all recurring missions:**
```json5
[
  {
    "name": "agent-status-pulse",
    "schedule": "0 8,10,12,14,16,18,20 * * *",
    "agent": "belichick",
    "task": "Post agent status pulse to #agent-status"
  },
  {
    "name": "carb-regulation-watch",
    "schedule": "0 6 * * *",
    "agent": "sentinel",
    "task": "Check CARB website and eCFR for new HD I/M regulations. Post findings to #recon-legal."
  },
  {
    "name": "weekly-lead-scrape",
    "schedule": "0 7 * * 1",
    "agent": "lead-scraper",
    "task": "Scrape Google Places for new trucking companies, freight brokers, and fleet mgmt in CA. Post to #recon-leads."
  },
  {
    "name": "competitor-watch",
    "schedule": "0 7 * * 3",
    "agent": "musk",
    "task": "Check competitor websites for pricing, service, or content changes. Post to #recon-market."
  },
  {
    "name": "compliance-deadline-alerts",
    "schedule": "0 8 * * *",
    "agent": "mila-carb",
    "task": "Check fleet compliance deadlines within 7 days. Post alerts to #recon-compliance."
  },
  {
    "name": "weekly-budget-report",
    "schedule": "0 17 * * 5",
    "agent": "cipher",
    "task": "Compile weekly token spend, cost breakdown by agent, and budget forecast. Post to #alerts."
  }
]
```

## Security & Guardrails

- **Authorized users only** - Slack user allowlist for slash commands
- **Budget caps** - Kill mission if token spend exceeds threshold
- **No PII in Slack** - Agents strip sensitive data before posting
- **Audit trail** - All dispatches logged with user, time, agent, cost
- **Kill switch** - `/kill [agent]` immediately terminates any running mission
- **Channel isolation** - Agents can ONLY post to their designated channels
- **Rate limiting** - Max 10 recon missions per hour to prevent runaway costs
