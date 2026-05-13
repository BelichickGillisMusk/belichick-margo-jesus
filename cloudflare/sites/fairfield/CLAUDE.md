# Fairfield - Canonical Site Folder

**Domain:** cleantruckcheckfairfield.com
**Phone:** (916) 890-4427
**Team palette:** Air Force Academy (light background)

## Rules for any agent reading this

1. **This is the ONLY folder for Fairfield.** If Bryan says "fix Fairfield," every change goes in this folder. No other path in the repo represents Fairfield.
2. **Do not hand-edit `index.html`.** It is generated from `/sites-config.json` by `scripts/generate-city-sites.js`. CI (`npm run sites:check`) regenerates it and fails the PR if anything drifted.
3. **To change a color, phone, price, or copy:** edit `/sites-config.json` (and `scripts/generate-city-sites.js` only if structure changes), then run `npm run sites:generate`. Commit both files.
4. **Deploy target:** Cloudflare Pages, pointed at `cloudflare/sites/fairfield/`. The folder is a complete Pages project (index.html, 404.html, _headers, _redirects, robots.txt, sitemap.xml).
5. **Operator:** Bryan Gillis - NorCal CARB Mobile LLC. Every site footer carries that line.

## Files

| File | Purpose | Source |
|------|---------|--------|
| `index.html` | The site | Generated |
| `404.html` | Missing-page redirect | Generated |
| `_headers` | Pages security headers | Generated |
| `_redirects` | URL aliases | Generated |
| `robots.txt` | Crawler permissions | Generated |
| `sitemap.xml` | Search engine sitemap | Generated |
| `CLAUDE.md` | This file - operator + agent rules | Hand-edited (instructions only) |
