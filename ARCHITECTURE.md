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

### 3. ATLAS (Technical / Web Dev)
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

### 5. NOVA (Marketing / Animation / YouTube)
**Content machine. Makes videos, designs, grows audience.**

- YouTube content strategy and scripts
- Animation planning and storyboards
- Social media content
- SEO optimization
- Thumbnail concepts
- Content calendar management
- Trend research

Skills: atlas-creative, summarize, video-frames, openai-image-gen, canvas
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

### 7. JON JONES (Guardian Bot - Good Claw / Bad Claw Firewall)
**The bouncer. Nothing leaves the building without his approval.**

- Reviews ALL outbound actions (email, Slack, Discord, Telegram, file shares)
- Scans for PII, credential leaks, legal risk, tone problems
- Auto-approves low-risk internal actions (fast lane)
- Reviews and rewrites medium-risk customer communications
- Escalates high-risk actions to human admin (invoices > $500, legal docs, new contacts)
- Produces daily audit reports
- Manages the encrypted file vault (human password required)
- Enforces AI disclosure on all external communications

Skills: jon-jones-guardian
Model: Claude Sonnet (must be smart enough to catch problems)
Fallback: Gemini Flash (routine auto-approvals only)

SECURITY:
- ONLY agent that can post to Slack/Discord/Telegram
- ONLY agent (besides Belichick) that can read inbound email
- Cannot approve its own outbound actions
- Cannot unlock the vault without human password
- Immutable audit logs (90-day retention)
- Circuit breaker: max 50 auto-approvals/hour
- Email hard caps: 10/hour, 50/day

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
| **Atlas** (Web Dev) | Simple site updates | **Gemini - FREE** | $0 |
| **Atlas** (Web Dev) | Complex code/architecture | Claude (on-demand) | $ only when needed |
| **Cipher** (Finance) | Sheets formulas, invoice gen | **Gemini - FREE** | $0 |
| **Cipher** (Finance) | Tax strategy, complex analysis | Claude (on-demand) | $ only when needed |
| **Nova** (Marketing) | Content drafts, SEO, social | **Gemini - FREE** | $0 |
| **Nova** (Marketing) | YouTube scripts, animation briefs | **Gemini - FREE** | $0 |
| **Sentinel** (Legal) | Basic law research, summaries | **Gemini - FREE** | $0 |
| **Sentinel** (Legal) | Deep regulatory analysis | Claude (on-demand) | $ only when needed |
| **Lead Scraper** | Google Maps phone/address pulls | **Gemini - FREE** | $0 |
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
| **Social Media Posting** | Nova creates content | Auto-post to platforms on schedule |
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

## Security Architecture — Good Claw / Bad Claw Model

### The Concept

Every agent is a **Good Claw** internally — free to research, draft, brainstorm, calculate.
But the moment an agent wants to touch the outside world, it becomes a **potential Bad Claw**.
**Jon Jones** sits at the boundary and decides: safe or not?

```
                         GOOD CLAW ZONE (Internal - Unrestricted)
                    ┌─────────────────────────────────────────────┐
                    │                                             │
                    │  Belichick ── strategy, planning, research  │
                    │  Mila ─────── customer Q&A drafts           │
                    │  Atlas ────── code, builds, deploys         │
                    │  Cipher ───── accounting, invoices (draft)  │
                    │  Nova ─────── content creation, scripts     │
                    │  Sentinel ─── legal research, monitoring    │
                    │  Lead Scraper  Google Maps data (read-only) │
                    │                                             │
                    │       ↓ All outbound actions queue here ↓   │
                    │                                             │
                    │  ┌─────────────────────────────────────┐    │
                    │  │         JON JONES (Guardian)        │    │
                    │  │                                     │    │
                    │  │  Review → Approve / Rewrite / Block │    │
                    │  │  Scan for: PII, creds, legal, tone  │    │
                    │  │  Log EVERYTHING to audit trail       │    │
                    │  └──────────────┬──────────────────────┘    │
                    │                 │                            │
                    └─────────────────┼────────────────────────────┘
                                      │
                         BAD CLAW ZONE │ (External - Gatekept)
                    ┌─────────────────┼────────────────────────────┐
                    │                 ▼                             │
                    │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
                    │  │  Email   │ │  Slack   │ │   Discord    │  │
                    │  │ (SMTP)   │ │  (Bot)   │ │  (Webhook)   │  │
                    │  └──────────┘ └──────────┘ └──────────────┘  │
                    │  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
                    │  │ Telegram │ │  File    │ │   External   │  │
                    │  │  (Bot)   │ │  Shares  │ │   API Calls  │  │
                    │  └──────────┘ └──────────┘ └──────────────┘  │
                    │                                              │
                    │  Rate limits: 10 emails/hr, 20 Slack/hr     │
                    │  Hard caps: 50 emails/day                    │
                    │  High-risk → Human approval required         │
                    │  Timeout: 60 min → auto-REJECT               │
                    └──────────────────────────────────────────────┘
```

