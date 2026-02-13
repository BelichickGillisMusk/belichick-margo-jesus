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
