import { fileURLToPath } from 'node:url';

export const AGENT_RUNTIME_SOURCE = 'src/slack-bot/agents.js';
export const DEFAULT_SAMANTHA_EMAIL = process.env.SAMANTHA_GOOGLE_WORKSPACE_EMAIL || 'samantha@norcalcarbmobile.com';

export const RUNTIME_SURFACES = [
  {
    id: 'slack-bot',
    entryPoint: 'src/slack-bot/index.js',
    mode: 'local-or-deployed',
    description: 'Slack slash-command interface for dispatching specialist agents and road-ready quick actions.',
  },
  {
    id: 'mila-chatbot',
    entryPoint: 'src/mila-chatbot/index.js',
    mode: 'local-or-deployed',
    description: 'Express chatbot API and embeddable widget for CARB compliance support.',
  },
  {
    id: 'samantha',
    entryPoint: 'src/samantha/index.js',
    mode: 'cloud-run',
    description: 'Samantha Express service deployed to Cloud Run; talks to Claude via Vertex AI.',
  },
  {
    id: 'lead-scraper',
    entryPoint: 'src/lead-scraper/index.js',
    mode: 'operator-run',
    description: 'CLI-driven Google Places lead scraper with optional Google Sheets export.',
  },
];

export const ENVIRONMENT_VARIABLES = {
  shared: ['ANTHROPIC_API_KEY', 'SAMANTHA_GOOGLE_WORKSPACE_EMAIL'],
  slack: [
    'SLACK_BOT_TOKEN',
    'SLACK_APP_TOKEN',
    'SLACK_SIGNING_SECRET',
    'ALLOWED_USER_IDS',
    'SLACK_MAX_CONCURRENT_MISSIONS',
    'SLACK_DAILY_TOKEN_BUDGET',
    'SLACK_MISSION_TOKEN_WARN_THRESHOLD',
  ],
  samantha: [
    'PORT',
    'CLOUD_ML_REGION',
    'ANTHROPIC_VERTEX_PROJECT_ID',
    'SAMANTHA_MODEL',
    'SAMANTHA_MAX_TOKENS',
    'SAMANTHA_ALLOWED_ORIGINS',
    'SAMANTHA_STATUS_TOKEN',
  ],
  mila: [
    'MILA_PORT',
    'MILA_ALLOWED_ORIGINS',
    'MILA_MAX_MESSAGE_CHARS',
    'MILA_SESSION_HISTORY_LIMIT',
    'MILA_SESSION_TTL_MINUTES',
    'MILA_MAX_ACTIVE_SESSIONS',
    'MILA_LEAD_RETENTION_LIMIT',
  ],
  scraper: [
    'GOOGLE_PLACES_API_KEY',
    'GOOGLE_SHEETS_ID',
    'GOOGLE_SERVICE_ACCOUNT_KEY',
    'SCRAPER_REQUEST_RETRIES',
    'SCRAPER_REQUEST_DELAY_MS',
  ],
};

export function parseIntegerEnv(name, fallback, minimum = Number.NEGATIVE_INFINITY) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return Math.max(parsed, minimum);
}

export function parseCsvEnv(name) {
  return (process.env[name] || '')
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
}

export function validateRequiredEnv(names) {
  return names.filter(name => !process.env[name]);
}

export function isMainModule(importMeta) {
  if (!process.argv[1]) {
    return false;
  }

  return fileURLToPath(importMeta.url) === process.argv[1];
}
