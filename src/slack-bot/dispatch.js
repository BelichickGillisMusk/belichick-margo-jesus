// Dispatch engine - sends tasks to Claude and returns results
import Anthropic from '@anthropic-ai/sdk';
import { AGENTS } from './agents.js';

const anthropic = new Anthropic();

// Run a single agent on a task
export async function runAgent(agentId, task) {
  const agent = AGENTS[agentId];
  if (!agent) throw new Error(`Unknown agent: ${agentId}`);

  const start = Date.now();

  const response = await anthropic.messages.create({
    model: agent.model,
    max_tokens: 2048,
    system: agent.systemPrompt,
    messages: [{ role: 'user', content: task }],
  });

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  const text = response.content[0]?.text || '(no response)';
  const tokens = response.usage.input_tokens + response.usage.output_tokens;

  return { agentId, name: agent.name, text, tokens, elapsed };
}

// Run multiple agents on the same task (parallel)
export async function runMission(agentIds, task) {
  const results = await Promise.all(
    agentIds.map(id => runAgent(id, task))
  );

  const totalTokens = results.reduce((sum, r) => sum + r.tokens, 0);
  const names = results.map(r => r.name).join(' + ');

  // Combine results
  const combined = results
    .map(r => `**${r.name}** (${r.elapsed}s, ${r.tokens} tokens):\n${r.text}`)
    .join('\n\n---\n\n');

  return { names, combined, totalTokens, results };
}
