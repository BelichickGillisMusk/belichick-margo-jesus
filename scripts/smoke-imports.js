import assert from 'node:assert/strict';

const slack = await import('../src/slack-bot/index.js');
const mila = await import('../src/mila-chatbot/index.js');
const scraper = await import('../src/lead-scraper/index.js');

assert.equal(typeof slack.createSlackApp, 'function');
assert.equal(typeof slack.startSlackBot, 'function');
assert.equal(typeof mila.startMilaServer, 'function');
assert.equal(typeof scraper.runScrape, 'function');
assert.equal(typeof scraper.parseCliArgs, 'function');

console.log('Smoke imports passed.');
