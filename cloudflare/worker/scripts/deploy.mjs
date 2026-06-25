import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { readdir } from 'node:fs/promises';

const here = dirname(fileURLToPath(import.meta.url));
const workerDir = resolve(here, '..');
const repoRoot = resolve(workerDir, '..', '..');
const configPath = resolve(workerDir, 'wrangler.toml');
const syncScript = resolve(workerDir, 'scripts', 'sync-kv.mjs');
const sitesDir = resolve(repoRoot, 'cloudflare', 'sites');

function usageAndExit(code) {
  console.error('Usage: node cloudflare/worker/scripts/deploy.mjs <site|all>');
  process.exit(code);
}

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: 'inherit', cwd: repoRoot, env: process.env });
  if (result.error?.code === 'ENOENT') {
    throw new Error(`${cmd} not found on PATH.`);
  }
  if (typeof result.status === 'number' && result.status !== 0) {
    throw new Error(`${cmd} exited with code ${result.status}`);
  }
}

async function listSites() {
  const entries = await readdir(sitesDir, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
}

const target = process.argv[2];
if (!target) usageAndExit(1);

if (target === 'all') {
  const sites = await listSites();
  const failed = [];
  for (const site of sites) {
    try {
      run('node', [syncScript, site]);
      run('wrangler', ['deploy', '--env', site, '--config', configPath]);
      console.log(`✓ deployed ${site}`);
    } catch (err) {
      failed.push(site);
      console.error(`✗ skipped ${site}: ${err.message}`);
    }
  }
  if (failed.length) {
    console.error(`\nDeployed with ${failed.length} failure(s): ${failed.join(', ')}`);
    process.exit(1);
  }
  process.exit(0);
}

run('node', [syncScript, target]);
run('wrangler', ['deploy', '--env', target, '--config', configPath]);
