# BelichickGillisMusk - Agent Architecture

## Overview

Local-first AI agent team running on OpenClaw on a Mac.
No Google Cloud. No surprise bills. Full control.

---

## The Roster

### 1. BELICHICK (Admin / Personal Assistant)
**Your right hand. The bloated one. Has access to everything YOU need.**

- Email management, calendar, reminders
- Task delegation to other agents
- Document drafting, note-taking
- Research on demand
- Coordinating all other agents
- File management, bookmarks, passwords

Skills: apple-notes, apple-reminders, github, coding-agent, summarize, 1password, notion, trello, slack, discord, himalaya (email), things-mac, tmux, canvas

Model: Claude Opus (smart, expensive - but this is YOUR assistant)
Fallback: Claude Sonnet (cheaper, still good)

---

### 2. MILA (Customer Service - CARB Website)
**Lives on the website. Only knows what's on carb.com. Sandboxed.**

- Answers customer questions from site content ONLY
- Collects leads (name, email, what they need)
- Routes complex questions to you
- Available 24/7 on the website widget
- Cannot access anything outside its training data

Skills: Custom - trained ONLY on CARB website content
Model: Claude Haiku (cheapest, fastest - perfect for CS)
Fallback: Local model (Ollama/Llama 3) for zero cost

SECURITY:
- CSP locked down (no external calls)
- Only responds about products/services on the website
- Prompt injection filtering
- Cannot collect payment info
- Logs all conversations for review

---

### 3. MUSK (Technical / Web Dev)
**Builds and maintains the website, handles deployments, fixes bugs.**

- Website development and maintenance
- Deployment to Vercel/hosting
- Bug fixes and feature additions
- Database management
- API integrations
- Performance optimization

Skills: coding-agent, github, canvas
Model: Claude Sonnet (fast coder, good value)
Fallback: Local model for simple tasks

---

### 4. CIPHER (Finance / Accountant)
**Tracks money. Invoices. Expenses. Tax prep.**

- Bookkeeping and expense tracking
- Invoice generation
- Revenue tracking across businesses
- Tax document preparation
- Budget forecasting
- Financial reports (weekly/monthly)

Skills: Custom finance skill, summarize (for reading financial docs), nano-pdf
Model: Claude Sonnet (accurate, not overkill)
Fallback: None - finance needs accuracy

---

### 5. KESHA (Marketing / Animation / YouTube)
**Content machine. Makes videos, designs, grows audience.**

- YouTube content strategy and scripts
- Animation planning and storyboards
- Social media content
- SEO optimization
- Thumbnail concepts
- Content calendar management
- Trend research

Skills: musk-creative, summarize, video-frames, openai-image-gen, canvas
Model: Claude Sonnet for strategy, Haiku for bulk content
Fallback: Local model for brainstorming

---

### 6. SENTINEL (Legal / Regulatory Research)
**Finds business opportunities in laws and regulations.**

- Research federal/state/local laws
- Identify regulatory gaps = business opportunities
- Licensing and compliance requirements
- Monitor new legislation
- Risk assessment

Skills: mila-legal, summarize
Model: Claude Opus (needs to be smart for legal analysis)
Fallback: Sonnet for basic searches

---

## Cost Breakdown - MAXIMIZED (Use What You Already Pay For)

### What You Already Have (Monthly Subs)

| Service | You Pay | What We Use It For |
|---------|---------|-------------------|
| **Gemini Pro/Developer** | Already paying | ALL grunt work: Maps scraping, Sheets, Drive, Calendar, summarization, CS bot |
| **Google Cloud** | Already paying | Gemini API free tier, Cloud Functions if needed |
| **Make.com** | Already paying | Automation workflows: lead pipelines, notifications, data sync between systems |
| **Claude Code (this)** | Already paying | Strategy, complex code, architecture, legal analysis |

### Model Assignment - Maximize Free, Minimize Paid

