import Anthropic from '@anthropic-ai/sdk';
import { AGENTS } from './agents.js';
import { askKimi, kimiEnabled } from '../intel/kimi.js';
import { buildBrief } from '../intel/brief.js';
import { formatMemory, loadContext, saveAssignment } from '../intel/store.js';

const anthropic = new Anthropic();

async function runKimiAgent(agentId, agent, task, {
  kimiAsk,
  intelRoot,
} = {}) {
  const start = Date.now();
  const context = await loadContext({ root: intelRoot });
  const memory = formatMemory(context);
  const ask = kimiAsk || (kimiEnabled() ? askKimi : null);

  let text;
  let tokens = 0;

  if (ask) {
    const asked = await ask(task, { memory });
    text = asked.text;
    tokens = asked.tokens || 0;
    await saveAssignment({
      question: task,
      findings: text,
      eventsUsed: context.events.map(event => event.id),
    }, intelRoot);
  } else {
    const built = buildBrief(context);
    text = [
      built.markdown,
      '',
      '_(KIMI_API_KEY is not set. This is the structural brief from memory — the why-it-matters layer needs the key. Memory was still loaded, so this is not a blank chat.)_',
      '',
      'MEMORY SNAPSHOT',
      memory,
    ].join('\n');
  }

  return {
    agentId,
    name: agent.name,
    text,
    elapsed: ((Date.now() - start) / 1000).toFixed(1),
    tokens,
  };
}

export async function runAgent(agentId, task, options = {}) {
  const agent = AGENTS[agentId];
  if (!agent) {
    throw new Error(`Unknown agent: ${agentId}`);
  }

  if (agent.provider === 'kimi') {
    return runKimiAgent(agentId, agent, task, options);
  }

  const start = Date.now();
  const response = await anthropic.messages.create({
    model: agent.model,
    max_tokens: 2048,
    system: agent.systemPrompt,
    messages: [{ role: 'user', content: task }],
  });

  const text = response.content
    .filter(block => block.type === 'text')
    .map(block => block.text)
    .join('\n')
    .trim() || '(no response)';

  return {
    agentId,
    name: agent.name,
    text,
    elapsed: ((Date.now() - start) / 1000).toFixed(1),
    tokens: response.usage.input_tokens + response.usage.output_tokens,
  };
}

function summarizeOutcomes(settled) {
  const results = [];
  const failures = [];

  for (const outcome of settled) {
    if (outcome.status === 'fulfilled') {
      results.push(outcome.value);
      continue;
    }

    failures.push({
      message: outcome.reason?.message || 'Unknown agent failure',
    });
  }

  return { results, failures };
}

function buildMissionPayload({ results, failures }) {
  if (results.length === 0) {
    throw new Error(failures.map(failure => failure.message).join('; '));
  }

  const combined = [
    ...results.map(result => `**${result.name}** (${result.elapsed}s, ${result.tokens} tokens):\n${result.text}`),
    ...failures.map(failure => `**Agent failure**\n${failure.message}`),
  ].join('\n\n---\n\n');

  return {
    names: results.map(result => result.name).join(' + '),
    combined,
    totalTokens: results.reduce((sum, result) => sum + result.tokens, 0),
    results,
    failures,
  };
}

export async function runMission(agentIds, task, options = {}) {
  const settled = await Promise.allSettled(agentIds.map(agentId => runAgent(agentId, task, options)));
  return buildMissionPayload(summarizeOutcomes(settled));
}

export async function runSwarm(agentIds, task, { parallelism = 3, runner = runAgent, ...runnerOptions } = {}) {
  if (!Array.isArray(agentIds) || agentIds.length === 0) {
    throw new Error('runSwarm requires at least one agent.');
  }

  const limit = Math.max(1, parallelism);
  const queue = [...agentIds];
  const allResults = [];
  const allFailures = [];

  while (queue.length > 0) {
    const batch = queue.splice(0, limit);
    const settled = await Promise.allSettled(batch.map(agentId => runner(agentId, task, runnerOptions)));
    const { results, failures } = summarizeOutcomes(settled);
    allResults.push(...results);
    allFailures.push(...failures);
  }

  return buildMissionPayload({ results: allResults, failures: allFailures });
}
