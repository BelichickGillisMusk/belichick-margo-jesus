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
├── #recon-legal ────────── Sentinel/Mila report regulatory intel
├── #recon-market ───────── Nova/Atlas report market intelligence
├── #recon-sales ────────── Closer reports on prospect engagement
├── #recon-compliance ───── Mila-CARB posts compliance alerts
├── #agent-status ───────── All agents report online/busy/done
└── #alerts ─────────────── Kill switch triggers, budget warnings, failures
```

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
| `/recon-leads [query]` | Scrape business leads | Lead Scraper (Gemini) |
| `/recon-legal [topic]` | Research regulations | Sentinel + Mila-Legal |
| `/recon-market [industry]` | Market intelligence | Nova + Atlas |
| `/recon-compliance [vin]` | Check vehicle compliance | Mila-CARB |
| `/recon-prospect [company]` | Deep dive on a prospect | Closer + Lead Scraper |
| `/agent-status` | Get all agent statuses | Belichick |
| `/dispatch [agent] [task]` | Direct dispatch to any agent | Belichick (router) |
| `/kill [agent]` | Emergency stop an agent | Belichick |
| `/budget` | Current token spend report | Cipher |

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
6. Closer auto-notified if high-value prospects found

Output format in Slack:
```
:dart: LEAD HUNT COMPLETE: "trucking companies in Los Angeles CA"
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
**Agent:** Sentinel + Mila-Legal
**Channel:** #recon-legal

Workflow:
1. User fires `/recon-legal` in Slack
2. Belichick dispatches to Sentinel (deep analysis) + Mila-Legal (source gathering)
3. Agents run in parallel - Sentinel on legal databases, Mila on regulatory sites
4. Consolidated report posted to #recon-legal

Output format in Slack:
```
:scales: LEGAL RECON COMPLETE: "CARB 2027 quarterly testing"

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
**Agent:** Nova + Atlas
**Channel:** #recon-market

Workflow:
1. User fires `/recon-market` in Slack
2. Belichick dispatches Nova (audience/trend research) + Atlas (competitor sites)
3. Nova analyzes search trends, content gaps, audience size
4. Atlas reviews competitor websites, pricing, positioning
5. Combined market intelligence report posted to #recon-market

Output format in Slack:
```
:mag: MARKET INTEL: "diesel emissions testing California"

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
**Agent:** Mila-CARB
**Channel:** #recon-compliance

Workflow:
1. User fires `/recon-compliance` with VIN
2. Mila-CARB looks up vehicle details and compliance status
3. Posts compliance summary with next deadlines and action items

Output format in Slack:
```
:clipboard: COMPLIANCE CHECK: VIN ...9186

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
**Agent:** Closer + Lead Scraper
**Channel:** #recon-sales

Workflow:
1. User fires `/recon-prospect` with company name
2. Lead Scraper pulls all public info (Google, LinkedIn, web)
3. Closer analyzes the prospect and builds a custom pitch
4. Combined dossier posted to #recon-sales

Output format in Slack:
```
:bust_in_silhouette: PROSPECT DOSSIER: Pacific Fleet LLC

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

SALES ANGLE (by Closer):
- Pain point: Managing 340 annual compliance tests
- Pitch: Fleet compliance management package
- Pricing: $X/vehicle/year (all-inclusive)
- Objection prep: "We already have a tester" → mobility + scheduling advantage
- Decision maker: Operations Manager (likely)

NEXT STEP: Outreach call or email via Closer
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
   - Post "Mission dispatched" to #agent-status
   - Set agent status to BUSY
4. MONITOR execution
   - Enforce timeout (5 min max)
   - Watch for errors
5. DELIVER results to appropriate channel
   - Format output per mission type templates above
   - Attach files if applicable
6. LOG mission
   - Agent used, tokens consumed, time elapsed
   - Post summary to #agent-status
```

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

Set up automated recon missions that run on schedule:

| Mission | Schedule | Agent | Channel |
|---------|----------|-------|---------|
| New CARB regulation check | Daily 6 AM | Sentinel | #recon-legal |
| Lead scrape: new trucking companies | Weekly Monday | Lead Scraper | #recon-leads |
| Competitor website changes | Weekly Wednesday | Atlas | #recon-market |
| Fleet compliance deadline alerts | Daily 8 AM | Mila-CARB | #recon-compliance |
| Token budget report | Weekly Friday | Cipher | #alerts |

## Security & Guardrails

- **Authorized users only** - Slack user allowlist for slash commands
- **Budget caps** - Kill mission if token spend exceeds threshold
- **No PII in Slack** - Agents strip sensitive data before posting
- **Audit trail** - All dispatches logged with user, time, agent, cost
- **Kill switch** - `/kill [agent]` immediately terminates any running mission
- **Channel isolation** - Agents can ONLY post to their designated channels
- **Rate limiting** - Max 10 recon missions per hour to prevent runaway costs
