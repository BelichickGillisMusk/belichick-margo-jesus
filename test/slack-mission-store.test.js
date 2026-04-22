import test from 'node:test';
import assert from 'node:assert/strict';
import { createMissionStore } from '../src/slack-bot/mission-store.js';

test('mission store tracks lifecycle and daily usage', () => {
  const store = createMissionStore(['alpha', 'beta']);
  const mission = store.queueMission({
    command: 'dispatch',
    task: 'run something',
    agents: ['alpha'],
    type: 'Direct Dispatch',
    requestedBy: 'U123',
  });

  store.markRunning(mission.id);
  assert.equal(store.getAgentSnapshot('alpha').status, 'running');

  store.completeMission(mission.id, { tokens: 25, results: ['Alpha'] });
  assert.equal(store.getAgentSnapshot('alpha').lastStatus, 'completed');
  assert.equal(store.getTodayUsage().tokens, 25);
});

test('mission store can cancel active agents', () => {
  const store = createMissionStore(['alpha']);
  const mission = store.queueMission({
    command: 'dispatch',
    task: 'stop me',
    agents: ['alpha'],
    type: 'Direct Dispatch',
    requestedBy: 'U123',
  });

  store.markRunning(mission.id);
  const cancelled = store.cancelAgent('alpha', 'Cancelled in test.');
  assert.equal(cancelled.status, 'cancelled');
  assert.equal(store.getAgentSnapshot('alpha').status, 'idle');
});
