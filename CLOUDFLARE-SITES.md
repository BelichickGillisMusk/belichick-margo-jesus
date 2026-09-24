# Cloudflare Sites — NorCal CARB Mobile

All production-facing sites are deployed to Cloudflare Workers/Pages. The canonical source of truth for site configuration is [`sites-config.json`](sites-config.json) — prices, phone numbers, coverage areas, and Cloudflare Worker IDs all live there.

**Company:** NorCal CARB Mobile LLC — CARB Tester ID `IF530523` (expires Jun 2027)

---

## CARB Test Sites

Each site is a Cloudflare Worker serving a city/region-specific landing page. HTML source lives in `cloudflare/sites/<nickname>/` or is generated from the worker template.

| Domain | Nickname | Worker ID | Phone | OBD | OVI |
|--------|----------|-----------|-------|-----|-----|
| [cleantruckcheckhayward.com](https://cleantruckcheckhayward.com) | Hayward / East Bay | `cleantruckcheckhayward` | 415-900-8563 | $85 | $179 |
| [carb-clean-truck-check.com](https://carb-clean-truck-check.com) | Bay Area (San Jose–Novato) | `carb-clean-truck-check` | 415-900-8563 | $79 | $219 |
| [cleantruckcheckfairfield.com](https://cleantruckcheckfairfield.com) | Fairfield / North Bay | `cleantruckcheck-fairfield` | 916-890-4427 | $79 | $209 |
| [cleantruckcheckroseville.com](https://cleantruckcheckroseville.com) | Roseville / Sacramento | `cleantruckcheck-roseville` | 916-890-4427 | $79 | $209 |
| [cleantruckchecklodi.com](https://cleantruckchecklodi.com) | Lodi | `NEW` | 209-818-1371 | $75 | $209 |
| [carbteststockton.com](https://carbteststockton.com) | Stockton / San Joaquin Valley | `stockton-carb-worker` | 209-818-1371 | $69 | $179 |
| [mobilecarbtest.com](https://mobilecarbtest.com) | Tracy / Tri-Valley | `mobilecarbtest` | — | TBD | TBD |
| [mobileovitest.com](https://mobileovitest.com) | Statewide CA (OVI only) | `mobileovitest` | 916-890-4427 | $95 | $195 |
| [mobilecarbsmoketest.com](https://mobilecarbsmoketest.com) | San Diego | `mobilecarbsmoketest` | 619-786-4328 | $119 | $219 |

**Fleet pricing** (≥5 vehicles, most markets): OBD ~$49–75 / OVI ~$149–199. See `sites-config.json` for per-site fleet rates.

### Site architecture

Each site is a Cloudflare Worker (`cloudflare/worker/src/`) that:
- Serves market-specific HTML with Schema.org JSON-LD (LocalBusiness + Service)
- Pulls prices, phone, and coverage from `sites-config.json` at deploy time
- Enforces a canonical link to `cleantruckcheckvin.app`
- Blocks `norcalcarbmobile.com` from appearing in footer links

Worker config: `cloudflare/worker/wrangler.toml`. Each site gets its own Worker binding.

### Deploying a site

```bash
cd cloudflare/worker
# Deploy all sites
npx wrangler deploy

# Deploy one site
npx wrangler deploy --name cleantruckcheckhayward
```

CI guard: `scripts/ensure-kv.js` validates that every domain in `sites-config.json` has a matching Worker entry before deploy.

---

## CARB Sites Audit Tool

`npm run audit` is a local static-analysis tool ("Our SEMrush") that scores all CARB site HTML files across seven categories:

| Category | What it checks |
|----------|---------------|
| **SEO** | `<title>`, meta description, Open Graph tags, canonical |
| **Schema** | JSON-LD LocalBusiness completeness, valid JSON, required fields |
| **Performance** | File size, font preconnect, no render-blocking JS |
| **Accessibility** | Contrast ratios, semantic HTML, ARIA landmarks |
| **Mobile** | Viewport meta, responsive layout hints |
| **Content** | Required elements present, blacklisted domains absent |
| **Pricing** | Prices in HTML match `sites-config.json` values |

Scoring: 0–100 per category. Site passes if overall ≥ 80.

```bash
# Audit all sites
npm run audit

# Audit one site (by domain or id)
npm run audit -- --site=cleantruckcheckhayward

# Verbose: show every issue per site
npm run audit:verbose

# Save JSON report to reports/audit-YYYY-MM-DD.json
npm run audit:json
```

Exit code is `0` when all sites score ≥ 50, `1` when any site is critically failing. Run `npm run audit:verbose` to see per-site issue details.

The tool reads live HTML from the `cloudflare/sites/<nickname>/index.html` files. It does not make network requests — all checks are static analysis.

---

## Additional Sites

| Domain | Purpose | Status |
|--------|---------|--------|
| [silverbackai.agency](https://silverbackai.agency) | AI automation agency landing page | Cloudflare Pages, live |
| [boardroom.bryanoneillgillis.com](https://boardroom.bryanoneillgillis.com) | Internal multi-agent office UI | Cloudflare Pages, private (Cloudflare Access) |

### Boardroom

The Boardroom is the internal browser-based command UI for dispatching agent plans. Source: `cloudflare/sites/boardroom/index.html`. Full operational guide: [`cloudflare/sites/boardroom/BOARDROOM.md`](cloudflare/sites/boardroom/BOARDROOM.md) (added in PR #64).

- Private via Cloudflare Access / Zero Trust — team members only
- Pure Cloudflare — **not Vercel**
- Features: Task Dashboard, file attachments, solo mode, Solid Agents panel (Mila / Sloane / Elon), Communication Webapp (SMS / GChat / Slack via Hermes)
