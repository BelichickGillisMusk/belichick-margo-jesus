---
name: teleport-recovery
description: Session persistence, recovery, and teleportation for agent missions. Saves agent session state to disk when interrupted by timeout, crash, kill switch, or network failure. Allows resuming sessions from where they left off using session IDs. Triggers on "teleport", "session", "recover", "resume", "checkpoint", "restore", "session ID", "pick up where", "continue mission", "interrupted".
---

# Teleport - Session Recovery System

You are the session recovery engine for BelichickGillisMusk. When agents get interrupted, you save their state. When someone says "pick up where we left off," you make it happen.

## Purpose

Agent sessions get killed for many reasons:
- **Timeout** (5 min silence limit)
- **Kill switch** (`/kill` command)
- **Idle archive** (30 min sub-agent limit)
- **Token cap** (60K context limit reached)
- **Crash** (API errors, rate limits, network failures)
- **Cron retention** (6h session expiry)

Without teleport recovery, all that work — context, findings, partial results — is lost. Tokens wasted. Time wasted. Teleport fixes this.

## How It Works

### Session Lifecycle

```
AGENT STARTS MISSION
  │
  ├── [Checkpoint 1] Mission acknowledged, query parsed
  │     → State saved: session ID, agent, task, timestamp
  │
  ├── [Checkpoint 2] External data retrieved
  │     → State saved: API responses, intermediate results
  │
  ├── [Checkpoint 3] Analysis in progress
  │     → State saved: partial findings, token count
  │
  ├── [Checkpoint 4] Report drafted
  │     → State saved: draft output, formatting
  │
  └── [COMPLETE] Results delivered
        → Session archived (retained per policy)

IF INTERRUPTED AT ANY CHECKPOINT:
  → State persisted to ~/.openclaw/sessions/<session_id>.json
  → Status posted to #agent-status
  → Session recoverable via /teleport <session_id>
```

### Session State Format

Each session snapshot is stored as JSON:

```json
{
  "sessionId": "session_01UZeds1NUGCUmdcK2mtVMX5",
  "agent": "sentinel",
  "coAgents": ["mila-legal"],
  "mission": "/recon-legal CARB 2027 quarterly testing",
  "requestedBy": "@gillis",
  "channel": "#recon-legal",
  "status": "interrupted",
  "interruptReason": "timeout",
  "checkpoint": 3,
  "checkpointLabel": "Analysis in progress",
  "startedAt": "2026-02-22T14:30:00Z",
  "interruptedAt": "2026-02-22T14:35:00Z",
  "tokensUsed": 18420,
  "context": {
    "query": "CARB 2027 quarterly testing requirements",
    "sourcesRetrieved": [
      "eCFR Title 13 Division 3",
      "CARB HD I/M Advisory 2026-03"
    ],
    "partialFindings": [
      "OBD vehicles: 4x/year effective Oct 2027",
      "Non-OBD: remain at 2x/year",
      "Agricultural exemption confirmed"
    ],
    "pendingWork": [
      "Calculate statewide test volume impact",
      "Identify business opportunity angle",
      "Format final Slack report"
    ]
  },
  "recoveryStrategy": "resume_from_checkpoint",
  "estimatedTokensToComplete": 8000,
  "expiresAt": "2026-02-23T02:30:00Z"
}
```

### Session ID Format

Session IDs follow the pattern: `session_<26-char CUID2>`

Examples:
- `session_01UZeds1NUGCUmdcK2mtVMX5`
- `session_02ABcdf3GHijkLMNopQRsTUvw`

Generated automatically when any agent mission starts.

## Slash Commands

### `/teleport <session_id>` — Resume an Interrupted Session

```
/teleport session_01UZeds1NUGCUmdcK2mtVMX5
```

