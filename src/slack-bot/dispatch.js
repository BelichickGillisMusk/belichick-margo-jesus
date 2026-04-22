import Anthropic from '@anthropic-ai/sdk';
import { AGENTS } from './agents.js';

const anthropic = new Anthropic();

export async function runAgent(agentId, task) {
  const agent = AGENTS[agentId];
  if (!agent) {
    throw new Error(`Unknown agent: ${agentId}`);
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

export async function runMission(agentIds, task) {
  const settled = await Promise.allSettled(agentIds.map(agentId => runAgent(agentId, task)));

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
