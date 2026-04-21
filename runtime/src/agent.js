import Anthropic from '@anthropic-ai/sdk';
import { loadSkill, getApiKey } from './config.js';
import { logActivity, updateAgentStatus } from './activity.js';

let client = null;

function getClient() {
  if (client) return client;
  const key = getApiKey();
  if (!key) throw new Error('No Anthropic API key found. Set ANTHROPIC_API_KEY or configure ~/.openclaw/openclaw.json');
  client = new Anthropic({ apiKey: key });
  return client;
}

const MODEL = 'claude-sonnet-4-20250514';
const MAX_TOKENS = 4096;

export async function runAgent(agentDef, task, { tools = [], onToolCall = null, parentId = null } = {}) {
  const skillPrompt = loadSkill(agentDef.skillDir);
  if (!skillPrompt) throw new Error(`Skill not found: ${agentDef.skillDir}`);

  const systemPrompt = [
    skillPrompt,
    '',
    '---',
    `You are ${agentDef.name} (${agentDef.role}) in the SilverbackAI agent team.`,
    'You are executing a task assigned by the orchestrator. Be direct and actionable.',
    'Return concrete output — not plans about what you would do, but the actual work product.',
  ].join('\n');

  await updateAgentStatus(agentDef.id, 'working', task);

  const messages = [{ role: 'user', content: task }];
  let finalText = '';

  try {
    const apiTools = tools.length > 0 ? tools : undefined;
    let response = await getClient().messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      system: systemPrompt,
      messages,
      ...(apiTools ? { tools: apiTools } : {}),
    });

    let iterations = 0;
    const MAX_ITERATIONS = 10;

    while (iterations < MAX_ITERATIONS) {
      iterations++;
      const textBlocks = response.content.filter(b => b.type === 'text');
      const toolBlocks = response.content.filter(b => b.type === 'tool_use');

      if (textBlocks.length > 0) {
        finalText += textBlocks.map(b => b.text).join('\n');
      }

      if (response.stop_reason === 'end_turn' || toolBlocks.length === 0) break;

      const toolResults = [];
      for (const toolCall of toolBlocks) {
        let result = { type: 'text', text: 'Tool not handled' };
        if (onToolCall) {
          result = await onToolCall(toolCall.name, toolCall.input, agentDef);
        }
        toolResults.push({ type: 'tool_result', tool_use_id: toolCall.id, content: typeof result === 'string' ? result : JSON.stringify(result) });
      }

      messages.push({ role: 'assistant', content: response.content });
      messages.push({ role: 'user', content: toolResults });

      response = await getClient().messages.create({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: systemPrompt,
        messages,
        ...(apiTools ? { tools: apiTools } : {}),
      });
    }

    await logActivity(agentDef.id, `Completed: ${task.slice(0, 80)}`, parentId ? 'subtask' : 'task');
    await updateAgentStatus(agentDef.id, 'idle', null, task.slice(0, 80));
    return finalText;

  } catch (err) {
    await updateAgentStatus(agentDef.id, 'blocked', `Error: ${err.message}`);
    throw err;
  }
}