Workflow:
1. Belichick receives the teleport request
2. Loads session state from `~/.openclaw/sessions/<session_id>.json`
3. Validates session is still recoverable (not expired, not corrupted)
4. Re-dispatches the original agent(s) with recovered context
5. Agent resumes from last checkpoint — does NOT redo completed work
6. Posts recovery status to #agent-status
7. Delivers completed results to original target channel

Output in #agent-status:
```
[TELEPORT] Recovering session session_01UZeds1NUGCUmdcK2mtVMX5
  Agent: Sentinel + Mila-Legal
  Mission: /recon-legal "CARB 2027 quarterly testing"
  Interrupted: 2h ago (timeout at checkpoint 3/4)
  Tokens saved: ~18,420 (resuming, not restarting)
  Status: RESUMING...
```

Output on completion:
```
[TELEPORT COMPLETE] session_01UZeds1NUGCUmdcK2mtVMX5
  Agent: Sentinel + Mila-Legal
  Original mission: /recon-legal "CARB 2027 quarterly testing"
  Recovery cost: 8,200 tokens (saved 18,420 by not restarting)
  Results posted to: #recon-legal
```

### `/sessions` — List All Recoverable Sessions

```
/sessions
```

Output in #agent-status:
```
RECOVERABLE SESSIONS — Feb 22, 2026 3:00 PM
=============================================

ID                              AGENT           MISSION                              INTERRUPTED   CHECKPOINT   EXPIRES
──                              ─────           ───────                              ───────────   ──────────   ───────
session_01UZeds1NUGCUmdcK2mt    Sentinel        /recon-legal "CARB 2027 quarterly"   2h ago        3/4 (75%)    10h
session_02XYzab4CDefgHIJklMN    Lead Scraper    /recon-leads "freight brokers NV"    5h ago        2/4 (50%)    7h
session_03QRstu5VWxyzABCdeFG    Jon Jones       /recon-prospect "Valley Freight"     22h ago       1/4 (25%)    2h ⚠️

EXPIRED (last 24h):
session_04HIjkl6MNopqRSTuvWX    Kesha           /recon-market "diesel testing AZ"    26h ago       4/4 (done*)  EXPIRED

* Session completed but results were never delivered (Slack webhook failed)

Commands:
  /teleport <session_id>   Resume a session
  /sessions purge          Delete all expired sessions
  /sessions keep <id>      Extend expiry by 12h
```

### `/sessions purge` — Clean Up Expired Sessions

Deletes all expired session files from disk. Posts confirmation to #agent-status.

### `/sessions keep <session_id>` — Extend Session Expiry

Extends a session's expiry by 12 hours. Useful when you know you want to resume later but can't right now.

## Checkpoint Strategy

Agents save checkpoints at natural breakpoints in their workflow:

| Checkpoint | What's Saved | Typical Trigger |
|------------|-------------|-----------------|
| **1 - Mission Start** | Task parsed, parameters extracted, agents assigned | Immediately after dispatch |
| **2 - Data Retrieved** | API responses, source documents, raw data | After external calls complete |
| **3 - Analysis Done** | Findings, calculations, insights | After processing/reasoning |
| **4 - Report Ready** | Formatted output, files, attachments | Before Slack delivery |

Not every mission hits all 4 checkpoints. Simple missions (like `/recon-compliance` VIN lookup) may only have 2. Complex multi-agent missions may have sub-checkpoints.

### Checkpoint Persistence Rules

- Checkpoints are written to disk **synchronously** — the agent waits for the write to confirm before proceeding
- Each checkpoint **overwrites** the previous one (only latest state is kept)
- Checkpoint files are **atomic writes** (write to temp file, then rename) to prevent corruption
- Maximum checkpoint file size: **500KB** (if context exceeds this, oldest retrieved data is summarized)

## Recovery Strategies

### Strategy 1: Resume from Checkpoint (Default)

Agent picks up exactly where it stopped. Context is reloaded, pending work list is executed.

- **When:** Checkpoint data is intact, agent/APIs are available
- **Token cost:** Only tokens needed for remaining work
- **Success rate:** ~90%

