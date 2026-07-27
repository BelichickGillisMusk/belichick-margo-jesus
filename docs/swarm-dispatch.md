# Swarm Dispatch — Developer Reference

The swarm dispatch system lets you run multiple agents in parallel against a single task and collect their combined output. It is used by the `/swarm` Slack command and is the execution engine behind preset mission types like `intel`, `ops`, and `revenue`.

## Source files

| File | Purpose |
|------|---------|
| `src/slack-bot/agents.js` | Agent definitions, `SWARM_PRESETS`, `MISSIONS`, `resolveSwarmAgents()` |
| `src/slack-bot/dispatch.js` | `runAgent()`, `runMission()`, `runSwarm()` |
| `src/slack-bot/mission-store.js` | In-process mission lifecycle tracker |
| `src/slack-bot/index.js` | Slack command handlers that wire presets → dispatch → Slack replies |

---

## Core functions

### `runAgent(agentId, task)` → `AgentResult`

Calls a single Claude model using the agent's system prompt from `AGENTS[agentId]`. Returns:

```js
{
  agentId: string,
  name: string,
  text: string,       // Claude's response
  elapsed: string,    // seconds, e.g. "2.3"
  tokens: number,
}
```

Throws if `agentId` is not in `AGENTS`.

### `runMission(agentIds, task)` → `MissionPayload`

Runs all agents in parallel (`Promise.allSettled`) and merges their output. Partial failures are included in the payload — the mission only throws if **all** agents fail.

```js
{
  names: string,        // "Samantha + Mila-CARB"
  combined: string,     // markdown with all agent outputs
  totalTokens: number,
  results: AgentResult[],
  failures: { message: string }[],
}
```

### `runSwarm(agentIds, task, options)` → `MissionPayload`

Like `runMission` but processes agents in batches to respect the parallelism cap.

```js
// Options
{
  parallelism: number,   // agents per batch (default 3)
  runner: function,      // injectable for testing (default: runAgent)
}
```

Runs `ceil(agentIds.length / parallelism)` sequential batches, each batch fully parallel. Returns the same `MissionPayload` shape as `runMission`.

**When to use `runSwarm` vs `runMission`:** Use `runSwarm` when the agent count can exceed the safe concurrency limit for the Anthropic API rate tier. The Slack bot always routes through `runSwarm` for `/swarm` commands, using the `SLACK_SWARM_PARALLELISM` env var (default 3).

---

## Swarm presets

Presets are named agent lists defined in `SWARM_PRESETS` in `agents.js`. The `/swarm` command accepts a preset name or a custom space/comma-separated list of agent IDs.

| Preset | Agents | Use case |
|--------|--------|----------|
| `intel` (default) | kesha, musk, sentinel, mila-legal | Research, market analysis, regulatory questions |
| `ops` | samantha, datasync, website-helper | Operational tasks, deploy help, data sync |
| `revenue` | jon-jones, lead-scraper, aplus-hunter, finbot, cipher | Sales pipeline, A+ retests, financial review |
| `compliance` | mila-carb, mila-legal, sentinel, datasync | CARB compliance deep-dives |
| `full` | All agents | Maximum coverage on a hard problem |

### `resolveSwarmAgents(input, options)` → `SwarmSpec`

Parses the user-supplied string into a preset or a custom agent list.

```js
resolveSwarmAgents("")          // → preset "intel" (default)
resolveSwarmAgents("ops")       // → preset "ops"
resolveSwarmAgents("samantha mila-carb")  // → custom list
resolveSwarmAgents("bad-agent") // throws Error("Unknown swarm agents: bad-agent")
```

Returns:
```js
{
  preset: string,      // preset key or "custom"
  label: string,       // human-readable label
  emoji: string,       // Slack emoji for the response header
  agents: string[],    // resolved agent IDs
}
```

---

## Mission store

The mission store (`createMissionStore`) is an in-process lifecycle tracker for all missions (both single-agent `/dispatch` and multi-agent swarms). State is not persisted — a process restart clears history.

### Mission lifecycle

```
queued → running → completed
                 → failed
                 → cancelled
```

### Key API

```js
const store = createMissionStore(agentIds, { historyLimit: 200 });

// Create a mission record before dispatching
const mission = store.queueMission({ command, task, agents, type, requestedBy });

// Mark as started (sets agent states to "running")
store.markRunning(mission.id);

// Finish with results
store.completeMission(mission.id, { results, failures, tokens });
store.failMission(mission.id, { error });

// Cancel by mission or by agent
store.cancelMission(mission.id, 'reason');
store.cancelAgent(agentId, 'reason');

// Read state
store.getMission(mission.id);
store.getAgentSnapshot(agentId);
store.getHistory(25);
store.getTodayUsage();
store.getActiveMissionCount();
```

### Guardrails enforced by the Slack bot

The Slack bot reads `store.getActiveMissionCount()` before queueing and rejects the request with an error message if the count is at or above `SLACK_MAX_CONCURRENT_MISSIONS`. Daily token usage from `getTodayUsage().tokens` is compared against `SLACK_DAILY_TOKEN_BUDGET`.

### History trimming

Once the store holds more than `historyLimit` missions, the oldest **completed/failed/cancelled** missions are evicted. Active missions are never evicted. Default limit: 200.

---

## Adding a new agent

1. Add a `defineAgent({...})` entry to `AGENTS` in `src/slack-bot/agents.js`.
2. Optionally add a new `MISSIONS` entry if the agent maps to a slash command.
3. Optionally add the agent to one or more `SWARM_PRESETS`.
4. Add a corresponding `skills/<agent-id>/SKILL.md` as the human-readable prompt reference.

No changes to `dispatch.js` or `mission-store.js` are needed for new agents.

---

## Adding a new swarm preset

Add an entry to `SWARM_PRESETS` in `agents.js`:

```js
export const SWARM_PRESETS = {
  // ...existing presets...
  'my-preset': {
    label: 'My Custom Squad',
    emoji: ':hammer:',
    description: 'What this preset is for.',
    agents: ['samantha', 'datasync'],
  },
};
```

Users can then invoke it with `/swarm my-preset do the thing`. No other code changes required.

---

## Environment variables

| Variable | Default | Effect |
|----------|---------|--------|
| `SLACK_SWARM_PARALLELISM` | `3` | Agents per batch in `runSwarm` |
| `SLACK_SWARM_MAX_AGENTS` | `8` | Max agents allowed in a single custom swarm |
| `SLACK_MAX_CONCURRENT_MISSIONS` | `2` | Max missions running at once across the bot |
| `SLACK_DAILY_TOKEN_BUDGET` | `60000` | Daily token cap; missions are blocked after breach |
| `SLACK_MISSION_TOKEN_WARN_THRESHOLD` | `12000` | Per-mission token warning threshold |

---

## Testing

The swarm is covered by `test/slack-swarm.test.js` using Node's built-in test runner. The `runner` option in `runSwarm` accepts a mock function so tests never hit the Anthropic API:

```js
const mockRunner = async (agentId) => ({ agentId, name: agentId, text: 'ok', elapsed: '0.1', tokens: 10 });
const result = await runSwarm(['samantha', 'mila-carb'], 'test task', { runner: mockRunner });
```

Run the full test suite:
```bash
npm test
```
