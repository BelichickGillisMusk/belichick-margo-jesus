import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  addVoice,
  appendEvent,
  formatMemory,
  hashPage,
  loadContext,
  loadRoster,
  saveAssignment,
} from '../src/intel/store.js';
import { classifyChange, diffSnapshots, EVENT_KINDS } from '../src/intel/diff.js';
import { buildBrief } from '../src/intel/brief.js';
import { askKimi, kimiConfig, kimiEnabled, KIMI_SYSTEM } from '../src/intel/kimi.js';
import { htmlToExcerpt, snapshotRoster } from '../src/intel/fetch.js';
import { runAssign, runBrief, runVoice, runWatch } from '../src/intel/run.js';
import { AGENTS, MISSIONS, SWARM_PRESETS } from '../src/slack-bot/agents.js';
import { runAgent } from '../src/slack-bot/dispatch.js';

const WATCH_FIELDS = new Set(['launch', 'pricing', 'integration', 'positioning']);

async function seedIntelRoot({ competitors } = {}) {
  const root = await mkdtemp(join(tmpdir(), 'kimi-intel-'));
  await mkdir(join(root, 'memory'), { recursive: true });
  await mkdir(join(root, 'briefs'), { recursive: true });
  const roster = {
    updated: '2026-08-19',
    competitors: competitors || [
      { id: 'alpha', name: 'Alpha CTC', url: 'https://alpha.example', category: 'tester', region: 'CA', watch: ['pricing'] },
      { id: 'beta', name: 'Beta Fleet', url: 'https://beta.example', category: 'fleet-software', region: 'US', watch: ['launch', 'integration'] },
    ],
  };
  await writeFile(join(root, 'roster.json'), JSON.stringify(roster, null, 2), 'utf8');
  return root;
}

