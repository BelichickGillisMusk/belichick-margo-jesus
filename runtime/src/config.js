import { readFileSync, writeFileSync, existsSync, chmodSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import { hostname } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');
const SKILLS_DIR = join(PROJECT_ROOT, 'skills');

// Provider/model assignments — each agent uses the cheapest model that fits its job.
// Only Belichick needs Claude (tool_use for delegation). Sub-agents can use any provider.
const AGENT_REGISTRY = [
  { id: 'belichick',      skillDir: 'belichick-strategy',   name: 'Belichick',        role: 'The Strategist',           provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  { id: 'sloan-carb',     skillDir: 'sloan-carb-cs',        name: 'Sloan (CARB CS)',   role: 'Clean Truck Check Support', provider: 'anthropic', model: 'claude-haiku-4-5-20251001' },
  { id: 'sloan-legal',    skillDir: 'sloan-legal',          name: 'Sloan (Legal)',     role: 'Regulatory Research',       provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  { id: 'atlas',           skillDir: 'atlas-creative',       name: 'Atlas',             role: 'YouTube & Creative (Blog)', provider: 'openai',    model: 'gpt-4o-mini' },
  { id: 'closer',          skillDir: 'closer-sales',         name: 'Closer',            role: 'Sales Agent',               provider: 'anthropic', model: 'claude-sonnet-4-20250514' },
  { id: 'jon-jones',      skillDir: 'jon-jones-guardian',    name: 'Jon Jones',         role: 'Guardian Bot',              provider: 'anthropic', model: 'claude-haiku-4-5-20251001' },
  { id: 'builder-deploy', skillDir: 'builder-deploy',       name: 'Builder-Deploy',    role: 'Ship & Deploy',             provider: 'anthropic', model: 'claude-haiku-4-5-20251001' },
  { id: 'lead-scraper',   skillDir: 'gemini-lead-scraper',  name: 'Lead Scraper',      role: 'Google Maps Leads',         provider: 'gemini',    model: 'gemini-2.0-flash' },
  { id: 'nova',            skillDir: 'atlas-creative',       name: 'Nova',              role: 'Blog & Social Posts',       provider: 'grok',      model: 'grok-2-1212' },
];

export function loadSkill(skillDir) {
  const path = join(SKILLS_DIR, skillDir, 'SKILL.md');
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf-8');
}

const PROVIDER_ENV = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai:    'OPENAI_API_KEY',
  gemini:    'GEMINI_API_KEY',
  grok:      'GROK_API_KEY',
};

const PROVIDER_CONFIG_PATHS = {
  anthropic: ['apiKeys.anthropic', 'gateway.apiKey'],
  openai:    ['apiKeys.openai',    'apiKeys.chatgpt'],
  gemini:    ['apiKeys.gemini',    'apiKeys.google'],
  grok:      ['apiKeys.grok',      'apiKeys.xai'],
};

function loadOpenclawConfig() {
  const configPaths = [
    join(process.env.HOME || '', '.openclaw', 'openclaw.json'),
    join(PROJECT_ROOT, 'openclaw-config.json5'),
  ];
  for (const p of configPaths) {
    if (!existsSync(p)) continue;
    try {
      const raw = readFileSync(p, 'utf-8')
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '');
      return JSON.parse(raw);
    } catch { /* skip malformed */ }
  }
  return null;
}

function getNestedValue(obj, path) {
  return path.split('.').reduce((o, k) => o?.[k], obj);
}

export function getProviderKey(provider) {
  const envVar = PROVIDER_ENV[provider];
  if (envVar && process.env[envVar]) return process.env[envVar];

  const config = loadOpenclawConfig();
  if (!config) return null;

  for (const path of (PROVIDER_CONFIG_PATHS[provider] || [])) {
    const key = getNestedValue(config, path);
    if (key && typeof key === 'string' && !key.startsWith('CONFIGURE:')) return key;
  }
  return null;
}

// Backwards-compatible alias used by old call sites.
export function getApiKey() {
  return getProviderKey('anthropic');
}

export function getAgent(id) {
  return AGENT_REGISTRY.find(a => a.id === id) || null;
}

export function getAllAgents() {
  return AGENT_REGISTRY;
}

export function getProjectRoot() {
  return PROJECT_ROOT;
}

const DEPLOY_KEY_PATH = join(process.env.HOME || '', '.openclaw', 'deploy.key');

export function generateDeployKey() {
  const key = randomBytes(32).toString('hex');
  const hash = createHash('sha256').update(key).digest('hex');
  const payload = JSON.stringify({
    owner: process.env.USER || 'unknown',
    created: new Date().toISOString(),
    machine: process.env.HOSTNAME || hostname(),
    hash,
  }, null, 2);
  writeFileSync(DEPLOY_KEY_PATH, payload, { mode: 0o600 });
  return key;
}

export function verifyDeployKey(providedKey) {
  if (!existsSync(DEPLOY_KEY_PATH)) return { valid: false, reason: 'No deploy key registered. Run: node src/cli.js keygen' };
  const data = JSON.parse(readFileSync(DEPLOY_KEY_PATH, 'utf-8'));
  const providedHash = createHash('sha256').update(providedKey).digest('hex');
  const expected = Buffer.from(data.hash, 'hex');
  const actual = Buffer.from(providedHash, 'hex');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return { valid: false, reason: 'Invalid deploy key' };
  }
  return { valid: true, owner: data.owner, created: data.created };
}

export function hasDeployKey() {
  return existsSync(DEPLOY_KEY_PATH);
}

export function getDeployKeyInfo() {
  if (!existsSync(DEPLOY_KEY_PATH)) return null;
  return JSON.parse(readFileSync(DEPLOY_KEY_PATH, 'utf-8'));
}