### Strategy 2: Partial Restart

Agent restarts the current checkpoint phase but keeps results from prior checkpoints.

- **When:** Checkpoint data is partially corrupted or API responses are stale (>6h old)
- **Token cost:** Tokens for current + remaining checkpoints
- **Success rate:** ~95%

### Strategy 3: Full Restart with Hints

Agent restarts the entire mission but is given a summary of previous findings as hints to avoid redundant API calls and reasoning.

- **When:** Session is old (>12h), context is heavily pruned, or agent version has changed
- **Token cost:** Near full mission cost, but faster due to hints
- **Success rate:** ~99%

### Strategy Selection

```
IF checkpoint data intact AND age < 6h:
  → Resume from Checkpoint
ELIF checkpoint data partial OR age 6-12h:
  → Partial Restart
ELIF age > 12h OR data corrupted:
  → Full Restart with Hints
```

## Integration with Existing Systems

### Kill Switch Awareness

When `/kill` is used:
1. Agent receives kill signal
2. **Before terminating:** writes emergency checkpoint with current state
3. Session marked as `interrupted (killed)` — recoverable
4. Posted to #alerts: `[KILL] Sentinel killed per @gillis. Session session_01UZ... saved. /teleport to resume.`

### Timeout Handling

When 5-min timeout triggers:
1. OpenClaw gateway detects silence
2. **Before archiving:** triggers checkpoint save
3. Session marked as `interrupted (timeout)` — recoverable
4. Posted to #agent-status: `[TIMEOUT] Sentinel timed out. Session session_01UZ... saved at checkpoint 3/4.`

### Token Cap Handling

When 60K context cap is hit:
1. Agent receives context limit warning
2. **Before compaction:** saves full context as checkpoint
3. If compaction succeeds: session continues (no interruption)
4. If compaction fails: session interrupted, checkpoint saved

### Cron Session Expiry

Cron sessions retained for 6h. After 6h:
1. Session state is checkpointed
2. Session file moved to `~/.openclaw/sessions/expired/`
3. Expired sessions kept for 24h (recoverable with degraded strategy)
4. After 24h: permanently deleted

## Storage

```
~/.openclaw/sessions/
├── active/                          # Currently running sessions
│   ├── session_01UZeds1NUGCUm.json
│   └── session_02XYzab4CDef.json
├── recoverable/                     # Interrupted but recoverable
│   ├── session_03QRstu5VWxy.json
│   └── session_04HIjkl6MNop.json
├── expired/                         # Past retention, degraded recovery
│   └── session_05ABcde7FGhi.json
└── completed/                       # Successfully finished (kept 24h for audit)
    └── session_06JKlmn8OPqr.json
```

### Disk Budget

- Active sessions: unlimited (max 2 concurrent agents = max 2 files)
- Recoverable sessions: max 50 files, oldest auto-purged
- Expired sessions: max 20 files, auto-deleted after 24h
- Completed sessions: max 100 files, auto-deleted after 24h
- **Total max disk usage:** ~25MB (500KB per file x 50 max recoverable)

## Guardrails

- **No PII in session files** — session state never includes customer names, VINs, or contact info in plain text. These are referenced by hash or record ID only.
- **Session files are local only** — never transmitted over network, never synced to cloud
- **Expired sessions are hard-deleted** — no recovery after 24h, no recycle bin
- **Auth required for /teleport** — only authorized Slack users (same allowlist as other commands)
- **No automatic recovery** — sessions are never auto-resumed. A human must explicitly `/teleport` to resume. This prevents infinite retry loops on failing missions.
- **Token budget check on recovery** — before resuming, Belichick verifies there's enough token budget for estimated completion cost. If budget is tight, recovery is blocked and posted to #alerts.
- **One recovery attempt per session** — if a teleported session fails again, it's marked `unrecoverable` and the user is advised to start a new mission. This prevents burning tokens on broken sessions.
