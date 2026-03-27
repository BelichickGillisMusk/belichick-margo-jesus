/**
 * leads-db/server.js  —  Baby Commotion 🚧
 * Lead CRM + Google Places scraper + REST API.
 * Run: npm run commotion   →   http://localhost:3002
 */

import 'dotenv/config';
import express from 'express';
import cors    from 'cors';
import { getAll, getById, upsert, update, remove, bulkUpsert, stats, exportCsv } from './store.js';

const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY;

// ── Google Places helpers ──────────────────────────────────────
async function placesSearch(query, location) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  url.searchParams.set('query', `${query} in ${location}`);
  url.searchParams.set('key', PLACES_KEY);
  const r = await fetch(url);
  const d = await r.json();
  if (d.status !== 'OK') throw new Error(`Places API: ${d.status} ${d.error_message || ''}`);
  return d.results;
}

async function placesDetail(placeId) {
  const fields = 'name,formatted_phone_number,formatted_address,website,business_status,rating,user_ratings_total';
  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('fields', fields);
  url.searchParams.set('key', PLACES_KEY);
  const r = await fetch(url);
  const d = await r.json();
  return d.status === 'OK' ? d.result : null;
}

const app  = express();
const PORT = process.env.LEADS_PORT || 3002;

app.use(cors());
app.use(express.json());

// ── REST API ──────────────────────────────────────────────────

app.get('/api/leads', (req, res) => {
  const leads = getAll(req.query);
  res.json(leads);
});

app.get('/api/leads/stats', (_req, res) => res.json(stats()));

app.get('/api/leads/export.csv', (_req, res) => {
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="leads.csv"');
  res.send(exportCsv());
});

app.get('/api/leads/:id', (req, res) => {
  const lead = getById(Number(req.params.id));
  lead ? res.json(lead) : res.status(404).json({ error: 'Not found' });
});

app.post('/api/leads', (req, res) => {
  const result = upsert(req.body);
  res.status(result.created ? 201 : 200).json(result);
});

app.post('/api/leads/bulk', (req, res) => {
  const rows = Array.isArray(req.body) ? req.body : req.body.leads;
  res.json(bulkUpsert(rows || []));
});

app.put('/api/leads/:id', (req, res) => {
  const lead = update(Number(req.params.id), req.body);
  lead ? res.json(lead) : res.status(404).json({ error: 'Not found' });
});

app.delete('/api/leads/:id', (req, res) => {
  remove(Number(req.params.id)) ? res.json({ ok: true }) : res.status(404).json({ error: 'Not found' });
});