test('committed roster watches 30 unique competitors', async () => {
  const roster = await loadRoster();
  assert.equal(roster.length, 30);
  const ids = roster.map(item => item.id);
  assert.equal(new Set(ids).size, 30);
  for (const competitor of roster) {
    assert.ok(competitor.name, `${competitor.id} missing name`);
    assert.match(competitor.url, /^https?:\/\//, `${competitor.id} missing url`);
    assert.ok(Array.isArray(competitor.watch) && competitor.watch.length > 0, `${competitor.id} has no watch fields`);
    for (const field of competitor.watch) {
      assert.ok(WATCH_FIELDS.has(field), `${competitor.id} watches unknown field ${field}`);
    }
  }
});

test('classifyChange maps launch, pricing, integration, positioning, else page-change', () => {
  assert.equal(classifyChange('Introducing a new service this week'), 'launch');
  assert.equal(classifyChange('Updated pricing: $79 OBD'), 'pricing');
  assert.equal(classifyChange('Now connects with Samsara via API'), 'integration');
  assert.equal(classifyChange('We now positioned unlike the dealers'), 'positioning');
  assert.equal(classifyChange('Hours and a phone number'), 'page-change');
  assert.ok(EVENT_KINDS.includes('customer-voice'));
});

test('diffSnapshots baselines first fetch and classifies later hash changes', () => {
  const roster = [
    { id: 'alpha', name: 'Alpha CTC', url: 'https://alpha.example' },
    { id: 'beta', name: 'Beta Fleet', url: 'https://beta.example' },
  ];
  const first = diffSnapshots(roster, {}, {
    alpha: { hash: 'aaa', excerpt: 'welcome' },
  });
  assert.equal(first.length, 1);
  assert.equal(first[0].kind, 'page-change');
  assert.match(first[0].title, /First snapshot/);

  const changed = diffSnapshots(roster, {
    alpha: { hash: 'aaa', excerpt: 'welcome' },
    beta: { hash: 'bbb', excerpt: 'same' },
  }, {
    alpha: { hash: 'ccc', excerpt: 'Updated pricing $99' },
    beta: { hash: 'bbb', excerpt: 'same' },
  });
  assert.equal(changed.length, 1);
  assert.equal(changed[0].competitorId, 'alpha');
  assert.equal(changed[0].kind, 'pricing');
});

test('buildBrief splits sales, marketing, product, and memory sections', () => {
  const brief = buildBrief({
    roster: [{ id: 'alpha' }, { id: 'beta' }],
    events: [{
      ts: '2026-08-19T12:00:00.000Z',
      kind: 'pricing',
      title: 'Alpha dropped OBD',
      competitorId: 'alpha',
    }, {
      ts: '2026-08-19T12:01:00.000Z',
      kind: 'launch',
      title: 'Beta launched yard testing',
      competitorId: 'beta',
    }, {
      ts: '2026-08-19T12:02:00.000Z',
      kind: 'integration',
      title: 'Beta connected to Motive',
      competitorId: 'beta',
    }],
    voice: [{ theme: 'quarterly 2027 in the yard', count: 4 }],
    assignments: [{ question: 'Did A+ change OVI pricing?' }],
  }, { date: '2026-08-19' });

  assert.match(brief.markdown, /## Sales — what to say/);
  assert.match(brief.markdown, /## Marketing — what changed/);
  assert.match(brief.markdown, /## Product — what deserves another look/);
  assert.match(brief.markdown, /## Memory carried forward/);
  assert.match(brief.markdown, /Did A\+ change OVI pricing/);
  assert.match(brief.markdown, /quarterly 2027 in the yard/);
  assert.match(brief.markdown, /Beta connected to Motive/);
  assert.equal(brief.counts.roster, 2);
  assert.equal(brief.counts.events, 3);
  assert.equal(brief.counts.product, 2);
});

test('memory compounds: second loadContext sees events, voice, and prior assignments', async () => {
  const root = await seedIntelRoot();
  await appendEvent({
    competitorId: 'alpha',
    kind: 'pricing',
    title: 'Alpha posted $69 OBD',
    sourceUrl: 'https://alpha.example',
  }, root);
  await addVoice('fleets keep asking about the 2027 quarterly mandate', { theme: '2027 quarterly' }, root);
  await saveAssignment({
    question: 'Did Alpha change OBD pricing?',
    findings: 'Observed $69 OBD on the public page.',
  }, root);

  const first = await loadContext({ root });
  assert.equal(first.roster.length, 2);
  assert.equal(first.events.length, 1);
  assert.equal(first.voice[0].count, 1);
  assert.match(first.assignments[0].question, /Alpha change OBD/);

  const memory = formatMemory(first);
  assert.match(memory, /PREVIOUS RESEARCH/);
  assert.match(memory, /Did Alpha change OBD pricing/);
  assert.match(memory, /CUSTOMER VOICE/);
  assert.match(memory, /2027 quarterly/);
  assert.match(memory, /RECENT EVENTS/);
  assert.match(memory, /alpha \/ pricing/);

  await addVoice('fleets keep asking about the 2027 quarterly mandate', { theme: '2027 quarterly' }, root);
  const second = await loadContext({ root });
  assert.equal(second.voice[0].count, 2);
  assert.match(formatMemory(second), /x2/);
});

test('runAssign with a fake Kimi client stores findings that the next assignment loads', async () => {
  const root = await seedIntelRoot();
  const kimiAsk = async (user, { memory }) => {
    assert.match(memory, /PREVIOUS RESEARCH: none yet/);
    assert.match(user, /A\+ change OVI/);
    return { text: 'Memory is silent on A+ OVI. Watch aplus-ctc next.', tokens: 11 };
  };

  const first = await runAssign('Did A+ change OVI pricing in the Central Valley?', { root, kimiAsk });
  assert.match(first.findings, /Memory is silent/);
  assert.equal(first.assignment.question, 'Did A+ change OVI pricing in the Central Valley?');

  const calls = [];
  const secondAsk = async (user, { memory }) => {
    calls.push({ user, memory });
    return { text: 'Carry forward: still watching aplus-ctc.', tokens: 7 };
  };
  await runAssign('What should sales say if a fleet names A+?', { root, kimiAsk: secondAsk });
  assert.equal(calls.length, 1);
  assert.match(calls[0].memory, /Did A\+ change OVI pricing in the Central Valley/);
  assert.match(calls[0].memory, /Memory is silent on A\+ OVI/);
});

test('runWatch diffs public pages via fetchImpl and writes a brief without calling Kimi', async () => {
  const root = await seedIntelRoot();
  const fakeFetch = async () => ({
    ok: true,
    status: 200,
    text: async () => '<html><body>Introducing mobile testing. Pricing $88. Integrates with Motive.</body></html>',
  });

  const first = await runWatch({
    root,
    fetchPages: true,
    fetchImpl: fakeFetch,
    delayMs: 0,
    kimiAsk: null,
  });
  assert.equal(first.rosterCount, 2);
  assert.equal(first.newEvents.length, 2);
  assert.equal(first.kimiUsed, false);
  assert.match(first.markdown, /## Sales — what to say/);

  const second = await runWatch({
    root,
    fetchPages: true,
    fetchImpl: fakeFetch,
    delayMs: 0,
    kimiAsk: null,
  });
  assert.equal(second.newEvents.length, 0);
  assert.match(second.markdown, /First snapshot/);
});

test('runVoice rejects empty quotes and runBrief writes a markdown file', async () => {
  const root = await seedIntelRoot();
  await assert.rejects(() => runVoice('  ', { root }), /empty/);
  const logged = await runVoice('they want Saturday yard tests', { root, theme: 'saturday yard' });
  assert.equal(logged.themeCount, 1);

  const brief = await runBrief({ root, kimiAsk: null });
  const written = await readFile(brief.file, 'utf8');
  assert.match(written, /Daily intel brief/);
  assert.match(written, /saturday yard/);
});

describe('kimi client env', { concurrency: false }, () => {
  test('askKimi sends the short system prompt plus memory and reads tokens from the payload', async () => {
    process.env.KIMI_API_KEY = 'test-key';
    process.env.KIMI_BASE_URL = 'https://kimi.test/v1';
    process.env.KIMI_MODEL = 'kimi-test';

    try {
      const calls = [];
      const fetchImpl = async (url, init) => {
        calls.push({ url, init });
        return {
          ok: true,
          json: async () => ({
            choices: [{ message: { content: '  Observed only. No invented price.  ' } }],
            usage: { prompt_tokens: 10, completion_tokens: 4 },
          }),
        };
      };

      const result = await askKimi('What changed?', { fetchImpl, memory: 'ROSTER: 30 competitors.' });
      assert.equal(result.text, 'Observed only. No invented price.');
      assert.equal(result.tokens, 14);
      assert.equal(calls[0].url, 'https://kimi.test/v1/chat/completions');
      const body = JSON.parse(calls[0].init.body);
      assert.equal(body.model, 'kimi-test');
      assert.equal(body.messages[0].content, KIMI_SYSTEM);
      assert.equal(body.messages[1].content, 'ROSTER: 30 competitors.');
      assert.match(KIMI_SYSTEM, /not a longer prompt/);
      assert.equal(kimiEnabled(), true);
      assert.equal(kimiConfig().baseUrl, 'https://kimi.test/v1');
    } finally {
      delete process.env.KIMI_API_KEY;
      delete process.env.KIMI_BASE_URL;
      delete process.env.KIMI_MODEL;
    }
    assert.equal(kimiEnabled(), false);
  });

  test('askKimi throws when the key is missing or the API returns an empty message', async () => {
    delete process.env.KIMI_API_KEY;
    await assert.rejects(() => askKimi('hi', { fetchImpl: async () => ({}) }), /KIMI_API_KEY/);

    process.env.KIMI_API_KEY = 'test-key';
    try {
      await assert.rejects(
        () => askKimi('hi', {
          fetchImpl: async () => ({
            ok: false,
            status: 401,
            text: async () => 'nope',
          }),
        }),
        /Kimi API 401/,
      );
      await assert.rejects(
        () => askKimi('hi', {
          fetchImpl: async () => ({
            ok: true,
            json: async () => ({ choices: [{ message: { content: '   ' } }] }),
          }),
        }),
        /empty message/,
      );
    } finally {
      delete process.env.KIMI_API_KEY;
    }
  });

  test('runAgent for kimi degrades to a structural brief when the key is missing', async () => {
    const root = await seedIntelRoot();
    delete process.env.KIMI_API_KEY;
    const result = await runAgent('kimi', 'brief me', { intelRoot: root });
    assert.equal(result.name, 'Kimi');
    assert.equal(result.tokens, 0);
    assert.match(result.text, /KIMI_API_KEY is not set/);
    assert.match(result.text, /MEMORY SNAPSHOT/);
  });
});

test('htmlToExcerpt drops script and style bodies even when the closing tag has whitespace', () => {
  const html = '<html><script type="text/javascript">Introducing pricing $99</script ><style>launch { color: red }</style ><body>Yard testing</body></html>';
  const excerpt = htmlToExcerpt(html);
  assert.doesNotMatch(excerpt, /pricing/);
  assert.doesNotMatch(excerpt, /launch/);
  assert.match(excerpt, /Yard testing/);
});

test('snapshotRoster records fetch failures without throwing', async () => {
  const roster = [{ id: 'alpha', name: 'Alpha', url: 'https://alpha.example' }];
  const snapshots = await snapshotRoster(roster, {
    delayMs: 0,
    hashPage,
    fetchImpl: async () => {
      throw new Error('network down');
    },
  });
  assert.equal(snapshots.alpha.hash, null);
  assert.match(snapshots.alpha.error, /network down/);
});

test('kimi is on the Slack roster, intel swarm, and recon-intel mission', () => {
  assert.equal(AGENTS.kimi.provider, 'kimi');
  assert.equal(AGENTS.kimi.channel, '#recon-market');
  assert.ok(SWARM_PRESETS.intel.agents.includes('kimi'));
  assert.ok(SWARM_PRESETS.full.agents.includes('kimi'));
  assert.deepEqual(MISSIONS['recon-intel'].agents, ['kimi']);
  assert.equal(MISSIONS['recon-intel'].channel, '#recon-market');
  for (const [id, agent] of Object.entries(AGENTS)) {
    if (id === 'kimi') continue;
    assert.equal(agent.provider, 'anthropic', `${id} should default to anthropic`);
  }
});

test('runAgent for kimi prepends memory and stores the answer as the next assignment', async () => {
  const root = await seedIntelRoot();
  await appendEvent({
    competitorId: 'alpha',
    kind: 'launch',
    title: 'Alpha launched Saturday hours',
  }, root);

  const calls = [];
  const kimiAsk = async (user, { memory }) => {
    calls.push({ user, memory });
    return { text: `Respond to: ${user}`, tokens: 5 };
  };

  const first = await runAgent('kimi', 'What do we say about Alpha Saturdays?', { kimiAsk, intelRoot: root });
  assert.equal(first.name, 'Kimi');
  assert.equal(first.tokens, 5);
  assert.match(calls[0].memory, /Alpha launched Saturday hours/);

  await runAgent('kimi', 'Follow up: any pricing change?', { kimiAsk, intelRoot: root });
  assert.match(calls[1].memory, /What do we say about Alpha Saturdays/);
  assert.match(calls[1].memory, /Respond to: What do we say about Alpha Saturdays/);
});
