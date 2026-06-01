import test from 'node:test';
import assert from 'node:assert/strict';
import { createSamanthaDmStore } from '../src/slack-bot/samantha-dm-store.js';

test('samantha dm store keeps per-user history and respects the history limit', () => {
  const store = createSamanthaDmStore({ historyLimit: 4 });
  store.appendExchange('U_BRYAN', 'first prompt', 'first reply');
  store.appendExchange('U_BRYAN', 'second prompt', 'second reply');
  store.appendExchange('U_BRYAN', 'third prompt', 'third reply');

  const history = store.getHistory('U_BRYAN');
  assert.equal(history.length, 4);
  assert.deepEqual(history.map(m => m.content), [
    'second prompt', 'second reply', 'third prompt', 'third reply',
  ]);

  const other = store.getHistory('U_OTHER');
  assert.deepEqual(other, []);
  assert.equal(store.activeUserCount(), 1);
});

test('samantha dm store evicts conversations past their TTL', () => {
  let clock = 1_000_000;
  const store = createSamanthaDmStore({ ttlMs: 1000, now: () => clock });
  store.appendExchange('U_OLD', 'hi', 'yo');
  clock += 5000;
  assert.equal(store.activeUserCount(), 0);
  assert.deepEqual(store.getHistory('U_OLD'), []);
});
