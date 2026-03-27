/**
 * leads-db/store.js
 * Simple JSON file store — no external deps, ES modules, dedup built in.
 * One source of truth at data/leads.json
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dir, '../../data');
const DB_PATH  = join(DATA_DIR, 'leads.json');

// ── File I/O ──────────────────────────────────────────────────
function load() {
  if (!existsSync(DB_PATH)) return { leads: [], _seq: 1 };
  try { return JSON.parse(readFileSync(DB_PATH, 'utf8')); }
  catch { return { leads: [], _seq: 1 }; }
}

function save(db) {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

// ── Dedup key: normalise name + (phone or website) ────────────
function dedupKey(lead) {
  const name    = (lead.name    || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  const phone   = (lead.phone   || '').replace(/\D/g, '');
  const website = (lead.website || '').toLowerCase().replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');
  return `${name}||${phone || website}`;
}

// ── Public API ────────────────────────────────────────────────

export function getAll({ search, industry, area, status } = {}) {
  const { leads } = load();
  return leads.filter(l => {
    if (status   && l.status   !== status)                        return false;
    if (industry && l.industry !== industry)                      return false;
    if (area     && l.area     !== area)                          return false;
    if (search) {
      const q = search.toLowerCase();
      const hay = `${l.name} ${l.industry} ${l.area} ${l.phone} ${l.website} ${l.notes}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function getById(id) {
  return load().leads.find(l => l.id === id) || null;
}

/** Returns { lead, created: bool } */
export function upsert(data) {
  const db  = load();
  const key = dedupKey(data);
  const existing = db.leads.find(l => dedupKey(l) === key);

  if (existing) {
    // Merge new data in but don't overwrite status/notes if already set
    Object.assign(existing, {
      ...data,
      status : data.status || existing.status,
      notes  : data.notes  || existing.notes,
      updatedAt: new Date().toISOString(),
    });
    save(db);
    return { lead: existing, created: false };
  }

  const lead = {
    id        : db._seq++,
    name      : data.name      || '',
    phone     : data.phone     || '',
    address   : data.address   || '',
    city      : data.city      || '',
    area      : data.area      || '',        // 'Stockton/SJC' | 'Sacramento/Roseville'
    website   : data.website   || '',
    industry  : data.industry  || '',
    rating    : data.rating    || null,
    reviews   : data.reviews   || null,
    fleetSize : data.fleetSize || '',        // e.g. '80+ trucks'
    source    : data.source    || 'manual', // 'manual' | 'google-places' | 'web-search'
    placeId   : data.placeId   || '',
    status    : data.status    || 'new',    // new|contacted|interested|scheduled|closed|dead
    notes     : data.notes     || '',
    createdAt : new Date().toISOString(),
    updatedAt : new Date().toISOString(),
  };

  db.leads.push(lead);
  save(db);
  return { lead, created: true };
}

export function update(id, patch) {
  const db = load();
  const lead = db.leads.find(l => l.id === id);
  if (!lead) return null;
  Object.assign(lead, patch, { updatedAt: new Date().toISOString() });
  save(db);
  return lead;
}

export function remove(id) {
  const db = load();
  const idx = db.leads.findIndex(l => l.id === id);
  if (idx === -1) return false;
  db.leads.splice(idx, 1);
  save(db);
  return true;
}

export function bulkUpsert(rows) {
  const results = { created: 0, updated: 0, skipped: 0 };
  for (const row of rows) {
    if (!row.name) { results.skipped++; continue; }
    const { created } = upsert(row);
    created ? results.created++ : results.updated++;
  }
  return results;
}

export function stats() {
  const { leads } = load();
  const byStatus = {};
  const byIndustry = {};
  const byArea = {};
  for (const l of leads) {
    byStatus[l.status]     = (byStatus[l.status]     || 0) + 1;
    byIndustry[l.industry] = (byIndustry[l.industry] || 0) + 1;
    byArea[l.area]         = (byArea[l.area]         || 0) + 1;
  }
  return { total: leads.length, byStatus, byIndustry, byArea };
}

export function exportCsv() {
  const { leads } = load();
  const cols = ['id','name','phone','address','city','area','website','industry',
                 'fleetSize','rating','reviews','status','notes','source','createdAt','updatedAt'];
  const esc = v => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = leads.map(l => cols.map(c => esc(l[c])).join(','));
  return [cols.join(','), ...rows].join('\n');
}
