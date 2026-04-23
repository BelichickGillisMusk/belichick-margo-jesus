import { callAnthropic } from './anthropic.js';
import { callOpenAI, callGrok } from './openai.js';
import { callGemini } from './gemini.js';
import { getProviderKey } from '../config.js';

export async function callProvider(provider, options) {
  const apiKey = getProviderKey(provider);
  if (!apiKey) {
    throw new Error(`No API key for provider "${provider}". Set ${envVarName(provider)} or configure ~/.openclaw/openclaw.json`);
  }

  const opts = { ...options, apiKey };

  switch (provider) {
    case 'anthropic': return await callAnthropic(opts);
    case 'openai':    return await callOpenAI(opts);
    case 'gemini':    return await callGemini(opts);
    case 'grok':      return await callGrok(opts);
    default: throw new Error(`Unknown provider: ${provider}`);
  }
}

export function envVarName(provider) {
  return {
    anthropic: 'ANTHROPIC_API_KEY',
    openai:    'OPENAI_API_KEY',
    gemini:    'GEMINI_API_KEY',
    grok:      'GROK_API_KEY',
  }[provider] || 'UNKNOWN_API_KEY';
}

export function supportsTools(provider) {
  return provider === 'anthropic';
}
