# Cloudflare Workers (site servers)

Each site gets its own Worker + its own KV namespace. No shared `HTML_STORE`,
no cross-domain robots/sitemap, no canonical bleed. Sources of truth:

- `workers/_shared/site-handler.ts` — the fetch handler every site calls.
- `workers/<name>/wrangler.toml` — per-site bindings.
- `workers/<name>/src/index.ts` — thin wrapper binding the handler to the site's
  domain and KV namespace.
- `workers/migrations/0001_leads.sql` — D1 schema for `norcal-carb-leads`.

## What each Worker does

1. `/robots.txt` → self-referential. AI crawlers (GPTBot, ClaudeBot, Perplexity,
   Google-Extended, etc.) are explicitly **Allowed**; the Cloudflare
   Managed-Content block is not applied here.
2. `/sitemap.xml` → self-referential `<loc>`.
3. `/api/book` → writes lead to D1 `norcal-carb-leads.leads`, archives raw
   payload to R2 `form-submissions`. Both guarded on bindings existing.
4. Everything else → served from that site's isolated KV namespace.

## Ship order (the critical items)

1. **T1 — Stockton KV collision (DONE in this branch).** `stockton-carb-worker`
   is now bound to `STOCKTON_HTML_STORE` (id `ed51efc25c9c442bbb984a8fce905ee5`).
   Deploys automatically on push once `CLOUDFLARE_API_TOKEN` +
   `CLOUDFLARE_ACCOUNT_ID` secrets are set.
2. **T2 — Self-canonical robots/sitemap** for Fairfield, San Diego
   (mobilecarbsmoketest), Tracy (mobilecarbtest), Roseville, Hayward. Worker
   source is ready; each `wrangler.toml` still has a placeholder KV id —
   see "Before deploying the non-Stockton Workers" below.
3. **T3 — D1 schema.** Apply once:
   ```
   wrangler d1 execute norcal-carb-leads \
     --remote --file=workers/migrations/0001_leads.sql
   ```
4. **T4 — R2 bucket.** Already bound in every `wrangler.toml`. Confirm the
   bucket exists:
   ```
   wrangler r2 bucket create form-submissions   # one time
   ```

## Before deploying the non-Stockton Workers

Each non-Stockton `wrangler.toml` has `id = "REPLACE_WITH_<SITE>_KV_ID"`. This
is deliberate — we don't know (and must not re-use) the existing IDs. For each
site, decide:

- **If a per-site KV already exists in the dashboard:** paste its id into the
  `[[kv_namespaces]]` block.
- **If the site currently binds to `HTML_STORE` (the shared one):** create a
  new isolated namespace, copy the old HTML into it, then bind the new id:
  ```
  wrangler kv namespace create FAIRFIELD_HTML_STORE
  # returns: { binding = "FAIRFIELD_HTML_STORE", id = "..." }
  # copy HTML keys out of old HTML_STORE into the new namespace, then update wrangler.toml
  ```

The deploy workflow auto-skips any Worker whose `wrangler.toml` still contains
`REPLACE_WITH_`, so you won't accidentally ship a broken binding.

## Secrets required in GitHub

Repo Settings → Secrets and variables → Actions → New repository secret:

- `CLOUDFLARE_API_TOKEN` — the API token you created (must have
  `Workers Scripts: Edit`, `Workers KV Storage: Edit`, `Workers R2 Storage: Edit`,
  `D1: Edit`, `Account: Read`).
- `CLOUDFLARE_ACCOUNT_ID` — from the Cloudflare dashboard sidebar.

If your existing secret is named something other than `CLOUDFLARE_API_TOKEN`
(e.g. just `CLOUDFLARE_TOKEN`), either rename the secret or edit
`.github/workflows/deploy-workers.yml` to reference the name you used.

## Local deploy (if you don't want CI)

```
cd workers/stockton-carb-worker
npx wrangler deploy
```

You'll be prompted to `wrangler login` the first time.

## Verification

```
# Stockton isolation (the regression that started this)
curl -s https://carbteststockton.com/robots.txt  | grep -c 'carbteststockton.com/sitemap.xml'   # 1
curl -s https://carbteststockton.com/robots.txt  | grep -c 'carb-clean-truck-check'             # 0
curl -s https://carbteststockton.com/sitemap.xml | grep -c '<loc>https://carbteststockton.com/</loc>'  # 1

# Same three checks for every other domain (substitute the domain)

# AI crawlers allowed
curl -s https://carbteststockton.com/robots.txt | grep -E '^(User-agent: (GPTBot|ClaudeBot|PerplexityBot))'

# D1 populated after a test booking
wrangler d1 execute norcal-carb-leads --remote \
  --command "SELECT source_domain, COUNT(*) FROM leads GROUP BY source_domain"
```
