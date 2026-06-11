import { parseCsvEnv, parseIntegerEnv } from '../shared/runtime-contract.js';

export const MILA_CONFIG = {
  port: parseIntegerEnv('MILA_PORT', 3001, 1),
  allowedOrigins: parseCsvEnv('MILA_ALLOWED_ORIGINS'),
  maxMessageChars: parseIntegerEnv('MILA_MAX_MESSAGE_CHARS', 2000, 250),
  sessionHistoryLimit: parseIntegerEnv('MILA_SESSION_HISTORY_LIMIT', 20, 4),
  sessionTtlMs: parseIntegerEnv('MILA_SESSION_TTL_MINUTES', 720, 5) * 60 * 1000,
  maxActiveSessions: parseIntegerEnv('MILA_MAX_ACTIVE_SESSIONS', 200, 1),
  leadRetentionLimit: parseIntegerEnv('MILA_LEAD_RETENTION_LIMIT', 200, 1),
  // Claude on Vertex AI: auth via the Cloud Run service account's identity
  // (Application Default Credentials). No ANTHROPIC_API_KEY required.
  vertexRegion: process.env.CLOUD_ML_REGION || 'us-east5',
  vertexProjectId:
    process.env.ANTHROPIC_VERTEX_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'samantha',
  // Anthropic-on-Vertex model IDs use `@` instead of `-` before the date.
  model: process.env.MILA_MODEL || 'claude-haiku-4-5@20251001',
  maxTokens: parseIntegerEnv('MILA_MAX_TOKENS', 1024, 64),
};
