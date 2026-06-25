# TPS REPORTS — Agent Status Checkpoints
## BelichickGillisMusk Operations

**What this is:** Every agent checks in with a TPS (Task Progress Status) report. If an agent is working on the wrong thing, wasting tokens, or stuck — we catch it here, not after $50 in API calls.

**How it works:**
1. Automated agents (Mila Autonomous, Evening Wrap-Up) report via GitHub Issues every run
2. Mila Cloud Run reports via `/tps` endpoint (live health + task history)
3. Skill-based agents (Atlas, Closer, Belichick, etc.) report when invoked
4. The TPS workflow collects everything into one weekly summary issue

---

## AGENT ROSTER & STATUS

| Agent | Role | Deployed? | Reports How | Check Frequency |
|-------|------|-----------|-------------|-----------------|
| **Mila (Cloud Run)** | Customer Service + SEO Execution | YES — Cloud Run | `/tps` endpoint + GitHub Issue | Every task + daily rollup |
| **Mila (Autonomous)** | Infra Monitoring | YES — GitHub Actions | GitHub Issue per run | Every 6 hours |
| **Mila (Evening Wrap-Up)** | Daily Summary | YES — GitHub Actions | GitHub Issue per run | Daily 5 PM PT |
| **Mila (Revenue Report)** | Revenue Tracking | YES — GitHub Actions | GitHub Issue per run | Weekly Monday |
| **Mila (Calendar Sync)** | Calendar Briefing | YES — GitHub Actions | GitHub Issue per run | Daily 7 AM PT |
| **Mila (Retention)** | Client Follow-Up | YES — GitHub Actions | GitHub Issue per run | Weekly Monday |
| **Belichick** | Strategy / Orchestrator | Skill only | On-invoke report | When called |
| **Atlas** | YouTube / Creative | Skill only | On-invoke report | When called |
| **Closer** | Sales | Skill only | On-invoke report | When called |
| **Gemini Lead Scraper** | Lead Generation | Skill only | Google Sheets log | When called |
| **Mila Legal** | Regulatory Research | Skill only | On-invoke report | When called |

---

## TPS REPORT FORMAT

Every agent uses this exact format. No exceptions.

```
═══════════════════════════════════════════════
TPS REPORT — [AGENT NAME]
Date: [YYYY-MM-DD HH:MM PT]
═══════════════════════════════════════════════

STATUS: [ONLINE / IDLE / ERROR / BLOCKED]

WHAT I DID SINCE LAST REPORT:
- [Specific task 1 — outcome]
- [Specific task 2 — outcome]
- [Specific task 3 — outcome]

WHAT I'M WORKING ON NOW:
- [Current task — % complete — ETA]

WHAT'S NEXT:
- [Next planned task]
- [Next planned task]

BLOCKED ON:
- [What's stopping progress — who needs to fix it]
- (or "Nothing — all clear")

TOKENS USED: [approximate if available]
COST ESTIMATE: [$ if available]

RED FLAGS:
- [Anything that looks wrong, unexpected, or needs human attention]
- (or "None")

DISCOVERIES:
- [Something better/faster/free found while working]
- (or "None this session")
═══════════════════════════════════════════════
```

---

## DISCOVERIES — The Recommendation Queue

**What this is:** When any agent is working and stumbles onto something useful — a free tool, a cheaper API, a faster approach, a better workflow — they don't just act on it. They log it here and wait for Bryan's go-ahead.

**Why:** Agents should be helpful, not surprising. No agent should switch tools, change workflows, or adopt new services without approval. But we also don't want to lose good ideas.

### How It Works

1. Agent finds something while working (free SEO tool, cheaper hosting, faster API)
2. Agent logs it as a **Discovery** in its TPS report
3. Discovery shows up in the weekly TPS summary issue on GitHub
4. Bryan reviews and responds:
   - **"GO"** → Agent implements it
   - **"NO"** → Agent ignores it, moves on
   - **"RESEARCH MORE"** → Agent digs deeper, reports back next TPS
5. Approved discoveries get added to the playbook / agent config

### Discovery Format

Every discovery uses this exact format:

```
🔍 DISCOVERY — [Agent Name]
Date: [YYYY-MM-DD]

FOUND: [What the tool/service/approach is]
WHERE: [How the agent found it — during what task]
TYPE: [FREE TOOL / CHEAPER ALTERNATIVE / FASTER APPROACH / NEW CAPABILITY]

CURRENT: [What we're using now for this]
PROPOSED: [What we'd switch to]

WHY IT'S BETTER:
- [Specific benefit 1 — with numbers if possible]
- [Specific benefit 2]

COST IMPACT:
- Current cost: $[X]/month
- Proposed cost: $[X]/month
- Savings: $[X]/month

RISK:
- [What could go wrong]
- [Migration effort: TRIVIAL / MODERATE / SIGNIFICANT]

RECOMMENDATION: [SWITCH / TEST FIRST / KEEP IN MIND]
STATUS: ⏳ AWAITING APPROVAL
```

