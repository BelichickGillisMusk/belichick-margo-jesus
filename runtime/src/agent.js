import { loadSkill } from './config.js';
import { logActivity, updateAgentStatus } from './activity.js';
import { callProvider, supportsTools } from './providers/index.js';

const MAX_TOKENS = 4096;
const MAX_ITERATIONS = 10;

export async function runAgent(agentDef, task, { tools = [], onToolCall = null, parentId = null } = {}) {
  const skillPrompt = loadSkill(agentDef.skillDir);
  if (!skillPrompt) throw new Error(`Skill not found: ${agentDef.skillDir}`);

  const systemPrompt = [
    skillPrompt,
    '',
    '---',
    `You are ${agentDef.name} (${agentDef.role}) in the SilverbackAI agent team.`,
    `You are running on ${agentDef.provider} (${agentDef.model}).`,
    'You are executing a task assigned by the orchestrator. Be direct and actionable.',
    'Return concrete output — not plans about what you would do, but the actual work product.',
  ].join('\n');

  await updateAgentStatus(agentDef.id, 'working', task);

  const messages = [{ role: 'user', content: task }];
  let finalText = '';
  const wantTools = tools.length > 0 && supportsTools(agentDef.provider);

  try {
    let response = await callProvider(agentDef.provider, {
      model: agentDef.model,
      system: systemPrompt,
      messages,
      tools: wantTools ? tools : undefined,
      maxTokens: MAX_TOKENS,
    });

    let iterations = 0;
    while (iterations < MAX_ITERATIONS) {
      iterations++;
      if (response.text) finalText += (finalText ? '\n' : '') + response.text;
      if (response.stopReason === 'end_turn' || !response.toolCalls || response.toolCalls.length === 0) break;

      const toolResults = [];
      for (const toolCall of response.toolCalls) {
        let result = { type: 'text', text: 'Tool not handled' };
        if (onToolCall) {
          result = await onToolCall(toolCall.name, toolCall.input, agentDef);
        }
        toolResults.push({ id: toolCall.id, result });
      }

      messages.push({ role: 'assistant', content: response.raw });
      messages.push({
        role: 'user',
        content: toolResults.map(r => ({
          type: 'tool_result',
          tool_use_id: r.id,
          content: typeof r.result === 'string' ? r.result : JSON.stringify(r.result),
        })),
      });

      response = await callProvider(agentDef.provider, {
        model: agentDef.model,
        system: systemPrompt,
        messages,
        tools: wantTools ? tools : undefined,
        maxTokens: MAX_TOKENS,
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
