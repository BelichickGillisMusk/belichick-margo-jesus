import test from 'node:test';
import assert from 'node:assert/strict';
import { callSamantha, samanthaEnabled } from '../src/slack-bot/samantha-client.js';

test('samanthaEnabled reflects SAMANTHA_URL presence', () => {
  assert.equal(samanthaEnabled({ SAMANTHA_URL: 'https://samantha-x.run.app' }), true);
  assert.equal(samanthaEnabled({ SAMANTHA_URL: '   ' }), false);
  assert.equal(samanthaEnabled({}), false);
});

test('callSamantha posts to the chat endpoint and returns the reply', async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    return {
      ok: true,
      status: 200,
      json: async () => ({ reply: 'On it.', tokens: 42, model: 'claude-sonnet' }),
    };
  };

  const result = await callSamantha('do the thing', [{ role: 'user', content: 'earlier' }], {
    url: 'https://samantha-x.run.app/',
    fetchImpl,
  });

  assert.equal(result.reply, 'On it.');
  assert.equal(result.tokens, 42);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://samantha-x.run.app/api/samantha/chat');
  assert.equal(calls[0].init.method, 'POST');
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.message, 'do the thing');
  assert.deepEqual(body.history, [{ role: 'user', content: 'earlier' }]);
});

test('callSamantha surfaces HTTP errors with a snippet of the body', async () => {
  const fetchImpl = async () => ({
    ok: false,
    status: 503,
    text: async () => 'vertex auth failed: missing role aiplatform.user',
  });

  await assert.rejects(
    () => callSamantha('hi', [], { url: 'https://samantha.test', fetchImpl }),
    /HTTP 503.*vertex auth failed/,
  );
});

test('callSamantha rejects when SAMANTHA_URL is missing', async () => {
  await assert.rejects(
    () => callSamantha('hi', [], { url: undefined, fetchImpl: () => {} }),
    /SAMANTHA_URL is not set/,
  );
});
