import { parseCsvEnv, parseIntegerEnv } from '../shared/runtime-contract.js';

export const MILA_CONFIG = {
  port: parseIntegerEnv('MILA_PORT', 3001, 1),
  allowedOrigins: parseCsvEnv('MILA_ALLOWED_ORIGINS'),
  maxMessageChars: parseIntegerEnv('MILA_MAX_MESSAGE_CHARS', 2000, 250),
  sessionHistoryLimit: parseIntegerEnv('MILA_SESSION_HISTORY_LIMIT', 20, 4),
  sessionTtlMs: parseIntegerEnv('MILA_SESSION_TTL_MINUTES', 720, 5) * 60 * 1000,
  maxActiveSessions: parseIntegerEnv('MILA_MAX_ACTIVE_SESSIONS', 200, 1),
  leadRetentionLimit: parseIntegerEnv('MILA_LEAD_RETENTION_LIMIT', 200, 1),
};