// ── Google Places Scrape → DB ─────────────────────────────────
app.post('/api/scrape', async (req, res) => {
  const { query, location, industry, area } = req.body || {};
  if (!query || !location) return res.status(400).json({ error: 'query and location required' });
  if (!PLACES_KEY) return res.status(500).json({ error: 'GOOGLE_PLACES_API_KEY not set in .env' });

  try {
    const results = await placesSearch(query, location);
    const leads = [];
    for (const r of results) {
      const detail = await placesDetail(r.place_id);
      if (!detail) continue;
      leads.push({
        name:     detail.name || r.name,
        phone:    detail.formatted_phone_number || '',
        address:  detail.formatted_address || r.formatted_address || '',
        city:     (detail.formatted_address || '').split(',')[1]?.trim() || '',
        website:  detail.website || '',
        rating:   detail.rating || r.rating || null,
        reviews:  detail.user_ratings_total || r.user_ratings_total || null,
        placeId:  r.place_id,
        industry: industry || '',
        area:     area || '',
        source:   'google-places',
      });
      await new Promise(resolve => setTimeout(resolve, 150));
    }
    const summary = bulkUpsert(leads);
    res.json({ found: results.length, ...summary, leads });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Web UI ────────────────────────────────────────────────────
app.get('/', (_req, res) => res.send(UI_HTML));

// ── Start ─────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🗂  Lead Database running → http://localhost:${PORT}`);
  console.log(`📡 API base: http://localhost:${PORT}/api/leads`);
  console.log(`📥 Bulk import: POST /api/leads/bulk`);
  console.log(`📄 CSV export: GET /api/leads/export.csv\n`);
});

// ── Embedded UI ───────────────────────────────────────────────
const UI_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Baby Commotion — CARB Lead CRM</title>
<style>
  :root {
    --bg: #0f1117; --surface: #1a1d27; --border: #2a2d3a;
    --text: #e2e8f0; --muted: #64748b; --accent: #f97316;
    --blue: #3b82f6; --green: #22c55e; --yellow: #eab308;
    --red: #ef4444; --purple: #a855f7; --teal: #14b8a6;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: var(--bg); color: var(--text); font-family: system-ui, sans-serif; font-size: 14px; }

  /* Header */
  .header { background: var(--surface); border-bottom: 1px solid var(--border); padding: 16px 24px; display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .logo { font-size: 20px; font-weight: 700; color: var(--accent); white-space: nowrap; }

  /* Scrape panel */
  .scrape-panel { background: var(--surface); border-bottom: 1px solid var(--border); padding: 0; overflow: hidden; max-height: 0; transition: max-height .3s ease, padding .3s ease; }
  .scrape-panel.open { max-height: 200px; padding: 14px 24px; }
  .scrape-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-end; }
  .scrape-field { display: flex; flex-direction: column; gap: 4px; }
  .scrape-field label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; }
  .scrape-field input, .scrape-field select { background: var(--bg); border: 1px solid var(--border); color: var(--text); border-radius: 6px; padding: 7px 12px; font-size: 13px; outline: none; }
  .scrape-field input:focus, .scrape-field select:focus { border-color: var(--accent); }
  .scrape-field input { width: 200px; }
  .scrape-status { font-size: 12px; color: var(--muted); padding: 6px 0; }
  .scrape-status.running { color: var(--yellow); }
  .scrape-status.done { color: var(--green); }
  .scrape-status.err { color: var(--red); }
  .stats { display: flex; gap: 12px; flex-wrap: wrap; margin-left: auto; }
  .stat { background: var(--bg); border: 1px solid var(--border); border-radius: 8px; padding: 6px 14px; text-align: center; min-width: 80px; }
  .stat-num { font-size: 22px; font-weight: 700; line-height: 1; }
  .stat-label { font-size: 11px; color: var(--muted); margin-top: 2px; text-transform: uppercase; letter-spacing: .05em; }
  .stat.new    .stat-num { color: var(--blue); }
  .stat.contacted .stat-num { color: var(--yellow); }
  .stat.interested .stat-num { color: var(--accent); }
  .stat.scheduled .stat-num { color: var(--teal); }
  .stat.closed .stat-num { color: var(--green); }

  /* Toolbar */
  .toolbar { padding: 12px 24px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; background: var(--surface); border-bottom: 1px solid var(--border); }
  input[type=text], select {
    background: var(--bg); border: 1px solid var(--border); color: var(--text);
    border-radius: 6px; padding: 7px 12px; font-size: 13px; outline: none;
  }
  input[type=text]:focus, select:focus { border-color: var(--accent); }
  input[type=text] { width: 240px; }
  select { cursor: pointer; }
  .btn { border: none; border-radius: 6px; padding: 7px 16px; cursor: pointer; font-size: 13px; font-weight: 600; transition: opacity .15s; }
  .btn:hover { opacity: .85; }
  .btn-primary { background: var(--accent); color: #000; }
  .btn-secondary { background: var(--border); color: var(--text); }
  .btn-danger  { background: var(--red); color: #fff; }
  .btn-export  { background: var(--green); color: #000; }
  .count-badge { margin-left: auto; color: var(--muted); font-size: 13px; }

  /* Table */
  .table-wrap { overflow-x: auto; padding: 0 24px 24px; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { background: var(--surface); color: var(--muted); font-size: 11px; text-transform: uppercase; letter-spacing: .06em; padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--border); white-space: nowrap; cursor: pointer; user-select: none; }
  th:hover { color: var(--text); }
  th .sort-icon { opacity: .4; margin-left: 4px; }
  th.sorted .sort-icon { opacity: 1; color: var(--accent); }
  td { padding: 10px 12px; border-bottom: 1px solid var(--border); vertical-align: middle; }
  tr:hover td { background: rgba(255,255,255,.025); }

  /* Status badges */
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: .04em; white-space: nowrap; }
  .badge-new         { background: rgba(59,130,246,.2);  color: #93c5fd; border: 1px solid rgba(59,130,246,.4); }
  .badge-contacted   { background: rgba(234,179,8,.2);   color: #fcd34d; border: 1px solid rgba(234,179,8,.4); }
  .badge-interested  { background: rgba(249,115,22,.2);  color: #fdba74; border: 1px solid rgba(249,115,22,.4); }
  .badge-scheduled   { background: rgba(20,184,166,.2);  color: #5eead4; border: 1px solid rgba(20,184,166,.4); }
  .badge-closed      { background: rgba(34,197,94,.2);   color: #86efac; border: 1px solid rgba(34,197,94,.4); }
  .badge-dead        { background: rgba(100,116,139,.2); color: #94a3b8; border: 1px solid rgba(100,116,139,.4); }

  /* Industry pill */
  .industry-pill { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; background: rgba(168,85,247,.15); color: #d8b4fe; border: 1px solid rgba(168,85,247,.3); }

  /* Notes inline edit */
  .notes-cell { max-width: 220px; }
  .notes-text { color: var(--muted); font-size: 12px; cursor: pointer; border-radius: 4px; padding: 2px 4px; min-height: 20px; display: block; }
  .notes-text:hover { background: var(--border); color: var(--text); }
  .notes-text.empty::before { content: '+ add note'; color: var(--border); }
  .notes-input { width: 100%; background: var(--bg); border: 1px solid var(--accent); color: var(--text); border-radius: 4px; padding: 4px 6px; font-size: 12px; resize: none; outline: none; }

  /* Links */
  a { color: var(--blue); text-decoration: none; }
  a:hover { text-decoration: underline; }

  /* Modal */
  .overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,.7); z-index: 100; align-items: center; justify-content: center; }
  .overlay.open { display: flex; }
  .modal { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; padding: 28px; width: 520px; max-width: 95vw; max-height: 90vh; overflow-y: auto; }
  .modal h2 { font-size: 18px; margin-bottom: 20px; color: var(--accent); }
  .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
  .form-group { display: flex; flex-direction: column; gap: 4px; }
  .form-group.full { grid-column: 1/-1; }
  label { font-size: 11px; color: var(--muted); text-transform: uppercase; letter-spacing: .05em; }
  .form-group input, .form-group select, .form-group textarea {
    background: var(--bg); border: 1px solid var(--border); color: var(--text);
    border-radius: 6px; padding: 8px 10px; font-size: 13px; outline: none; width: 100%;
  }
  .form-group input:focus, .form-group select:focus, .form-group textarea:focus { border-color: var(--accent); }
  .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }

  /* Toast */
  .toast { position: fixed; bottom: 24px; right: 24px; background: var(--green); color: #000; padding: 10px 20px; border-radius: 8px; font-weight: 600; font-size: 13px; z-index: 200; display: none; }
  .toast.error { background: var(--red); color: #fff; }
  .toast.show { display: block; animation: fadeIn .2s; }
  @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; } }

  .empty-state { text-align: center; padding: 60px 0; color: var(--muted); }
  .empty-state .big { font-size: 48px; margin-bottom: 12px; }
</style>
</head>
<body>

<div class="header">
  <div class="logo">🚧 Baby Commotion</div>
  <div class="stats" id="statsBar">
    <div class="stat"><div class="stat-num" id="s-total">—</div><div class="stat-label">Total</div></div>
    <div class="stat new"><div class="stat-num" id="s-new">—</div><div class="stat-label">New</div></div>
    <div class="stat contacted"><div class="stat-num" id="s-contacted">—</div><div class="stat-label">Contacted</div></div>
    <div class="stat interested"><div class="stat-num" id="s-interested">—</div><div class="stat-label">Interested</div></div>
    <div class="stat scheduled"><div class="stat-num" id="s-scheduled">—</div><div class="stat-label">Scheduled</div></div>
    <div class="stat closed"><div class="stat-num" id="s-closed">—</div><div class="stat-label">Closed</div></div>
  </div>
</div>

<!-- Scrape Panel -->
<div class="scrape-panel" id="scrapePanel">
  <div class="scrape-row">
    <div class="scrape-field">
      <label>Industry / Search Term</label>
      <input id="sq-query" placeholder="asphalt paving companies" value="asphalt paving companies">
    </div>
    <div class="scrape-field">
      <label>Location</label>
      <input id="sq-location" placeholder="Stockton CA" value="Stockton CA">
    </div>
    <div class="scrape-field">
      <label>Industry Tag</label>
      <select id="sq-industry">
        <option value="">— tag —</option>
        <option>Asphalt / Paving</option>
        <option>Concrete / Ready-Mix</option>
        <option>Excavation / Grading</option>
        <option>Underground Utilities</option>
        <option>Demolition / Hauling</option>
        <option>Tree Service</option>
        <option>Towing / Heavy Haul</option>
        <option>Trucking / Freight</option>
        <option>Utility / Electric / Water</option>
        <option>Waste Hauling</option>
      </select>
    </div>
    <div class="scrape-field">
      <label>Area</label>
      <select id="sq-area">
        <option value="">— area —</option>
        <option>Stockton / SJC</option>
        <option>Sacramento / Roseville</option>
        <option>NorCal (Both)</option>
      </select>
    </div>
    <button class="btn btn-primary" onclick="runScrape()" id="scrapeBtn">🔍 Get from Maps</button>
  </div>
  <div class="scrape-status" id="scrapeStatus"></div>
</div>

<div class="toolbar">
  <input type="text" id="search" placeholder="Search company, industry, city…" oninput="filterLeads()">
  <select id="filterIndustry" onchange="filterLeads()">
    <option value="">All Industries</option>
    <option>Asphalt / Paving</option>
    <option>Concrete / Ready-Mix</option>
    <option>Excavation / Grading</option>
    <option>Underground Utilities</option>
    <option>Demolition / Hauling</option>
    <option>Tree Service</option>
    <option>Towing / Heavy Haul</option>
    <option>Trucking / Freight</option>
    <option>Utility / Electric / Water</option>
    <option>Waste Hauling</option>
    <option>Other</option>
  </select>
  <select id="filterArea" onchange="filterLeads()">
    <option value="">All Areas</option>
    <option>Stockton / SJC</option>
    <option>Sacramento / Roseville</option>
    <option>NorCal (Both)</option>
  </select>
  <select id="filterStatus" onchange="filterLeads()">
    <option value="">All Statuses</option>
    <option value="new">New</option>
    <option value="contacted">Contacted</option>
    <option value="interested">Interested</option>
    <option value="scheduled">Scheduled</option>
    <option value="closed">Closed</option>
    <option value="dead">Dead</option>
  </select>
  <span class="count-badge" id="countBadge"></span>
  <button class="btn btn-export" onclick="exportCsv()">⬇ CSV</button>
  <button class="btn btn-secondary" onclick="toggleScrape()" id="scrapeToggle">📍 Scrape Maps</button>
  <button class="btn btn-primary" onclick="openModal()">+ Add Lead</button>
</div>

<div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th onclick="sortBy('name')">Company <span class="sort-icon">↕</span></th>
        <th onclick="sortBy('industry')">Industry <span class="sort-icon">↕</span></th>
        <th onclick="sortBy('area')">Area <span class="sort-icon">↕</span></th>
        <th>Phone</th>
        <th>Website</th>
        <th onclick="sortBy('fleetSize')">Fleet <span class="sort-icon">↕</span></th>
        <th onclick="sortBy('status')">Status <span class="sort-icon">↕</span></th>
        <th>Notes</th>
        <th></th>
      </tr>
    </thead>
    <tbody id="tbody"></tbody>
  </table>
  <div class="empty-state" id="emptyState" style="display:none">
    <div class="big">🏗</div>
    <div>No leads match your filters.</div>
  </div>
</div>

<!-- Add/Edit Modal -->
<div class="overlay" id="modal" onclick="e=>e.target===this&&closeModal()">
  <div class="modal" onclick="event.stopPropagation()">
    <h2 id="modalTitle">Add Lead</h2>
    <input type="hidden" id="editId">
    <div class="form-grid">
      <div class="form-group full"><label>Company Name *</label><input id="f-name" placeholder="Acme Paving Co."></div>
      <div class="form-group"><label>Phone</label><input id="f-phone" placeholder="(209) 555-0100"></div>
      <div class="form-group"><label>Website</label><input id="f-website" placeholder="acmepaving.com"></div>
      <div class="form-group full"><label>Address</label><input id="f-address" placeholder="123 Main St, Stockton CA 95201"></div>
      <div class="form-group"><label>City</label><input id="f-city" placeholder="Stockton"></div>
      <div class="form-group"><label>Area</label>
        <select id="f-area">
          <option value="">— select —</option>
          <option>Stockton / SJC</option>
          <option>Sacramento / Roseville</option>
          <option>NorCal (Both)</option>
        </select>
      </div>
      <div class="form-group"><label>Industry</label>
        <select id="f-industry">
          <option value="">— select —</option>
          <option>Asphalt / Paving</option>
          <option>Concrete / Ready-Mix</option>
          <option>Excavation / Grading</option>
          <option>Underground Utilities</option>
          <option>Demolition / Hauling</option>
          <option>Tree Service</option>
          <option>Towing / Heavy Haul</option>
          <option>Trucking / Freight</option>
          <option>Utility / Electric / Water</option>
          <option>Waste Hauling</option>
          <option>Other</option>
        </select>
      </div>
      <div class="form-group"><label>Fleet Size</label><input id="f-fleetSize" placeholder="80+ trucks"></div>
      <div class="form-group"><label>Status</label>
        <select id="f-status">
          <option value="new">New</option>
          <option value="contacted">Contacted</option>
          <option value="interested">Interested</option>
          <option value="scheduled">Scheduled</option>
          <option value="closed">Closed</option>
          <option value="dead">Dead</option>
        </select>
      </div>
      <div class="form-group full"><label>Notes</label><textarea id="f-notes" rows="3" placeholder="Called 3/27, spoke to Mike, has 12 trucks…"></textarea></div>
    </div>
    <div class="modal-actions">
      <button class="btn btn-secondary" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveLead()">Save Lead</button>
    </div>
  </div>
</div>

<div class="toast" id="toast"></div>

<script>
const STATUS_ORDER = ['new','contacted','interested','scheduled','closed','dead'];
let allLeads = [];
let sortCol  = 'name';
let sortAsc  = true;

async function load() {
  const r = await fetch('/api/leads');
  allLeads = await r.json();
  render(allLeads);
  loadStats();
}

async function loadStats() {
  const s = await fetch('/api/leads/stats').then(r=>r.json());
  document.getElementById('s-total').textContent     = s.total;
  document.getElementById('s-new').textContent       = s.byStatus.new        || 0;
  document.getElementById('s-contacted').textContent = s.byStatus.contacted   || 0;
  document.getElementById('s-interested').textContent= s.byStatus.interested  || 0;
  document.getElementById('s-scheduled').textContent = s.byStatus.scheduled   || 0;
  document.getElementById('s-closed').textContent    = s.byStatus.closed      || 0;
}

function filterLeads() {
  const search   = document.getElementById('search').value.toLowerCase();
  const industry = document.getElementById('filterIndustry').value;
  const area     = document.getElementById('filterArea').value;
  const status   = document.getElementById('filterStatus').value;
  const filtered = allLeads.filter(l => {
    if (status   && l.status   !== status)   return false;
    if (industry && l.industry !== industry) return false;
    if (area     && l.area     !== area)     return false;
    if (search) {
      const hay = [l.name,l.industry,l.area,l.phone,l.website,l.city,l.notes].join(' ').toLowerCase();
      if (!hay.includes(search)) return false;
    }
    return true;
  });
  render(filtered);
}

function sortBy(col) {
  if (sortCol === col) sortAsc = !sortAsc;
  else { sortCol = col; sortAsc = true; }
  document.querySelectorAll('th').forEach(th => th.classList.remove('sorted'));
  event.currentTarget.classList.add('sorted');
  filterLeads();
}

function render(leads) {
  const sorted = [...leads].sort((a,b) => {
    let va = a[sortCol] || '', vb = b[sortCol] || '';
    if (sortCol === 'status') { va = STATUS_ORDER.indexOf(va); vb = STATUS_ORDER.indexOf(vb); }
    return sortAsc ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
  });

  document.getElementById('countBadge').textContent = \`\${sorted.length} lead\${sorted.length!==1?'s':''}\`;
  document.getElementById('emptyState').style.display = sorted.length ? 'none' : 'block';

  const tbody = document.getElementById('tbody');
  tbody.innerHTML = sorted.map(l => \`
    <tr id="row-\${l.id}">
      <td><strong>\${esc(l.name)}</strong>\${l.address ? '<br><small style="color:var(--muted)">' + esc(l.city || l.address.split(',')[1]||'') + '</small>' : ''}</td>
      <td>\${l.industry ? '<span class="industry-pill">' + esc(l.industry) + '</span>' : ''}</td>
      <td style="color:var(--muted);font-size:12px">\${esc(l.area)}</td>
      <td>\${l.phone ? '<a href="tel:'+esc(l.phone)+'">'+esc(l.phone)+'</a>' : '<span style="color:var(--border)">—</span>'}</td>
      <td>\${l.website ? '<a href="https://'+l.website.replace(/^https?:\\/\\//,'')+'" target="_blank" rel="noopener">'+esc(shortUrl(l.website))+'</a>' : ''}</td>
      <td style="color:var(--muted);font-size:12px">\${esc(l.fleetSize)}</td>
      <td><span class="badge badge-\${l.status}" onclick="cycleStatus(\${l.id}, '\${l.status}')">\${l.status}</span></td>
      <td class="notes-cell">
        <span class="notes-text \${l.notes?'':'empty'}" onclick="editNote(\${l.id}, this)">\${esc(l.notes)}</span>
      </td>
      <td>
        <button class="btn btn-secondary" style="padding:4px 10px;font-size:11px" onclick="openEdit(\${l.id})">Edit</button>
        <button class="btn btn-danger"    style="padding:4px 10px;font-size:11px;margin-left:4px" onclick="deleteLead(\${l.id})">✕</button>
      </td>
    </tr>
  \`).join('');
}

function esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function shortUrl(u) { return u.replace(/^https?:\\/\\/(www\\.)?/,'').replace(/\\/$/, '').slice(0,28); }

async function cycleStatus(id, current) {
  const next = STATUS_ORDER[(STATUS_ORDER.indexOf(current)+1) % STATUS_ORDER.length];
  const r = await fetch('/api/leads/'+id, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({status:next}) });
  if (r.ok) { const l = await r.json(); allLeads = allLeads.map(x=>x.id===id?l:x); filterLeads(); loadStats(); toast('Status → '+next); }
}

function editNote(id, span) {
  const old = allLeads.find(l=>l.id===id)?.notes || '';
  const ta = document.createElement('textarea');
  ta.className = 'notes-input';
  ta.value = old;
  ta.rows = 2;
  span.replaceWith(ta);
  ta.focus();
  const save = async () => {
    const val = ta.value.trim();
    const r = await fetch('/api/leads/'+id, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify({notes:val}) });
    if (r.ok) { const l = await r.json(); allLeads = allLeads.map(x=>x.id===id?l:x); filterLeads(); }
  };
  ta.addEventListener('blur', save);
  ta.addEventListener('keydown', e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); ta.blur(); } if (e.key==='Escape') { ta.value=old; ta.blur(); } });
}

function openModal() {
  document.getElementById('modalTitle').textContent = 'Add Lead';
  document.getElementById('editId').value = '';
  ['name','phone','website','address','city','fleetSize','notes'].forEach(f => document.getElementById('f-'+f).value='');
  document.getElementById('f-area').value='';
  document.getElementById('f-industry').value='';
  document.getElementById('f-status').value='new';
  document.getElementById('modal').classList.add('open');
  document.getElementById('f-name').focus();
}

function openEdit(id) {
  const l = allLeads.find(x=>x.id===id);
  if (!l) return;
  document.getElementById('modalTitle').textContent = 'Edit Lead';
  document.getElementById('editId').value = id;
  ['name','phone','website','address','city','area','industry','fleetSize','status','notes'].forEach(f => {
    const el = document.getElementById('f-'+f);
    if (el) el.value = l[f] || '';
  });
  document.getElementById('modal').classList.add('open');
}

function closeModal() { document.getElementById('modal').classList.remove('open'); }

async function saveLead() {
  const id = document.getElementById('editId').value;
  const body = {
    name:      document.getElementById('f-name').value.trim(),
    phone:     document.getElementById('f-phone').value.trim(),
    website:   document.getElementById('f-website').value.trim(),
    address:   document.getElementById('f-address').value.trim(),
    city:      document.getElementById('f-city').value.trim(),
    area:      document.getElementById('f-area').value,
    industry:  document.getElementById('f-industry').value,
    fleetSize: document.getElementById('f-fleetSize').value.trim(),
    status:    document.getElementById('f-status').value,
    notes:     document.getElementById('f-notes').value.trim(),
    source:    'manual',
  };
  if (!body.name) return toast('Company name required', true);

  if (id) {
    const r = await fetch('/api/leads/'+id, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    if (r.ok) { const l = await r.json(); allLeads = allLeads.map(x=>x.id===Number(id)?l:x); }
  } else {
    const r = await fetch('/api/leads', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    if (r.ok) { const {lead,created} = await r.json(); if (created) allLeads.push(lead); else allLeads = allLeads.map(x=>x.id===lead.id?lead:x); toast(created?'Lead added (new)':'Lead updated (dedup)'); }
  }
  closeModal(); filterLeads(); loadStats();
}

async function deleteLead(id) {
  if (!confirm('Delete this lead?')) return;
  const r = await fetch('/api/leads/'+id, { method:'DELETE' });
  if (r.ok) { allLeads = allLeads.filter(l=>l.id!==id); filterLeads(); loadStats(); toast('Deleted'); }
}

function exportCsv() { window.location = '/api/leads/export.csv'; }

function toast(msg, err=false) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast' + (err?' error':'') + ' show';
  setTimeout(() => el.classList.remove('show'), 2800);
}

document.getElementById('modal').addEventListener('click', e => { if(e.target===document.getElementById('modal')) closeModal(); });
document.addEventListener('keydown', e => { if(e.key==='Escape') closeModal(); });

function toggleScrape() {
  const panel = document.getElementById('scrapePanel');
  panel.classList.toggle('open');
  document.getElementById('scrapeToggle').textContent = panel.classList.contains('open') ? '✕ Close' : '📍 Scrape Maps';
}

async function runScrape() {
  const query    = document.getElementById('sq-query').value.trim();
  const location = document.getElementById('sq-location').value.trim();
  const industry = document.getElementById('sq-industry').value;
  const area     = document.getElementById('sq-area').value;
  if (!query || !location) return toast('Enter a search term and location', true);

  const status = document.getElementById('scrapeStatus');
  const btn    = document.getElementById('scrapeBtn');
  status.className = 'scrape-status running';
  status.textContent = \`Searching Google Maps for "\${query}" in \${location}…\`;
  btn.disabled = true;
  btn.textContent = '⏳ Scraping…';

  try {
    const r = await fetch('/api/scrape', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, location, industry, area }),
    });
    const d = await r.json();
    if (!r.ok) throw new Error(d.error || 'Scrape failed');
    status.className = 'scrape-status done';
    status.textContent = \`✅ Found \${d.found} on Maps → \${d.created} new, \${d.updated} updated, \${d.skipped} skipped\`;
    await load();
    toast(\`\${d.created} new leads added!\`);
  } catch (err) {
    status.className = 'scrape-status err';
    status.textContent = \`❌ \${err.message}\`;
    toast(err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = '🔍 Get from Maps';
  }
}

load();
</script>
</body>
</html>`;
