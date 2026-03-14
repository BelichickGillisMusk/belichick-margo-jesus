---
name: tps-report
description: Agent accountability system. Every agent reports what it did, what it cost, and whether it was worth it. Catches waste early, tracks discoveries, enforces budget discipline. Triggers on "tps", "status", "report", "cost", "budget", "what happened", "agent status".
---

# TPS Report - Agent Accountability

Every agent checks in. No exceptions. If an agent works but doesn't report, it's wasted work. TPS catches bad spending on Day 1, not Day 30.

## TPS Format (Every Agent, Every Task)

```
═══ TPS — [AGENT NAME] ═══
Date: [YYYY-MM-DD HH:MM]
Task: [What was requested]
═════════════════════════

STATUS: [DONE / IN PROGRESS / BLOCKED / FAILED]

WHAT I DID:
- [Specific action — outcome]
- [Specific action — outcome]

RESULT: [One line — what the user gets]

TOKENS: [input + output]
COST: ~$[estimate]
TIME: [minutes]

RED FLAGS: [anything wrong, unexpected, or wasteful — or "None"]
DISCOVERIES: [better/faster/free thing found — or "None"]
═════════════════════════
```

## Cost Awareness Rules

| Situation | Action |
|-----------|--------|
| Task estimated >$1 | Flag it before starting |
| Task hits >$2 with no results | Stop and report |
| Daily spend >80% of cap | Pause all non-Priority-1 work |
| Monthly spend >$50 | Alert Bryan, switch to Haiku/free only |
| Agent running >10 min with no output | Kill and reassign |

### Monthly Budget Target: $70

| Category | Budget | Alert At |
|----------|--------|----------|
| Cloud Run compute | $20 | $15 |
| Claude API (all agents) | $50 | $35 |
| Google Places API | $0 (free tier) | 80% quota |
| Make.com | $0 (paid sub) | N/A |

## Discovery Protocol

When any agent finds something better/faster/free while working:

```
DISCOVERY — [Agent]
Date: [date]

FOUND: [What it is]
TYPE: [FREE TOOL / CHEAPER / FASTER / NEW CAPABILITY]
CURRENT: [What we use now]
PROPOSED: [What we'd switch to]
SAVINGS: $[X]/month
RISK: [What could go wrong]
EFFORT: [TRIVIAL / MODERATE / SIGNIFICANT]

STATUS: AWAITING APPROVAL
```

Rules:
- Log it, don't act on it
- Bryan reviews and says GO / NO / RESEARCH
- Only implement after approval
- No surprises

## Red Flag Detection

Auto-flag these patterns:

| Pattern | Red Flag |
|---------|----------|
| Agent repeating same task | "Stuck in loop — reassign" |
| Cost 2x estimate | "Over budget — review" |
| 3+ API errors consecutive | "Service issue — pause" |
| >10 min with no output | "Timeout — kill" |
| Agent working on Tier 4 while Tier 1 exists | "Wrong priority — redirect" |
| Same lead scraped twice | "Dedup failure — check" |

## Weekly TPS Summary (Monday Auto-Generate)

```
TPS WEEKLY — Week of [date]

AGENTS ACTIVE: [X] / [total]
TOTAL COST: $[X.XX]
LEADS CAPTURED: [X]
DEALS CLOSED: [X]
TASKS COMPLETED: [X]
RED FLAGS: [X]

PER-AGENT:
[Agent]: [status] — [tasks done] — $[cost] — [key outcome]
[repeat for each]

DISCOVERIES PENDING: [count]
BUDGET REMAINING: $[X] of $[monthly cap]

TOP PRIORITY NEXT WEEK:
1. [task]
2. [task]
3. [task]
```

## Guardrails

- NEVER skip a TPS report — every task gets logged
- NEVER hide costs or errors — transparency is the whole point
- NEVER act on discoveries without approval
- Flag waste immediately — don't wait for the weekly summary
- If an agent can't report (crashed/timeout), RECON logs it as a red flag