### Discovery Categories

| Type | Example | Who Typically Finds It |
|------|---------|----------------------|
| **FREE TOOL** | Free SEO audit tool vs paid one | Mila, Atlas |
| **CHEAPER ALTERNATIVE** | Cheaper image CDN | Atlas, Mila Cloud Run |
| **FASTER APPROACH** | Batch API vs individual calls | Any agent |
| **NEW CAPABILITY** | New Google API feature we could use | Mila Legal, Lead Scraper |
| **BETTER WORKFLOW** | Automation that replaces manual steps | Belichick, Mila |
| **COMPETITIVE INTEL** | Competitor using a tool/strategy we should adopt | Atlas, Closer |
| **REGULATORY CHANGE** | New law that creates opportunity | Mila Legal, Sentinel |
| **FREE TIER UPGRADE** | Service we pay for now has a free tier | Any agent |

### Approval Workflow

**Via GitHub Issues (preferred):**
When the weekly TPS report lists discoveries, Bryan comments on the issue:
- `GO: Discovery #1` → Agent acts on it
- `NO: Discovery #2` → Filed away, no action
- `RESEARCH: Discovery #3` → Agent investigates further

**Via Mila Cloud Run:**
- `POST /discoveries` — Agent submits a discovery
- `GET /discoveries` — See all pending discoveries
- `POST /discoveries/:id/approve` — Approve (Bryan only)
- `POST /discoveries/:id/reject` — Reject (Bryan only)

### Active Discovery Queue

| # | Date | Agent | Discovery | Type | Status |
|---|------|-------|-----------|------|--------|
| — | — | — | No discoveries yet | — | — |

*This table is updated as agents report discoveries.*

---

## MILA CLOUD RUN — CHECKPOINT SCHEDULE

Mila on Cloud Run is the main project right now. These checkpoints ensure she's on track and not burning money on the wrong thing.

### Checkpoint 1: Deployment Verification (Day 1)
**When:** Immediately after Cloud Run deploy
**Check:**
- [ ] Health endpoint responds 200 at `/health`
- [ ] Chat endpoint works with test message
- [ ] Lead capture stores correctly
- [ ] SEO playbook endpoint returns full data
- [ ] CORS allows norcalcarbmobile.com
- [ ] Rate limiting works (hit it 31 times, should get 429)
- [ ] Container scales to zero after idle period
- [ ] TPS endpoint responds at `/tps`

**If WRONG:** Redeploy with fix. Do NOT leave a broken service running.

### Checkpoint 2: SEO Playbook Progress (Week 1)
**When:** 7 days after deployment
**Check:**
- [ ] Google Business Profile claimed (Y/N)
- [ ] GBP fully optimized with description + photos (Y/N)
- [ ] Title tags updated on Squarespace (Y/N)
- [ ] Schema markup added to homepage (Y/N)
- [ ] Google Search Console verified (Y/N)
- [ ] How many chat messages served?
- [ ] How many leads captured?
- [ ] Any errors in Cloud Run logs?

**If WRONG:** Adjust SEO playbook priorities. If zero chats = widget not installed or broken.

### Checkpoint 3: Content & Reviews (Week 2)
**When:** 14 days after deployment
**Check:**
- [ ] Blog post 1 published (Y/N)
- [ ] Blog post 2 published (Y/N)
- [ ] Number of Google reviews collected
- [ ] Tier 1 citations submitted (count)
- [ ] Search Console showing impressions? (Y/N)
- [ ] Chat widget live on norcalcarbmobile.com? (Y/N)
- [ ] Cloud Run cost so far: $___

**If WRONG:** If no content published, Mila drafts it. If no reviews, send review request texts.

### Checkpoint 4: Traction Check (Month 1)
**When:** 30 days after deployment
**Check:**
- [ ] Total Google reviews: ___
- [ ] GBP views this month: ___
- [ ] Website sessions this month: ___
- [ ] Leads captured via Mila: ___
- [ ] Blog posts published: ___ / 4 target
- [ ] Citations submitted: ___ / 6 target
- [ ] Cloud Run total cost: $___
- [ ] Claude API total cost: $___
- [ ] Any ranking improvements in Search Console?

**If WRONG:** Major course correction. Review what's working, kill what isn't.

### Checkpoint 5: ROI Decision (Month 3)
**When:** 90 days after deployment
**Check:**
- [ ] Total leads generated: ___
- [ ] Leads converted to customers: ___
- [ ] Revenue attributed to SEO/Mila: $___
- [ ] Total Cloud Run cost: $___
- [ ] Total Claude API cost: $___
- [ ] ROI positive? (Y/N)
- [ ] Kill, maintain, or scale?

