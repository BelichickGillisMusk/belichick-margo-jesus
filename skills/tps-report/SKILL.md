# TPS Report Skill — Agent Status Collection

## What This Does

When any agent is invoked, it should include a TPS (Task Progress Status) block in its response. This ensures every piece of work is tracked and Bryan can see what happened, what it cost, and whether it was the right call.

## How Agents Use This

### At Start of Any Task

Before doing work, the agent announces:
```
📋 TPS CHECK-IN: [Agent Name]
Starting: [task description]
Expected cost: ~$[estimate]
```

### At End of Any Task

After completing work, the agent includes:
```
═══════════════════════════════════════════════
TPS REPORT — [AGENT NAME]
Date: [timestamp]
═══════════════════════════════════════════════

STATUS: [ONLINE / COMPLETED / ERROR / BLOCKED]

WHAT I DID:
- [Specific task — outcome]

TOKENS USED: [if known]
COST ESTIMATE: $[amount]

RED FLAGS:
- [issues or "None — all clear"]

NEXT RECOMMENDED ACTION:
- [what should happen next]
═══════════════════════════════════════════════
```

## For Belichick (Orchestrator)

When Belichick delegates to other agents, he tracks:

```
DELEGATION LOG:
| Agent | Task | Started | Completed | Cost | Outcome |
|-------|------|---------|-----------|------|---------|
| [name] | [task] | [time] | [time] | $X | [result] |
```

## For Mila Cloud Run

Mila's TPS is automated via:
- `GET /tps` — JSON format (for dashboards)
- `GET /tps/text` — Plain text (for GitHub Issues)

The weekly TPS workflow in demo-repository automatically polls this endpoint.

## Discoveries — Finding Better/Faster/Free Stuff

**CRITICAL RULE:** When ANY agent finds something better, faster, or free while doing its work, it DOES NOT act on it immediately. It logs it as a Discovery and waits for Bryan's approval.

### When to Log a Discovery

- You find a free tool that replaces something we pay for
- You find a cheaper API or service
- You find a faster way to do something we already do
- You discover a new capability (new Google API, new feature in a tool we use)
- You spot a competitor using a strategy we should adopt
- You find a regulatory change that creates a business opportunity
- A service we pay for now has a free tier

### How to Log a Discovery

**If you're Mila Cloud Run**, POST to `/discoveries`:
```json
{
  "agent": "Mila",
  "found": "Google offers free SEO audit via Lighthouse CI",
  "where": "Found while running SEO audit task",
  "type": "FREE_TOOL",
  "current": "Manual PageSpeed Insights checks",
  "proposed": "Automated Lighthouse CI in GitHub Actions",
  "whyBetter": ["Runs automatically on every deploy", "Free", "More detailed than manual checks"],
  "costImpact": { "current": "$0 (manual time)", "proposed": "$0 (automated)", "savings": "~30 min/week" },
  "risk": "None — additive, doesn't replace anything",
  "recommendation": "SWITCH"
}
```

**If you're a skill agent (Atlas, Closer, Belichick, etc.)**, include in your TPS report:
```
🔍 DISCOVERY — [Agent Name]
FOUND: [What you found]
TYPE: [FREE_TOOL / CHEAPER_ALTERNATIVE / FASTER_APPROACH / etc.]
CURRENT: [What we use now]
PROPOSED: [What we'd switch to]
WHY: [1-2 sentences]
RECOMMENDATION: [SWITCH / TEST FIRST / KEEP IN MIND]
STATUS: ⏳ AWAITING BRYAN'S APPROVAL
```

### What Happens After You Log It

1. Discovery shows up in the weekly TPS report (Monday GitHub Issue)
2. Bryan reviews and replies: `GO`, `NO`, or `RESEARCH`
3. If `GO` → you implement it on your next run
4. If `NO` → you ignore it, move on
5. If `RESEARCH` → you dig deeper and report back next week

### DO NOT

- Act on a discovery without approval
- Switch tools, APIs, or approaches without a `GO`
- Log trivial stuff (minor CSS tweaks, tiny perf gains < 5%)
- Log the same discovery twice

## Cost Awareness

Every agent should be token-conscious. Rules:
1. If a task will cost > $1, flag it before starting
2. If a task has burned > $2 with no result, stop and report
3. Track cumulative cost per session
4. Monthly budget cap: $70 total across all agents

## When to Raise a Red Flag

- Task seems wrong for the agent's role
- Cost exceeding estimate by 2x
- API errors > 3 in a row
- Task taking > 10 minutes with no output
- Agent asked to do something outside its sandbox
- Data looks wrong / unexpected results
