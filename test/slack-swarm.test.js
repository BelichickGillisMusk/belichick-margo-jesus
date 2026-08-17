import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AGENTS,
  SWARM_PRESETS,
  DEFAULT_SWARM_PRESET,
  resolveSwarmAgents,
} from '../src/slack-bot/agents.js';
import { runSwarm } from '../src/slack-bot/dispatch.js';

test('every swarm preset references known agents only', () => {
  for (const [presetKey, preset] of Object.entries(SWARM_PRESETS)) {
    assert.ok(Array.isArray(preset.agents) && preset.agents.length > 0, `preset ${presetKey} has no agents`);
    for (const agentId of preset.agents) {
      assert.ok(AGENTS[agentId], `preset ${presetKey} references unknown agent ${agentId}`);
    }
  }
});

test('default swarm preset is registered', () => {
  assert.ok(SWARM_PRESETS[DEFAULT_SWARM_PRESET], `DEFAULT_SWARM_PRESET ${DEFAULT_SWARM_PRESET} is not registered`);
});

test('resolveSwarmAgents returns the default preset when input is empty', () => {
  const resolved = resolveSwarmAgents('');
  assert.equal(resolved.preset, DEFAULT_SWARM_PRESET);
  assert.deepEqual(resolved.agents, SWARM_PRESETS[DEFAULT_SWARM_PRESET].agents);
});

test('resolveSwarmAgents resolves a named preset case-insensitively', () => {
  const resolved = resolveSwarmAgents('REVENUE');
  assert.equal(resolved.preset, 'revenue');
  assert.deepEqual(resolved.agents, SWARM_PRESETS.revenue.agents);
});

test('resolveSwarmAgents accepts a custom comma-separated agent list', () => {
  const resolved = resolveSwarmAgents('samantha, jon-jones,musk');
  assert.equal(resolved.preset, 'custom');
  assert.deepEqual(resolved.agents, ['samantha', 'jon-jones', 'musk']);
});

test('resolveSwarmAgents rejects unknown custom agents', () => {
  assert.throws(() => resolveSwarmAgents('samantha,not-a-real-agent'), /Unknown swarm agents/);
});

test('gumption intake preset covers DataSync, FinBot handoff, and orchestration', () => {
  const intake = SWARM_PRESETS.gumption;
  assert.ok(intake, 'gumption preset missing');
  assert.ok(intake.agents.includes('datasync'), 'gumption intake must include datasync');
  assert.ok(intake.agents.includes('samantha'), 'gumption intake must include samantha for orchestration');
  assert.ok(intake.agents.includes('cipher'), 'gumption intake must include cipher for budget');
});

test('gumption finalize preset owns reconciliation and closeout', () => {
  const final = SWARM_PRESETS['gumption-final'];
  assert.ok(final, 'gumption-final preset missing');
  assert.ok(final.agents.includes('finbot'), 'gumption finalize must include finbot');
  assert.ok(final.agents.includes('datasync'), 'gumption finalize must include datasync for CRM verification');
  assert.ok(final.agents.includes('samantha'), 'gumption finalize must include samantha for closeout summary');
});

test('resolveSwarmAgents resolves both gumption phases', () => {
  const intake = resolveSwarmAgents('gumption');
  assert.equal(intake.preset, 'gumption');
  assert.equal(intake.emoji, ':inbox_tray:');

  const finalize = resolveSwarmAgents('gumption-final');
  assert.equal(finalize.preset, 'gumption-final');
  assert.equal(finalize.emoji, ':lock:');
});

test('runSwarm batches agents according to parallelism and aggregates outcomes', async () => {
  const calls = [];
  const inFlight = new Set();
  let peakInFlight = 0;

  const fakeRunner = async (agentId, task) => {
    inFlight.add(agentId);
    peakInFlight = Math.max(peakInFlight, inFlight.size);
    calls.push({ agentId, task });
    await new Promise(resolve => setImmediate(resolve));
    inFlight.delete(agentId);
    if (agentId === 'broken') {
      throw new Error('boom');
    }
    return {
      agentId,
      name: agentId,
      text: `${agentId} says hi`,
      elapsed: '0.1',
      tokens: 5,
    };
  };

  const outcome = await runSwarm(['a', 'b', 'c', 'd', 'broken'], 'do the thing', {
    parallelism: 2,
    runner: fakeRunner,
  });

  assert.equal(calls.length, 5);
  assert.equal(outcome.results.length, 4);
  assert.equal(outcome.failures.length, 1);
  assert.equal(outcome.totalTokens, 20);
  assert.match(outcome.failures[0].message, /boom/);
  assert.ok(peakInFlight <= 2, `expected parallelism cap of 2, observed ${peakInFlight}`);
});

test('runSwarm throws when called with an empty agent list', async () => {
  await assert.rejects(() => runSwarm([], 'task'), /at least one agent/);
});