**Decision point:** If ROI negative and no trend improvement → kill Cloud Run, keep SEO playbook manual.

---

## MILA AUTONOMOUS — CHECKPOINT SCHEDULE

Already running every 6 hours. Checkpoints are about quality, not existence.

### Weekly Check
- [ ] How many issues created this week?
- [ ] Were any FALSE ALARMS? (issues that didn't need action)
- [ ] Were any MISSES? (real problems not caught)
- [ ] Token usage this week: ___
- [ ] Estimated cost: $___

**If too many false alarms:** Tighten the system prompt, add ignore rules.
**If misses:** Expand what Mila monitors, add new task rotations.

---

## BELICHICK — CHECKPOINT (On Invoke)

Belichick is the strategist. Every time he's called, he reports:

### Pre-Task Check
- [ ] What decision is being made?
- [ ] Who did I delegate to?
- [ ] What's the token budget for this task?
- [ ] Is this actually worth doing? (expected value > cost)

### Post-Task Check
- [ ] Decision made: ___
- [ ] Agents used: ___
- [ ] Tokens consumed: ___
- [ ] Outcome: ___
- [ ] Should this be automated or was one-time enough?

---

## ATLAS — CHECKPOINT (On Invoke)

Atlas handles creative/YouTube. Every task gets:

### Pre-Task Check
- [ ] What content is being created?
- [ ] Target keyword / audience?
- [ ] Estimated token usage?

### Post-Task Check
- [ ] Content delivered: [type — title]
- [ ] SEO optimized? (Y/N)
- [ ] Published? (Y/N)
- [ ] Tokens used: ___
- [ ] Quality self-assessment: [1-5]

---

## CLOSER — CHECKPOINT (On Invoke)

Closer handles sales conversations. Every session gets:

### Pre-Task Check
- [ ] Who is the prospect?
- [ ] What service are we selling?
- [ ] What's the expected deal value?

### Post-Task Check
- [ ] Outcome: [CLOSED / FOLLOW-UP / LOST / DISQUALIFIED]
- [ ] Objections encountered: ___
- [ ] Next step: ___
- [ ] Did I stop after 3 "no"s? (Y/N)

---

## GEMINI LEAD SCRAPER — CHECKPOINT (On Invoke)

Lead scraper pulls contacts from Google Maps. Every run gets:

### Pre-Task Check
- [ ] Search query / area: ___
- [ ] Expected lead count: ___
- [ ] Google Places API calls estimated: ___

### Post-Task Check
- [ ] Leads scraped: ___
- [ ] Leads deduplicated: ___
- [ ] Added to Sheets: (Y/N)
- [ ] API calls used: ___
- [ ] Cost: $___

---

## MILA LEGAL — CHECKPOINT (On Invoke)

Legal research agent. Every investigation gets:

### Pre-Task Check
- [ ] What regulation/law being researched?
- [ ] What business opportunity are we evaluating?
- [ ] Token budget: ___

### Post-Task Check
- [ ] Opportunities identified: ___
- [ ] Viable? (Y/N for each)
- [ ] Licensing required: ___
- [ ] Startup cost estimate: $___
- [ ] Risk level: [LOW / MEDIUM / HIGH]
- [ ] Recommendation: [PURSUE / SKIP / NEEDS MORE RESEARCH]

---

## COST TRACKING

### Monthly Budget Caps

| Agent/System | Monthly Budget | Alert At |
|-------------|---------------|----------|
| Mila Cloud Run (compute) | $20 | $15 |
| Claude API (all agents) | $50 | $35 |
| Google Places API | $0 (free tier) | 80% of quota |
| Make.com | Already paid | N/A |
| **TOTAL** | **$70** | **$50** |

### Where to Check Costs
- Cloud Run: `console.cloud.google.com/run` → project `mila-claude-2426-487008`
- Claude API: `console.anthropic.com/settings/billing`
- Google Places: `console.cloud.google.com/apis/dashboard`

---

## HOW TO READ THE WEEKLY TPS SUMMARY

Every Monday, the TPS workflow creates a single GitHub Issue that looks like:

```
📋 TPS Report — Week of Feb 17, 2026

ACTIVE AGENTS: 4/11
TOTAL COST THIS WEEK: $X.XX
LEADS CAPTURED: X
ISSUES CREATED: X
RED FLAGS: X

Per-Agent Breakdown:
[Each agent's report in the format above]
```

Scan RED FLAGS first. If none, you're good. If any, handle them.

---

**Remember: The point of TPS reports is to catch problems EARLY. If Mila is burning $5/day on nonsense chat, we want to know on Day 1, not Day 30.**

**Discoveries: Agents find better stuff all the time. They log it, you approve it, THEN they act. No surprises.**
