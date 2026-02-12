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

## Cost Breakdown

### Option A: All Claude API (Pay Per Token)

| Agent | Model | Est. Daily Tokens | Daily Cost | Monthly Cost |
|-------|-------|-------------------|------------|--------------|
| Belichick (Admin) | Opus | 100K in / 20K out | ~$2.10 | ~$63 |
| Mila (Customer Svc) | Haiku | 50K in / 10K out | ~$0.08 | ~$2.40 |
| Atlas (Web Dev) | Sonnet | 80K in / 30K out | ~$1.14 | ~$34 |
| Cipher (Finance) | Sonnet | 30K in / 10K out | ~$0.39 | ~$12 |
| Nova (Marketing) | Sonnet | 60K in / 20K out | ~$0.78 | ~$23 |
| Sentinel (Legal) | Opus | 80K in / 15K out | ~$1.65 | ~$50 |
| **TOTAL** | | | **~$6.14/day** | **~$185/mo** |

### Option B: Hybrid - Local Models + Claude API (RECOMMENDED)

| Agent | Primary Model | Claude API For | Monthly Cost |
|-------|--------------|----------------|--------------|
| Belichick (Admin) | Claude Sonnet | Complex tasks | ~$40 |
| Mila (Customer Svc) | Ollama (Llama 3) | Nothing - fully local | $0 |
| Atlas (Web Dev) | Claude Sonnet | Coding only | ~$25 |
| Cipher (Finance) | Claude Sonnet | Calculations | ~$10 |
| Nova (Marketing) | Ollama (Llama 3) | Final polish only | ~$5 |
| Sentinel (Legal) | Claude Sonnet | Deep analysis | ~$30 |
| **TOTAL** | | | **~$110/mo** |

### Option C: Claude Max Subscription ($100/mo flat)

Use your Claude Max subscription through OpenClaw's OAuth auth profile.
- Fixed cost regardless of usage
- All agents use Claude through your subscription
- No surprise bills
- **Best value if you're already paying for Max**

| Component | Monthly Cost |
|-----------|-------------|
| Claude Max subscription | $100 |
| Electricity (Mac running 24/7) | ~$5 |
| **TOTAL** | **~$105/mo** |

### Local Infrastructure Cost (All Options)

| Item | Cost |
|------|------|
| Mac (you already own it) | $0 |
| Docker Desktop (free tier) | $0 |
| OpenClaw (open source) | $0 |
| Ollama (local models) | $0 |
| Domain/hosting (Vercel free tier) | $0 |
| Electricity (~5W idle Mac Mini) | ~$5/mo |

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
│       ├── Belichick ─── Claude API (capped)
│       ├── Mila ──────── Ollama LOCAL (no network)
│       ├── Atlas ─────── Claude API (capped)
│       ├── Cipher ────── Claude API (capped)
│       ├── Nova ──────── Ollama LOCAL / Claude API
│       └── Sentinel ──── Claude API (capped)
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
