#!/usr/bin/env node
// Daily Kimi competitive-intelligence run.
//   npm run intel              watch + brief
//   npm run intel:brief        brief from memory
//   npm run intel:voice -- "quote"
//   npm run intel:assign -- "question"
//
// INTEL_FETCH=1 hits public competitor pages. Off by default so CI/tests
// never scrape. KIMI_API_KEY optional — without it the brief is structural.

import { runAssign, runBrief, runVoice, runWatch } from '../src/intel/run.js';

const command = process.argv[2] || 'watch';
const rest = process.argv.slice(3).join(' ').trim();

async function watch() {
  const result = await runWatch();
  if (process.env.INTEL_FETCH === '1') {
    console.log(`[intel] ${result.newEvents.length} new events from ${result.rosterCount} competitors.`);
  } else {
    console.log('[intel] INTEL_FETCH is off — using memory only. Set INTEL_FETCH=1 to hit public pages.');
  }
  console.log(result.markdown);
  console.log(`\n[intel] wrote ${result.file}`);
}

async function brief() {
  const result = await runBrief();
  console.log(result.markdown);
  console.log(`\n[intel] wrote ${result.file}`);
}

async function voice() {
  if (!rest) {
    console.error('Usage: npm run intel:voice -- "what fleets keep saying"');
    process.exit(1);
  }
  const store = await runVoice(rest);
  console.log(`[intel] customer voice now has ${store.themeCount} themes. Top: ${store.top?.theme}`);
}

async function assign() {
  if (!rest) {
    console.error('Usage: npm run intel:assign -- "research question"');
    process.exit(1);
  }
  const result = await runAssign(rest);
  console.log(`[intel] assignment ${result.assignment.id} stored. Next run will carry this forward.\n`);
  console.log(result.findings);
}

const handlers = { watch, brief, voice, assign };
const handler = handlers[command];
if (!handler) {
  console.error(`Unknown command: ${command}. Use watch | brief | voice | assign.`);
  process.exit(1);
}

handler().catch(error => {
  console.error(`[intel] failed: ${error.message}`);
  process.exit(1);
});