| Agent | Task Type | Model | Cost |
|-------|-----------|-------|------|
| **Belichick** (Admin) | Calendar, email, reminders, Drive | **Gemini - FREE** | $0 |
| **Belichick** (Admin) | Complex strategy/decisions | Claude (on-demand) | $ only when needed |
| **Mila** (Customer Svc) | CARB Q&A on website | **Gemini - FREE** | $0 |
| **Mila** (Admin assist) | Schedule tests, organize Drive | **Gemini - FREE** | $0 |
| **Musk** (Web Dev) | Simple site updates | **Gemini - FREE** | $0 |
| **Musk** (Web Dev) | Complex code/architecture | Claude (on-demand) | $ only when needed |
| **Cipher** (Finance) | Sheets formulas, invoice gen | **Gemini - FREE** | $0 |
| **Cipher** (Finance) | Tax strategy, complex analysis | Claude (on-demand) | $ only when needed |
| **Kesha** (Marketing) | Content drafts, SEO, social | **Gemini - FREE** | $0 |
| **Kesha** (Marketing) | YouTube scripts, animation briefs | **Gemini - FREE** | $0 |
| **Sentinel** (Legal) | Basic law research, summaries | **Gemini - FREE** | $0 |
| **Sentinel** (Legal) | Deep regulatory analysis | Claude (on-demand) | $ only when needed |
| **Lead Scraper** | Google Maps phone/address pulls | **Gemini - FREE** | $0 |
| **Big Gilly** (Night Shift) | Overnight dispatch, TPS collection | **Gemini - FREE** | $0 |
| **Big Gilly** (Night Shift) | Morning Briefing compilation | Claude Haiku (on-demand) | $ minimal |
| **Data Sync** | Move data between systems | **Make.com** | $0 (already paid) |

### Make.com Automation Workflows

Use Make.com for everything that's a repeating pipeline:

| Workflow | Trigger | Action |
|----------|---------|--------|
| **Lead Capture → Sheets** | Mila collects a lead on website | Auto-add to Google Sheets lead tracker |
| **Compliance Deadline Alerts** | Calendar event approaching | Send SMS/email reminder to customer |
| **Test Results → Drive** | Tester submits results | Auto-file in customer's Drive folder |
| **New CARB Regulation Alert** | RSS/web monitor on CARB site | Notify you + update Mila's knowledge |
| **Invoice Generation** | Cipher creates invoice | Auto-send via email, log in Sheets |
| **Social Media Posting** | Kesha creates content | Auto-post to platforms on schedule |
| **Fleet Compliance Check** | Weekly cron | Pull fleet status, flag non-compliant |

### Revised Monthly Cost

| Item | Cost | Notes |
|------|------|-------|
| Gemini Pro/Developer/Cloud | Already paying | Handles 80% of agent tasks |
| Make.com | Already paying | Handles all automation |
| Claude API (on-demand only) | ~$15-30/mo | ONLY for complex tasks |
| OpenClaw (open source) | $0 | |
| Ollama (backup local model) | $0 | |
| Mac electricity | ~$5 | |
| **TOTAL NEW COST** | **~$20-35/mo** | Down from $185/mo |

### What to EVALUATE for Cutting

