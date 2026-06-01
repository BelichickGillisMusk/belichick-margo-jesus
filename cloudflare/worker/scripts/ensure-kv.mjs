import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

function runWranglerCapture(args) {
  const result = spawnSync('wrangler', args, {
    encoding: 'utf8',
    env: process.env,
  });
  if (result.error?.code === 'ENOENT') {
    throw new Error('wrangler not found on PATH. Install it with: npm i -g wrangler');
  }
  if (typeof result.status === 'number' && result.status !== 0) {
    const stderr = (result.stderr || '').trim();
    const stdout = (result.stdout || '').trim();
    throw new Error(
      `wrangler ${args.join(' ')} failed (exit ${result.status}). ` +
        `${stderr || stdout || 'no output'}`,
    );
  }
  return result.stdout || '';
}

function extractJsonArray(text) {
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) {
    throw new Error(`Could not find JSON array in wrangler output:\n${text}`);
  }
  return JSON.parse(text.slice(start, end + 1));
}

function extractJsonObject(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

function listKvNamespaces() {
  // `--json` is supported by current wrangler and is the default for `list`;
  // passing it explicitly makes the behavior stable across versions/locales.
  const stdout = runWranglerCapture(['kv:namespace', 'list', '--json']);
  return extractJsonArray(stdout);
}

function createKvNamespace(title) {
  // Ask for JSON output so we get a stable `{ id, title, ... }` shape rather
  // than the human-readable TOML snippet that wrangler prints by default.
  // Fall back to scraping the legacy format if `--json` isn't honored.
  const stdout = runWranglerCapture(['kv:namespace', 'create', title, '--json']);
  const obj = extractJsonObject(stdout);
  if (obj && typeof obj.id === 'string' && obj.id) return obj.id;
  const match = stdout.match(/id\s*=\s*"([0-9a-fA-F]+)"/);
  if (match) return match[1];
  throw new Error(`Could not parse new KV namespace id from wrangler output:\n${stdout}`);
}

function patchEnvKvId(configPath, site, newId) {
  const toml = readFileSync(configPath, 'utf8');
  const header = `[env.${site}]`;
  const start = toml.indexOf(header);
  if (start === -1) throw new Error(`No ${header} in ${configPath}`);

  const after = toml.slice(start);
  const nextEnv = after.search(/\n\[env\./);
  const sectionEnd = nextEnv === -1 ? after.length : nextEnv;
  const section = after.slice(0, sectionEnd);
  if (!section.includes('REPLACE_ME')) return;

  const updatedSection = section.replace('REPLACE_ME', newId);
  const updated = toml.slice(0, start) + updatedSection + after.slice(sectionEnd);
  writeFileSync(configPath, updated, 'utf8');
}

export function ensureKvNamespace({ configPath, site, title }) {
  if (!process.env.CLOUDFLARE_API_TOKEN) {
    throw new Error(
      `Refusing to auto-provision KV namespace for [env.${site}]: ` +
        `CLOUDFLARE_API_TOKEN is not set. Either set it (so wrangler can manage the namespace ` +
        `non-interactively) or replace REPLACE_ME in ${configPath} manually.`,
    );
  }

  const namespaces = listKvNamespaces();
  const existing = namespaces.find((ns) => ns.title === title);
  const id = existing ? existing.id : createKvNamespace(title);

  patchEnvKvId(configPath, site, id);
  return id;
}
