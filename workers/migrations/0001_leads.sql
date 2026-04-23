-- T3: D1 `norcal-carb-leads` schema. The database was created 2026-03-15
-- but had zero tables, so every /api/book submission was only landing in KV
-- with a 30-day TTL. Apply this migration before the site Workers start
-- writing to LEADS_DB:
--
--   wrangler d1 execute norcal-carb-leads \
--     --file=workers/migrations/0001_leads.sql --remote
--
-- `remote` is required; the production D1 is not the same as local.

CREATE TABLE IF NOT EXISTS leads (
  id             TEXT PRIMARY KEY,
  source_domain  TEXT NOT NULL,
  company_name   TEXT,
  contact_name   TEXT,
  phone          TEXT,
  email          TEXT,
  vin            TEXT,
  test_type      TEXT,
  vehicle_count  INTEGER,
  submitted_at   TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'new',
  notes          TEXT
);

CREATE INDEX IF NOT EXISTS idx_leads_submitted_at ON leads(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_source_domain ON leads(source_domain);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
