// HTTP client for the Samantha Cloud Run service (`POST /api/samantha/chat`).
//
// Slack DMs and @mentions route through this so Samantha's "brain" stays in
// one place — Cloud Run + Vertex AI — instead of being duplicated in the
// local Slack bot's direct Anthropic SDK calls (which `runAgent('samantha')`
// in dispatch.js still uses for one-shot /dispatch commands).
//
// Set SAMANTHA_URL to the Cloud Run service URL (e.g.
// https://samantha-<projectnum>.us-east5.run.app). Leave it unset to disable
// the DM integration — the rest of the bot keeps working.

const DEFAULT_TIMEOUT_MS = 60_000;

export function samanthaEnabled(env = process.env) {
  return Boolean(env.SAMANTHA_URL && env.SAMANTHA_URL.trim());
}

export async function callSamantha(message, history = [], {
  url = process.env.SAMANTHA_URL,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!url) {
    throw new Error('SAMANTHA_URL is not set; cannot reach the Samantha Cloud Run service.');
  }
  if (typeof fetchImpl !== 'function') {
    throw new Error('No fetch implementation available (need Node 18+).');
  }

  const endpoint = url.replace(/\/+$/, '') + '/api/samantha/chat';
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      const snippet = detail.slice(0, 300);
      throw new Error(`Samantha returned HTTP ${response.status}${snippet ? `: ${snippet}` : ''}`);
    }

    const data = await response.json();
    if (typeof data?.reply !== 'string') {
      throw new Error('Samantha response missing `reply` field.');
    }
    return {
      reply: data.reply,
      tokens: typeof data.tokens === 'number' ? data.tokens : 0,
      model: data.model || null,
    };
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error(`Samantha did not reply within ${timeoutMs}ms.`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
