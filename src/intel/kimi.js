export const KIMI_SYSTEM = `You are Kimi, the Gillis competitive analyst for NorCal CARB Mobile.
You do not redo research. MEMORY and CUSTOMER_VOICE are the source of truth.
Only report what is new or what contradicts memory.
Never invent a launch, a price, an integration, or a quote.
If MEMORY is empty, say so and baseline — do not speculate.
Split every brief into Sales (what to say), Marketing (what changed), Product (what deserves another look).
The fix for disappearing research is this memory, not a longer prompt.`;

export function kimiEnabled() {
  return Boolean(process.env.KIMI_API_KEY);
}

export function kimiConfig() {
  return {
    baseUrl: process.env.KIMI_BASE_URL || 'https://api.moonshot.ai/v1',
    model: process.env.KIMI_MODEL || 'kimi-k2-turbo-preview',
  };
}

export async function askKimi(user, { fetchImpl = fetch, memory = '' } = {}) {
  if (!kimiEnabled()) {
    throw new Error('KIMI_API_KEY is not set.');
  }

  const { baseUrl, model } = kimiConfig();
  const response = await fetchImpl(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.KIMI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      messages: [
        { role: 'system', content: KIMI_SYSTEM },
        ...(memory ? [{ role: 'system', content: memory }] : []),
        { role: 'user', content: user },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Kimi API ${response.status}: ${body.slice(0, 400)}`);
  }

  const payload = await response.json();
  const text = payload.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error('Kimi returned an empty message.');
  }
  return {
    text,
    tokens: (payload.usage?.prompt_tokens || 0) + (payload.usage?.completion_tokens || 0),
  };
}