| Service | Keep or Cut? | Why |
|---------|-------------|-----|
| Google Cloud VM (Mila's current home) | **CUT** | Moving everything local |
| Any redundant automation tool | **EVALUATE** | If Make.com covers it, cut it |
| Paid Gemini tier vs free tier | **EVALUATE** | Check if free tier covers your volume |
| Multiple Claude subscriptions | **EVALUATE** | One is enough if agents share it |

### Gemini API Free Tier Limits (Google AI Studio)

| Resource | Free Limit | Good Enough? |
|----------|-----------|-------------|
| Gemini 2.0 Flash | 15 RPM / 1M TPM / 1500 RPD | YES for most agents |
| Gemini 1.5 Pro | 2 RPM / 32K TPM / 50 RPD | YES for complex tasks |
| Gemini 1.5 Flash | 15 RPM / 1M TPM / 1500 RPD | YES for grunt work |

If you're on the paid Gemini tier, limits are much higher. Either way: plenty for agent work.

---

## Tonight's Target: Get Mila (Customer Service) Running

### Why Mila First?
- Simplest to deploy (just a chat widget on the website)
- Cheapest to run (Haiku or local model)
- Immediate value (24/7 customer service)
- Lowest risk (sandboxed, only knows site content)

### Steps:
1. Install OpenClaw on Mac: `npm install -g openclaw@latest`
2. Install Ollama on Mac: `brew install ollama`
3. Pull a local model: `ollama pull llama3`
4. Configure OpenClaw with the config from this repo
5. Scrape CARB website content into Mila's knowledge base
6. Deploy chat widget to website
7. Test with sample customer questions

---

## Security Architecture

```
YOUR MAC
├── OpenClaw Gateway (port 18789, loopback only)
│   ├── Auth: Token-based (timing-safe)
│   ├── Bind: 127.0.0.1 ONLY
│   └── Agents:
│       ├── Belichick ─── Gemini FREE (daily) / Claude (on-demand)
│       ├── Mila ──────── Gemini FREE (CS bot) / Ollama (backup)
│       ├── Musk ──────── Gemini FREE (simple) / Claude (complex code)
│       ├── Cipher ────── Gemini FREE (Sheets) / Claude (tax/analysis)
│       ├── Kesha ─────── Gemini FREE (content) / Claude (polish)
│       ├── Sentinel ──── Gemini FREE (research) / Claude (deep analysis)
│       └── Big Gilly ─── Gemini FREE (dispatch) / Haiku (briefings)
│
├── Make.com (automation layer)
│   ├── Lead capture pipelines
│   ├── Compliance deadline alerts
│   ├── Invoice/document workflows
│   ├── Social media posting
│   └── CARB regulation monitoring
│
├── Docker (optional sandboxing)
│   └── Each agent can run in isolated container
│
├── Kill Switches:
│   ├── Max concurrent agents: 2
│   ├── Sub-agent auto-kill: 30 min idle
│   ├── Context token cap: 60K per turn
│   ├── Agent timeout: 5 min silence
│   ├── Billing backoff: auto-disable key on errors
│   └── Cron retention: 6 hours max
│
└── Website Chat Widget (Mila only)
    ├── CSP: connect-src limited to YOUR domain only
    ├── Proxy: Vercel serverless function
    ├── Knowledge: ONLY CARB website content
    └── No PII collection beyond name/email
```

---

## What's NOT on Google Cloud Anymore

Everything runs on your Mac. Period.

- Gateway: localhost
- Models: local (Ollama) or API calls from your machine
- Data: your SSD
- Logs: your SSD
- Chat history: your SSD
- API keys: your keychain

The only thing that touches the internet:
1. Claude API calls (when using Claude, not local models)
2. The Mila chat widget on your website (proxied through Vercel)
3. Slack API (RECON mission dispatch and reporting)

---

## Slack RECON Integration

### Overview

Slack is the mission command center. Agents are dispatched via slash commands and report findings back to dedicated channels.

### Channel Map

| Channel | Purpose | Agents |
|---------|---------|--------|
| `#recon-command` | Mission dispatch | Belichick (receives) |
| `#recon-leads` | Prospect/lead intelligence | Lead Scraper |
| `#recon-legal` | Regulatory intel | Sentinel, Mila-Legal |
| `#recon-market` | Market research | Kesha, Musk |
| `#recon-sales` | Prospect dossiers | Jon Jones |
| `#recon-compliance` | Vehicle/fleet compliance | Mila-CARB |
| `#agent-status` | Agent status dashboard | All agents |
| `#alerts` | Budget warnings, failures | Belichick, Cipher |

### Slash Commands

| Command | What It Does |
|---------|-------------|
| `/recon-leads [query]` | Scrape business leads from Google Maps |
| `/recon-legal [topic]` | Research regulations and find opportunities |
| `/recon-market [industry]` | Competitor and market intelligence |
| `/recon-compliance [vin]` | Check vehicle compliance status |
| `/recon-prospect [company]` | Deep dive dossier on a prospect |
| `/dispatch [agent] [task]` | Direct dispatch to any agent |
| `/agent-status` | All agent statuses |
| `/budget` | Token spend report |
| `/nightshift` | Run Big Gilly's full overnight playbook on demand |
| `/kill [agent]` | Emergency stop |

### Data Flow

```
Slack Slash Command
  → Make.com Webhook (bridge)
    → OpenClaw Gateway (localhost:18789)
      → Belichick dispatches agent
        → Agent runs mission
          → Results → Make.com → Slack channel
```

### Security
- Authorized Slack users only (allowlist)
- Max 10 missions/hour, 2 concurrent
- No PII posted to Slack channels
- All missions logged with user, time, agent, cost
- Kill switch via `/kill` command

Full skill documentation: `skills/slack-recon-agent/SKILL.md`
