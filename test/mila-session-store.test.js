import test from 'node:test';
import assert from 'node:assert/strict';
import { createSessionStore } from '../src/mila-chatbot/session-store.js';

test('session store trims history and stores leads', () => {
  const store = createSessionStore({ ttlMs: 60_000, historyLimit: 2, maxActiveSessions: 5, leadRetentionLimit: 3 });

  store.addMessage('abc', { role: 'user', content: 'one' });
  store.addMessage('abc', { role: 'assistant', content: 'two' });
  const history = store.addMessage('abc', { role: 'user', content: 'three' });

  assert.equal(history.length, 2);
  assert.equal(history[0].content, 'two');

  store.captureLead('abc', { name: 'Test User', email: 'test@example.com', need: 'Need help' });
  assert.equal(store.getStats().storedLeads, 1);
});
