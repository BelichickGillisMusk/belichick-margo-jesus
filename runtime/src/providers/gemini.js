import { GoogleGenerativeAI } from '@google/generative-ai';

const clients = new Map();

function getClient(apiKey) {
  if (clients.has(apiKey)) return clients.get(apiKey);
  const client = new GoogleGenerativeAI(apiKey);
  clients.set(apiKey, client);
  return client;
}

export async function callGemini({ apiKey, model, system, messages, maxTokens = 4096 }) {
  const c = getClient(apiKey);
  const genModel = c.getGenerativeModel({
    model,
    systemInstruction: system,
    generationConfig: { maxOutputTokens: maxTokens },
  });

  const history = messages.slice(0, -1).map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }],
  }));

  const last = messages[messages.length - 1];
  const lastText = typeof last.content === 'string' ? last.content : JSON.stringify(last.content);

  const chat = genModel.startChat({ history });
  const result = await chat.sendMessage(lastText);
  const text = result.response.text();

  return {
    text,
    toolCalls: [],
    stopReason: result.response.candidates?.[0]?.finishReason || 'STOP',
    raw: result.response,
  };
}
