import OpenAI from 'openai';

const clients = new Map();

function getClient(apiKey, baseURL) {
  const cacheKey = apiKey + (baseURL || '');
  if (clients.has(cacheKey)) return clients.get(cacheKey);
  const client = new OpenAI({ apiKey, ...(baseURL ? { baseURL } : {}) });
  clients.set(cacheKey, client);
  return client;
}

export async function callOpenAI({ apiKey, model, system, messages, baseURL, maxTokens = 4096 }) {
  const c = getClient(apiKey, baseURL);
  const formattedMessages = [
    { role: 'system', content: system },
    ...messages.map(m => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    })),
  ];

  const response = await c.chat.completions.create({
    model,
    messages: formattedMessages,
    max_tokens: maxTokens,
  });

  const text = response.choices[0]?.message?.content || '';
  return {
    text,
    toolCalls: [],
    stopReason: response.choices[0]?.finish_reason || 'stop',
    raw: response.choices[0]?.message,
  };
}

export async function callGrok(opts) {
  return callOpenAI({ ...opts, baseURL: 'https://api.x.ai/v1' });
}