### Approval Tiers

| Tier | Risk Level | Who Approves | Examples |
|------|-----------|--------------|----------|
| **Auto** | Low | Jon Jones (instant) | Internal Slack, self-reminders, read-only APIs |
| **Agent** | Medium | Jon Jones (reviews content) | Customer emails, known contact file shares, invoices < $500 |
| **Human** | High | YOU (admin) | New contacts, invoices > $500, legal docs, bulk email, vault access |

### Communication Channels — How They Work

#### Email (Gmail SMTP + IMAP)
```
Agent drafts email → Jon Jones reviews → APPROVE/REWRITE/BLOCK/ESCALATE
                                              ↓
                                     SMTP sends via Gmail
                                              ↓
                                     Logged to audit trail
```
- **Account:** Shared Gmail with app-specific password (NOT your main password)
- **Reading:** Belichick + Jon Jones can read inbound via himalaya CLI (IMAP)
- **Sending:** Only Jon Jones can trigger the actual send
- **Auto-reply:** DISABLED. Every reply needs review.
- **Rate limits:** 10/hour, 50/day hard caps

#### Slack (Bot API)
```
Agent drafts message → Jon Jones reviews → Post to channel via Bot API
```
- **Account:** Slack Bot (xoxb token) — shows as "BelichickGillisMusk Bot"
- **Reading:** Belichick + Jon Jones can read channels via Socket Mode
- **Posting:** ONLY Jon Jones posts. Other agents draft messages for him.
- **DMs:** DISABLED. Bots cannot DM people. Channel-only.
- **@mentions:** Requires human approval
- **Setup:** Create Slack App → Bot Token Scopes: `chat:write`, `channels:read`, `channels:history`

#### Discord / Telegram
- Same pattern as Slack — agents draft, Jon Jones sends
- Webhook-based posting (simpler setup)
- All messages logged and reviewed

### File Security

```
~/.openclaw/
├── workspaces/              # Isolated per-agent workspaces
│   ├── belichick/           # Only Belichick can read/write
│   ├── mila/                # Only Mila can read/write
│   ├── atlas/               # ...
│   ├── cipher/
│   ├── nova/
│   ├── sentinel/
│   └── jon-jones/           # Jon Jones can READ all (for review)
│
├── vault/                   # Encrypted file vault (AES-256-GCM)
│   ├── contracts/           # Human password required to open
│   ├── credentials/         # API keys, tokens (NOT in agent context)
│   └── legal/               # Sensitive legal documents
│
├── logs/                    # Immutable audit logs
│   └── jon-jones-audit.jsonl  # 90-day retention, every action logged
│
└── sandbox/                 # Pre-approved tools agents can use
    ├── himalaya             # Email CLI
    ├── gh                   # GitHub CLI
    ├── gcloud               # Google Cloud CLI
    ├── make-cli             # Make.com CLI
    ├── ollama               # Local models
    ├── jq                   # JSON processing
    └── curl                 # HTTP (logged, intercepted by JJ)
```

### The Failsafes (Why You Won't Get Sued)

