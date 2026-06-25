import Anthropic from '@anthropic-ai/sdk';

let client = null;

function getClient(apiKey) {
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

export async function callAnthropic({ apiKey, model, system, messages, tools, maxTokens = 4096 }) {
  const c = getClient(apiKey);
  const response = await c.messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages,
    ...(tools && tools.length > 0 ? { tools } : {}),
  });

  const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
  const toolCalls = response.content.filter(b => b.type === 'tool_use').map(b => ({
    id: b.id, name: b.name, input: b.input,
  }));

  return {
    text,
    toolCalls,
    stopReason: response.stop_reason,
    raw: response.content,
  };
}

export function buildAnthropicToolResults(assistantContent, toolResults) {
  return [
    { role: 'assistant', content: assistantContent },
    {
      role: 'user',
      content: toolResults.map(r => ({
        type: 'tool_result',
        tool_use_id: r.id,
        content: typeof r.result === 'string' ? r.result : JSON.stringify(r.result),
      })),
    },
  ];
}
