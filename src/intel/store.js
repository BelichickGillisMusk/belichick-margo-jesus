import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
export const INTEL_ROOT = process.env.INTEL_DIR || join(ROOT, 'intel');

function paths(root = INTEL_ROOT) {
  return {
    root,
    roster: join(root, 'roster.json'),
    memory: join(root, 'memory'),
    events: join(root, 'memory', 'events.jsonl'),
    snapshots: join(root, 'memory', 'snapshots.json'),
    assignments: join(root, 'memory', 'assignments.json'),
    voice: join(root, 'memory', 'customer-voice.json'),
    briefs: join(root, 'briefs'),
  };
}

export function intelPaths(root = INTEL_ROOT) {
  return paths(root);
}

export async function ensureMemory(root = INTEL_ROOT) {
  const p = paths(root);
  await mkdir(p.memory, { recursive: true });
  await mkdir(p.briefs, { recursive: true });
  return p;
}

export async function loadRoster(root = INTEL_ROOT) {
  const raw = JSON.parse(await readFile(paths(root).roster, 'utf8'));
  return raw.competitors || [];
}

async function readJson(file, fallback) {
  try {
    return JSON.parse(await readFile(file, 'utf8'));
  } catch {
    return fallback;
  }
}

export async function loadSnapshots(root = INTEL_ROOT) {
  const p = await ensureMemory(root);
  return readJson(p.snapshots, {});
}

export async function saveSnapshots(snapshots, root = INTEL_ROOT) {
  const p = await ensureMemory(root);
  await writeFile(p.snapshots, JSON.stringify(snapshots, null, 2), 'utf8');
}

export async function loadEvents(root = INTEL_ROOT) {
  const p = await ensureMemory(root);
  try {
    const raw = await readFile(p.events, 'utf8');
    return raw
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean)
      .map(line => JSON.parse(line));
  } catch {
    return [];
  }
}

export async function appendEvent(event, root = INTEL_ROOT) {
  const p = await ensureMemory(root);
  const record = {
    id: event.id || `evt-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
    ts: event.ts || new Date().toISOString(),
    competitorId: event.competitorId,
    kind: event.kind,
    title: event.title,
    detail: event.detail || '',
    sourceUrl: event.sourceUrl || '',
    confidence: event.confidence || 'observed',
  };
  await appendFile(p.events, `${JSON.stringify(record)}\n`, 'utf8');
  return record;
}

export async function loadVoice(root = INTEL_ROOT) {
  const p = await ensureMemory(root);
  return readJson(p.voice, { themes: [] });
}

export async function addVoice(quote, { theme, source } = {}, root = INTEL_ROOT) {
  const p = await ensureMemory(root);
  const voice = await loadVoice(root);
  const key = (theme || quote).toLowerCase().slice(0, 80);
  const existing = voice.themes.find(t => t.key === key);
  if (existing) {
    existing.count += 1;
    existing.lastSeen = new Date().toISOString();
    existing.quotes = [...(existing.quotes || []), quote].slice(-8);
  } else {
    voice.themes.push({
      key,
      theme: theme || quote,
      count: 1,
      firstSeen: new Date().toISOString(),
      lastSeen: new Date().toISOString(),
      quotes: [quote],
      source: source || 'operator',
    });
  }
  voice.themes.sort((a, b) => b.count - a.count);
  await writeFile(p.voice, JSON.stringify(voice, null, 2), 'utf8');
  return voice;
}

export async function loadAssignments(root = INTEL_ROOT) {
  const p = await ensureMemory(root);
  return readJson(p.assignments, { items: [] });
}

export async function saveAssignment(assignment, root = INTEL_ROOT) {
  const p = await ensureMemory(root);
  const store = await loadAssignments(root);
  const item = {
    id: assignment.id || `asg-${Date.now()}`,
    ts: assignment.ts || new Date().toISOString(),
    question: assignment.question,
    findings: assignment.findings,
    eventsUsed: assignment.eventsUsed || [],
  };
  store.items.unshift(item);
  store.items = store.items.slice(0, 50);
  await writeFile(p.assignments, JSON.stringify(store, null, 2), 'utf8');
  return item;
}

export function hashPage(text) {
  const normalized = String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
  return createHash('sha256').update(normalized).digest('hex');
}

export async function loadContext({ root = INTEL_ROOT, eventLimit = 80, voiceLimit = 8, assignmentLimit = 5 } = {}) {
  const [roster, events, voice, assignments, snapshots] = await Promise.all([
    loadRoster(root),
    loadEvents(root),
    loadVoice(root),
    loadAssignments(root),
    loadSnapshots(root),
  ]);

  return {
    roster,
    snapshots,
    events: events.slice(-eventLimit),
    voice: (voice.themes || []).slice(0, voiceLimit),
    assignments: (assignments.items || []).slice(0, assignmentLimit),
  };
}

export function formatMemory(context) {
  const lines = [];
  lines.push(`ROSTER: ${context.roster.length} competitors.`);
  if (context.assignments.length) {
    lines.push('PREVIOUS RESEARCH (do not redo — carry this forward):');
    for (const item of context.assignments) {
      lines.push(`- [${item.ts.slice(0, 10)}] ${item.question} → ${String(item.findings).slice(0, 240)}`);
    }
  } else {
    lines.push('PREVIOUS RESEARCH: none yet.');
  }
  if (context.voice.length) {
    lines.push('CUSTOMER VOICE (themes that keep coming up):');
    for (const theme of context.voice) {
      lines.push(`- ${theme.theme} (x${theme.count}, last ${theme.lastSeen.slice(0, 10)})`);
    }
  } else {
    lines.push('CUSTOMER VOICE: none logged.');
  }
  if (context.events.length) {
    lines.push('RECENT EVENTS:');
    for (const event of context.events.slice(-40)) {
      lines.push(`- [${event.ts.slice(0, 10)}] ${event.competitorId} / ${event.kind}: ${event.title}`);
    }
  } else {
    lines.push('RECENT EVENTS: none.');
  }
  return lines.join('\n');
}
