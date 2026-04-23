import { readFileSync, writeFileSync, existsSync, chmodSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { randomBytes, createHash, timingSafeEqual } from 'crypto';
import { hostname } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = join(__dirname, '..', '..');
const SKILLS_DIR = join(PROJECT_ROOT, 'skills');

const AGENT_REGISTRY = [
  { id: 'belichick',      skillDir: 'belichick-strategy',   name: 'Belichick',        role: 'The Strategist' },
  { id: 'mila-carb',      skillDir: 'mila-carb-cs',         name: 'Mila (CARB CS)',    role: 'Clean Truck Check Support' },
  { id: 'mila-legal',     skillDir: 'mila-legal',           name: 'Mila (Legal)',      role: 'Regulatory Research' },
  { id: 'atlas',           skillDir: 'atlas-creative',       name: 'Atlas',             role: 'YouTube & Creative' },
  { id: 'closer',          skillDir: 'closer-sales',         name: 'Closer',            role: 'Sales Agent' },
  { id: 'jon-jones',      skillDir: 'jon-jones-guardian',    name: 'Jon Jones',         role: 'Guardian Bot' },
  { id: 'builder-deploy', skillDir: 'builder-deploy',       name: 'Builder-Deploy',    role: 'Ship & Deploy' },
  { id: 'lead-scraper',   skillDir: 'gemini-lead-scraper',  name: 'Lead Scraper',      role: 'Google Maps Leads' },
];

export function loadSkill(skillDir) {
  const path = join(SKILLS_DIR, skillDir, 'SKILL.md');
  if (!existsSync(path)) return null;
  return readFileSync(path, 'utf-8');
}

export function getApiKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;

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
      const config = JSON.parse(raw);
      const key = config?.apiKeys?.anthropic || config?.gateway?.apiKey;
      if (key && !key.startsWith('CONFIGURE:')) return key;
    } catch { /* skip malformed */ }
  }
  return null;
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
