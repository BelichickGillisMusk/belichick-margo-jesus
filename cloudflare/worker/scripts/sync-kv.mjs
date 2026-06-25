import { existsSync, readFileSync } from 'node:fs';
import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { ensureKvNamespace } from './ensure-kv.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const workerDir = resolve(here, '..');
const repoRoot = resolve(workerDir, '..', '..');
const configPath = resolve(workerDir, 'wrangler.toml');
const sitesDir = resolve(repoRoot, 'cloudflare', 'sites');
const default404Path = resolve(workerDir, 'assets', '404.html');

function usageAndExit(code) {
  console.error('Usage: node cloudflare/worker/scripts/sync-kv.mjs <site|all>');
  console.error('Example: node cloudflare/worker/scripts/sync-kv.mjs hayward');
  process.exit(code);
}

function getEnvKvNamespaceId(envName) {
  const toml = readFileSync(configPath, 'utf8');
  const start = toml.indexOf(`[env.${envName}]`);
  if (start === -1) return null;
  const rest = toml.slice(start + `[env.${envName}]`.length);
  const end = rest.search(/\n\[env\./);
  const section = end === -1 ? rest : rest.slice(0, end);
  const match = section.match(/id\s*=\s*"([^"]+)"/);
  return match?.[1] ?? null;
}

function runWrangler(args) {
  const result = spawnSync('wrangler', args, {
    stdio: 'inherit',
    env: process.env,
    cwd: repoRoot,
  });
  if (result.error?.code === 'ENOENT') {
    throw new Error('wrangler not found on PATH. Install it with: npm i -g wrangler');
  }
  if (typeof result.status === 'number' && result.status !== 0) {
    throw new Error(`wrangler exited with code ${result.status}`);
  }
}

async function listSites() {
  const entries = await readdir(sitesDir, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

async function syncSite(site) {
  let kvId = getEnvKvNamespaceId(site);
  if (!kvId) {
    throw new Error(`No [env.${site}] found in ${configPath}`);
  }
  if (kvId === 'REPLACE_ME') {
    const title = `${site}-SITE_KV`;
    console.log(`==> Provisioning KV namespace "${title}" for ${site}`);
    kvId = ensureKvNamespace({ configPath, site, title });
    console.log(`==> Using KV namespace id ${kvId} for ${site}`);
  }

  const indexPath = resolve(sitesDir, site, 'index.html');
  if (!existsSync(indexPath)) {
    throw new Error(`Missing template: ${indexPath}`);
  }
  if (!existsSync(default404Path)) {
    throw new Error(`Missing default 404: ${default404Path}`);
  }

  runWrangler([
    'kv:key',
    'put',
    'index.html',
    '--path',
    indexPath,
    '--binding',
    'SITE_KV',
    '--env',
    site,
    '--config',
    configPath,
  ]);

  runWrangler([
    'kv:key',
    'put',
    '404.html',
    '--path',
    default404Path,
    '--binding',
    'SITE_KV',
    '--env',
    site,
    '--config',
    configPath,
  ]);
}

const target = process.argv[2];
if (!target) usageAndExit(1);

if (target === 'all') {
  const sites = await listSites();
  for (const site of sites) {
    console.log(`\n==> Syncing KV for ${site}`);
    await syncSite(site);
  }
  process.exit(0);
}

await syncSite(target);
