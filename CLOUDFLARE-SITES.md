# CLOUDFLARE SITES — Master Tracking

**Account:** Norcal (`de5e37ebaff3f517602e28a6515549ec`)
**Deploys from:** GitHub repo `BelichickGillisMusk/belichick-margo-jesus`
**Last updated:** 2026-03-22

---

## All Sites

| # | Domain | Cloudflare Project | Theme | Primary | Secondary | Mode | Repo Directory | Status |
|---|--------|-------------------|-------|---------|-----------|------|---------------|--------|
| 1 | `carb-clean-truck-check.com` | `carb-clean-truck-check` | SF Giants | `#FD5A1E` Orange | `#1A1815` Black | Dark | `carb-clean-truck-check/` | Live |
| 2 | `cleantruckcheckroseville.com` | `cleantruckcheckroseville` | SF Giants (paired) | `#FD5A1E` Orange | `#1A1815` Black | Dark | `cleantruckcheckroseville/` | NEEDS FIX — wrong orange, placeholder phone |
| 3 | `mobilecarbsmoketest.com` | `mobilecarbsmoketest` | Padres | `#2F241D` Brown | `#FFC425` Gold | Dark | `mobilecarbsmoketest/` | Live |
| 4 | `mobilecarbtest.com` | `mobilecarbtest` | John Deere | `#367C2B` Green | `#FFDE00` Yellow | White | `mobilecarbtest/` | Live |
| 5 | `carbteststockton.com` | `carbteststockton` | Stockton Heat | `#C8102E` Red | `#F1BE48` Gold | White | `carbteststockton/` | Live |
| 6 | `cleantruckcheckfairfield.com` | `cleantruckcheckfairfield` | Travis AFB | `#002868` Navy | `#D4AF37` Gold | White | `cleantruckcheckfairfield/` | NEEDS FIX — wrong code |
| 7 | `cleantruckchechlodi.com` | `cleantruckchechlodi` | Wine Country | `#722F37` Burgundy | `#F5E6C8` Cream | White | `cleantruckchechlodi/` | Live |
| 8 | `cleantruckcheckhayward.com` | `cleantruckcheckhayward` | Warriors | `#006BB6` Blue | `#FFC72C` Gold | White | `cleantruckcheckhayward/` | NEEDS FIX — old green/blue code |

---

## Sites Needing Work (this session)

| Site | Problem | Fix |
|------|---------|-----|
| `cleantruckcheckhayward.com` | Old code, wrong colors (green/blue) | Rebuild with correct template + Warriors Blue/Gold |
| `cleantruckcheckfairfield.com` | Wrong code | Rebuild with correct template + Travis AFB Navy/Gold |
| `cleantruckcheckroseville.com` | Wrong orange hex, placeholder phone (555-1234) | Fix colors to #FD5A1E, fix phone to (916) 890-4427 |

---

## Color Reference

### Dark Mode Sites
| Site | Background | Primary | Secondary | Text |
|------|-----------|---------|-----------|------|
| carb-clean-truck-check | `#1A1815` | `#FD5A1E` Orange | `#1A1815` Black | Light |
| cleantruckcheckroseville | `#1A1815` | `#FD5A1E` Orange | `#1A1815` Black | Light |
| mobilecarbsmoketest | Dark | `#2F241D` Brown | `#FFC425` Gold | Light |

### White/Light Mode Sites
| Site | Background | Primary | Secondary | Text |
|------|-----------|---------|-----------|------|
| mobilecarbtest | White | `#367C2B` Green | `#FFDE00` Yellow | Dark |
| carbteststockton | White | `#C8102E` Red | `#F1BE48` Gold | Dark |
| cleantruckcheckfairfield | White | `#002868` Navy | `#D4AF37` Gold | Dark |
| cleantruckchechlodi | White | `#722F37` Burgundy | `#F5E6C8` Cream | Dark |
| cleantruckcheckhayward | White | `#006BB6` Blue | `#FFC72C` Gold | Dark |

---

## Deployment

All sites auto-deploy from this GitHub repo via Cloudflare Pages/Workers.
- Push to branch → Cloudflare builds → site updates
- Each site has its own directory in the repo root
- Each directory contains: `index.html`, `404.html`, `_headers`, `_redirects`, `robots.txt`, `sitemap.xml`

### Workers + KV (fast multi-site publishing)

If you want to ship lots of city sites quickly, use the single reusable Worker at `cloudflare/worker/` and store the site HTML in KV.

- Worker code: `/` → `index.html` from KV, serves a default `404.html` from KV, generates `robots.txt` + `sitemap.xml`, and supports `/api/book` redirect.
- Wrangler config: `cloudflare/worker/wrangler.toml` has one `[env.<site>]` per domain.

**One-time setup**
- Install Wrangler: `npm i -g wrangler`
- Authenticate: `wrangler login`
- Ensure each domain is in the same Cloudflare account and the KV namespace IDs in `cloudflare/worker/wrangler.toml` are correct (replace `REPLACE_ME`).

**Sync KV + deploy**
- One site: `node cloudflare/worker/scripts/deploy.mjs hayward`
- All sites in `cloudflare/sites/*`: `node cloudflare/worker/scripts/deploy.mjs all`

**GitHub “deploy agent”**
- Set repo secret `CLOUDFLARE_API_TOKEN` and pushes to `main` touching `cloudflare/**` auto-run `.github/workflows/cloudflare-worker-deploy.yml`.

**KV contents**
- `index.html` is loaded from `cloudflare/sites/<site>/index.html`
- `404.html` is loaded from `cloudflare/worker/assets/404.html`

---

## Phone / Contact

| Site | Phone | Email |
|------|-------|-------|
| All sites | (916) 890-4427 | info@{domain} |

---

## Additional Sites (not CARB testing)

| Domain | Purpose | Status |
|--------|---------|--------|
| `silverbackai.agency` | Client portal — SilverbackAI Agency | Planned |
