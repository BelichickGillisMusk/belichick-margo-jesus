# CLOUDFLARE SITES — Master Tracking

**Account:** Norcal (`de5e37ebaff3f517602e28a6515549ec`)
**Deploys from:** GitHub repo `BelichickGillisMusk/belichick-margo-jesus`
**Last updated:** 2026-05-12

> **Source of truth: [`sites-config.json`](./sites-config.json)**.
> HTML under `cloudflare/sites/<city>/` is **generated** by `scripts/generate-city-sites.js`. Direct edits are rejected by CI (`npm run sites:check` regenerates and diff-fails). To change a color, phone, or pricing, edit `sites-config.json`, run `npm run sites:generate`, and commit both files together.

---

## All Sites

| # | Domain | Cloudflare Project | Theme | Brand Color | Mode | Repo Path | Status |
|---|--------|-------------------|-------|-------------|------|-----------|--------|
| 1 | `cleantruckcheckhayward.com` | `cleantruckcheckhayward` | Raiders | `#A5ACAF` Silver on `#000000` Black | Dark | `cloudflare/sites/hayward/` | Live (generated) |
| 2 | `cleantruckcheckroseville.com` | `cleantruckcheckroseville` | SF Giants | `#FD5A1E` Orange on `#1A1815` Black | Dark | `cloudflare/sites/roseville/` | Live (generated) |
| 3 | `cleantruckcheckfairfield.com` | `cleantruckcheckfairfield` | Air Force Academy | `#003087` Blue on light bg | Light | `cloudflare/sites/fairfield/` | Live (generated) |
| 4 | `cleantruckchecklodi.com` | TBD | Florida State | `#782F40` Garnet on light bg | Light | `cloudflare/sites/lodi/` | Live (generated) |
| 5 | `carbteststockton.com` | `stockton-carb-worker` | Stockton Heat | `#CE1126` Red / `#FFC72C` Gold | Dark | _Pending generator support_ | Out of generator scope |
| 6 | `carb-clean-truck-check.com` | `carb-clean-truck-check` | SF Giants | `#FD5A1E` Orange | Dark | _Pending generator support_ | Out of generator scope |
| 7 | `mobilecarbsmoketest.com` | `mobilecarbsmoketest` | Padres | `#FFC425` Gold | Dark | _Pending generator support_ | Out of generator scope |
| 8 | `mobilecarbtest.com` | `mobilecarbtest` | 49ers (Tri-Valley) | `#AA0000` Red | Dark | _Pending generator support_ | Out of generator scope |

> Cities listed as "out of generator scope" still ship from Cloudflare KV — they were not migrated into `cloudflare/sites/` in this pass. When you're ready to onboard them, add the slug to `cityMap` + `cityCopy` in `scripts/generate-city-sites.js`, then rerun the generator.

---

## How a city goes live

1. Edit `sites-config.json` (colors, phone, pricing, coverage, etc.).
2. `npm run sites:generate` → rebuilds every `cloudflare/sites/<city>/index.html`.
3. Commit `sites-config.json` and the regenerated HTML together.
4. CI (`npm run sites:check`) re-runs the generator on every PR and fails if anything drifted.
5. Cloudflare Workers/Pages auto-deploy from main.

---

## Phone / Contact

Per-city phone lives in `sites-config.json`. Current values:

| Site | Phone | Email |
|------|-------|-------|
| Hayward | (415) 900-8563 | admin@cleantruckcheckhayward.com |
| Roseville | (916) 890-4427 | admin@cleantruckcheckroseville.com |
| Fairfield | (916) 890-4427 | admin@cleantruckcheckfairfield.com |
| Lodi | (209) 818-1371 | admin@cleantruckchecklodi.com |

---

## Additional Sites (not CARB testing)

| Domain | Purpose | Status |
|--------|---------|--------|
| `silverbackai.agency` | Client portal — SilverbackAI Agency | Planned |