| Risk | Failsafe | What Happens |
|------|----------|-------------|
| Agent sends offensive email | Jon Jones content scan | Blocked. Logged. Admin notified. |
| Agent leaks API key in Slack | Pattern matching (regex) | Blocked before it posts. |
| Agent spams 100 people | Rate limiter (10/hr, 50/day) | Hard-capped. Circuit breaker trips. |
| Agent promises something illegal | Legal keyword scan + disclosure | Blocked or rewritten with disclaimer. |
| Agent goes rogue (infinite loop) | 5-min timeout + 60K token cap | Auto-killed by OpenClaw gateway. |
| Agent tries to access vault | Human password required | Cannot unlock without you. |
| Agent tries to DM strangers on Slack | DM policy: disabled | Action rejected. |
| Multiple agents stampede | Max 2 concurrent + queue | Excess actions wait in line. |
| Billing runaway | Auto-disable key after error + cooldowns | Spending stops automatically. |
| You need forensics after an incident | 90-day immutable audit log | Full trail: who, what, when, why. |

---

## Full System Diagram

```
YOUR MAC
├── OpenClaw Gateway (port 18789, loopback only)
│   ├── Auth: Token-based (timing-safe)
│   ├── Bind: 127.0.0.1 ONLY
│   └── Agents:
│       ├── Belichick ─── Gemini FREE (daily) / Claude (on-demand)
│       ├── Mila ──────── Gemini FREE (CS bot) / Ollama (backup)
│       ├── Atlas ─────── Gemini FREE (simple) / Claude (complex code)
│       ├── Cipher ────── Gemini FREE (Sheets) / Claude (tax/analysis)
│       ├── Nova ──────── Gemini FREE (content) / Claude (polish)
│       ├── Sentinel ──── Gemini FREE (research) / Claude (deep analysis)
│       └── Jon Jones ─── Claude Sonnet (guardian) / Gemini Flash (auto-approvals)
│
├── Jon Jones Guardian Layer
│   ├── Intercepts: email, Slack, Discord, Telegram, file shares, ext. APIs
│   ├── Auto-approve: internal Slack, self-reminders, read-only APIs
│   ├── Agent-approve: customer emails, known contacts, invoices < $500
│   ├── Human-approve: new contacts, legal, bulk email, invoices > $500
│   ├── Content scan: PII, credentials, legal risk, tone, AI disclosure
│   └── Audit log: ~/.openclaw/logs/jon-jones-audit.jsonl (90 days)
│
├── Communication Channels
│   ├── Email (Gmail SMTP/IMAP) ─── Jon Jones gatekept
│   ├── Slack (Bot API) ──────────── Jon Jones gatekept
│   ├── Discord (Webhook) ────────── Jon Jones gatekept
│   └── Telegram (Bot API) ───────── Jon Jones gatekept
│
├── Make.com (automation layer)
│   ├── Lead capture pipelines
│   ├── Compliance deadline alerts
│   ├── Invoice/document workflows
│   ├── Social media posting
│   └── CARB regulation monitoring
│
├── File Security
│   ├── Isolated agent workspaces (strict mode)
│   ├── Encrypted vault (AES-256, human password only)
│   ├── App sandbox (pre-approved tools only)
│   └── Blocked: rm -rf, sudo, ssh, scp, nc, nmap
│
├── Kill Switches:
│   ├── Max concurrent agents: 2
│   ├── Sub-agent auto-kill: 30 min idle
│   ├── Context token cap: 60K per turn
│   ├── Agent timeout: 5 min silence
│   ├── Billing backoff: auto-disable key on errors
│   ├── Cron retention: 6 hours max
│   ├── Email rate limit: 10/hr, 50/day
│   ├── Slack rate limit: 20/hr
│   ├── Auto-approval circuit breaker: 30/hr (tightened)
│   ├── STOP MODE: /stop pauses ALL outbound, queues for batch review
│   └── Credential scan: block sk-ant-, AIzaSy, xoxb-, xapp-, ghp_, CF_ patterns
│
├── Builder-Deploy Skill:
│   ├── Platforms: Cloudflare Pages, Vercel, GitHub Pages (all free tier)
│   ├── Every deploy gets a shareable preview link
│   ├── Deploy cards posted to Slack #builds
│   ├── Cost alerts at 80% of free tier limits
│   └── NEVER auto-upgrade to paid — human approval required
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
- API keys: your keychain (or encrypted vault)

The only thing that touches the internet:
1. Claude API calls (when using Claude, not local models)
2. The Mila chat widget on your website (proxied through Vercel)
3. Email (SMTP/IMAP to Gmail — gatekept by Jon Jones)
4. Slack Bot API (gatekept by Jon Jones)
5. Discord/Telegram webhooks (gatekept by Jon Jones)
