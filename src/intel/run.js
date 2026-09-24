import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  addVoice,
  appendEvent,
  ensureMemory,
  formatMemory,
  hashPage,
  loadContext,
  loadRoster,
  loadSnapshots,
  saveAssignment,
  saveSnapshots,
} from './store.js';
import { diffSnapshots } from './diff.js';
import { buildBrief } from './brief.js';
import { askKimi, kimiEnabled } from './kimi.js';
import { snapshotRoster } from './fetch.js';

function shouldFetch(fetchPages) {
  if (typeof fetchPages === 'boolean') return fetchPages;
  return process.env.INTEL_FETCH === '1';
}

function resolveAsk(kimiAsk) {
  if (kimiAsk === null) return null;
  if (typeof kimiAsk === 'function') return kimiAsk;
  return kimiEnabled() ? askKimi : null;
}

export async function runWatch({
  root,
  fetchPages,
  fetchImpl,
  delayMs,
  kimiAsk,
} = {}) {
  const roster = await loadRoster(root);
  let newEvents = [];

  if (shouldFetch(fetchPages)) {
    const previous = await loadSnapshots(root);
    const next = await snapshotRoster(roster, {
      fetchImpl,
      delayMs,
      hashPage,
    });
    await saveSnapshots(next, root);
    newEvents = diffSnapshots(roster, previous, next);
    for (const event of newEvents) {
      await appendEvent(event, root);
    }
  }

  const brief = await runBrief({ root, kimiAsk });
  return { rosterCount: roster.length, newEvents, ...brief };
}

export async function runBrief({ root, kimiAsk } = {}) {
  const context = await loadContext({ root });
  const built = buildBrief(context);
  let markdown = built.markdown;
  let kimiTokens = 0;
  let kimiUsed = false;

  const ask = resolveAsk(kimiAsk);
  if (ask) {
    const memory = formatMemory(context);
    const asked = await ask(
      `Write today's competitive brief for NorCal CARB Mobile from MEMORY. Events in this cycle:\n${JSON.stringify(context.events.slice(-20), null, 2)}\n\nKeep Sales / Marketing / Product sections. Do not invent facts.`,
      { memory },
    );
    markdown = `${built.markdown}\n\n---\n\n## Kimi analyst\n\n${asked.text}\n`;
    kimiTokens = asked.tokens || 0;
    kimiUsed = true;
  }

  const paths = await ensureMemory(root);
  const file = join(paths.briefs, `brief-${built.date}.md`);
  await writeFile(file, markdown, 'utf8');

  return {
    markdown,
    file,
    date: built.date,
    counts: built.counts,
    tokens: kimiTokens,
    kimiUsed,
    name: 'Kimi',
  };
}

export async function runVoice(quote, { theme, source, root } = {}) {
  const trimmed = String(quote || '').trim();
  if (!trimmed) {
    throw new Error('Customer-voice quote is empty.');
  }
  const store = await addVoice(trimmed, { theme, source }, root);
  return {
    themeCount: store.themes.length,
    top: store.themes[0] || null,
    voice: store,
  };
}

export async function runAssign(question, { root, kimiAsk } = {}) {
  const trimmed = String(question || '').trim();
  if (!trimmed) {
    throw new Error('Assignment question is empty.');
  }

  const context = await loadContext({ root });
  const memory = formatMemory(context);
  let findings = `Logged assignment. ${context.events.length} events and ${context.voice.length} voice themes already in memory.`;
  let tokens = 0;

  const ask = resolveAsk(kimiAsk);
  if (ask) {
    const asked = await ask(
      `New assignment: ${trimmed}\nAnswer using MEMORY only. If memory is silent, say what you would watch next — do not invent a finding.`,
      { memory },
    );
    findings = asked.text;
    tokens = asked.tokens || 0;
  }

  const saved = await saveAssignment({
    question: trimmed,
    findings,
    eventsUsed: context.events.map(event => event.id),
  }, root);

  return {
    assignment: saved,
    findings,
    memory,
    tokens,
    kimiUsed: Boolean(ask),
    name: 'Kimi',
    text: findings,
  };
}
