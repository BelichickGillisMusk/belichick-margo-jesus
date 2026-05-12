// Single source of truth: sites-config.json drives every city landing page.
// Run with `npm run sites:generate` to rebuild every cloudflare/sites/<city>/index.html.
//
// Source template: cloudflare/sites/roseville/index.html (post-purge dark design,
// SF Giants Orange + Black). Other cities are derived by swapping design tokens,
// phone numbers, city/coverage strings, and (for light-bg cities) inverting the
// neutral palette. Anything not listed below comes through unchanged from the
// template.

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const config = JSON.parse(readFileSync(join(root, 'sites-config.json'), 'utf-8'));
const templatePath = join(root, 'cloudflare/sites/roseville/index.html');
const template = readFileSync(templatePath, 'utf-8');

// Cities we generate `cloudflare/sites/<slug>/index.html` for and the
// sites-config.json id they map to. Roseville is rewritten from itself so
// every output is provably produced by this script.
const cityMap = {
  hayward: 'cleantruckcheckhayward',
  roseville: 'cleantruckcheckroseville',
  fairfield: 'cleantruckcheckfairfield',
  lodi: 'cleantruckchecklodi',
};

const cityCopy = {
  hayward: {
    displayCity: 'Hayward',
    headlineRegion: 'Hayward, the East Bay, and Alameda County',
    footerRegion: 'the greater Hayward and East Bay area',
    coverageLine: 'Serving Hayward, Union City, Fremont, Castro Valley, San Leandro, Alameda, Pleasanton, and Livermore',
    postal: '94541',
    metaDescription: 'CARB credentialed Clean Truck Check testing in Hayward, CA. Mobile heavy-duty emissions compliance testing, OBD scans, smoke opacity tests. Serving Hayward, Fremont, Union City, and the East Bay.',
    metaKeywords: 'Clean Truck Check, CARB, HD I/M, emissions testing, Hayward CA, heavy duty truck inspection, OBD test, smoke opacity, credentialed tester, East Bay, Alameda County',
  },
  roseville: {
    displayCity: 'Roseville',
    headlineRegion: 'Roseville, Sacramento, and the greater Placer County area',
    footerRegion: 'the greater Roseville and Sacramento area',
    coverageLine: 'Serving Roseville, Sacramento, Rocklin, Lincoln, Auburn, and all of Placer & Sacramento Counties',
    postal: '95661',
    metaDescription: 'CARB credentialed Clean Truck Check testing in Roseville, CA. Mobile heavy-duty emissions compliance testing, OBD scans, smoke opacity tests. Serving Sacramento, Placer, and surrounding counties.',
    metaKeywords: 'Clean Truck Check, CARB, HD I/M, emissions testing, Roseville CA, heavy duty truck inspection, OBD test, smoke opacity, credentialed tester, Sacramento, Placer County',
  },
  fairfield: {
    displayCity: 'Fairfield',
    headlineRegion: 'Fairfield, the North Bay, and Solano County',
    footerRegion: 'the greater Fairfield and Solano County area',
    coverageLine: 'Serving Fairfield, Vacaville, Vallejo, Napa, Dixon, Davis, Woodland, and Suisun City',
    postal: '94533',
    metaDescription: 'CARB credentialed Clean Truck Check testing in Fairfield, CA. Mobile heavy-duty emissions compliance testing, OBD scans, smoke opacity tests. Serving Vacaville, Vallejo, Napa, and the North Bay.',
    metaKeywords: 'Clean Truck Check, CARB, HD I/M, emissions testing, Fairfield CA, heavy duty truck inspection, OBD test, smoke opacity, credentialed tester, North Bay, Solano County',
  },
  lodi: {
    displayCity: 'Lodi',
    headlineRegion: 'Lodi, Galt, and San Joaquin County',
    footerRegion: 'the greater Lodi and San Joaquin County area',
    coverageLine: 'Serving Lodi, Woodbridge, Acampo, Galt, Lockeford, Stockton, and Tracy',
    postal: '95240',
    metaDescription: 'CARB credentialed Clean Truck Check testing in Lodi, CA. Mobile heavy-duty emissions compliance testing, OBD scans, smoke opacity tests. Serving Lodi, Galt, Stockton, and San Joaquin County.',
    metaKeywords: 'Clean Truck Check, CARB, HD I/M, emissions testing, Lodi CA, heavy duty truck inspection, OBD test, smoke opacity, credentialed tester, San Joaquin County, Central Valley',
  },
};

// Pricing is per-city per sites-config.json. The template's hard-coded $150/$120/$99
// are replaced with each city's obdPrice, fleetOBD, and the cheaper of fleetOBD-10/fleetOBD.
function pricing(site) {
  return {
    single: `$${site.obdPrice}`,
    fleet: `$${site.fleetOBD}`,
    annual: `$${Math.max(site.fleetOBD - 10, site.fleetOBD)}`,
  };
}

function hexToRgb(hex) {
  const v = hex.replace('#', '');
  return {
    r: parseInt(v.slice(0, 2), 16),
    g: parseInt(v.slice(2, 4), 16),
    b: parseInt(v.slice(4, 6), 16),
  };
}

function darken(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c * (1 - amt)))).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}

function lighten(hex, amt) {
  const { r, g, b } = hexToRgb(hex);
  const f = (c) => Math.max(0, Math.min(255, Math.round(c + (255 - c) * amt))).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}

function rgba(hex, a) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// Build the :root CSS block from a city's color spec. The template uses
// --black* (background neutrals) and --orange* (accent). We keep those variable
// names so the rest of the CSS doesn't need changes — only their values move.
function rootBlock({ colors }) {
  // Brand highlight color: on dark backgrounds the spreadsheet's `accent` is
  // the iconic team color (Raiders silver, Giants orange). On light backgrounds
  // the iconic color is in `primary` (Air Force Academy blue, Florida State
  // garnet) — the silver/gold listed as `accent` is a supporting tone there.
  const bgMode = colors.bgMode || 'dark';
  const isLight = bgMode === 'light';
  const accent = isLight ? colors.primary : colors.accent;
  const base = isLight
    ? {
        bg: colors.bg && colors.bg !== '#FFFFFF' ? colors.bg : '#f7f7f5',
        bgLight: '#ffffff',
        card: '#ffffff',
        border: '#e5e2dd',
        text: colors.primary || '#1a1a1a',
        textMuted: '#525252',
        textDim: '#737373',
      }
    : {
        bg: colors.bg && colors.bg !== '#FFFFFF' ? colors.bg : '#1A1815',
        bgLight: darken(colors.bg && colors.bg !== '#FFFFFF' ? colors.bg : '#1A1815', 0.1),
        card: lighten(colors.bg && colors.bg !== '#FFFFFF' ? colors.bg : '#1A1815', 0.04),
        border: lighten(colors.bg && colors.bg !== '#FFFFFF' ? colors.bg : '#1A1815', 0.12),
        text: '#f5f5f5',
        textMuted: '#a3a3a3',
        textDim: '#737373',
      };

  return `:root{
  --black:${base.bg};
  --black-light:${base.bgLight};
  --black-card:${base.card};
  --black-border:${base.border};
  --orange:${accent};
  --orange-dark:${darken(accent, 0.12)};
  --orange-light:${lighten(accent, 0.18)};
  --orange-glow:${rgba(accent, 0.25)};
  --orange-subtle:${rgba(accent, isLight ? 0.12 : 0.08)};
  --white:${base.text};
  --gray:${base.textMuted};
  --gray-dark:${base.textDim};
  --red:#ef4444;
}`;
}

function digitsOnly(phone) {
  return phone.replace(/[^0-9]/g, '');
}

function formatPhone(phone) {
  const d = digitsOnly(phone);
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  if (d.length === 11 && d.startsWith('1')) return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return phone;
}

function renderCity(slug) {
  const siteId = cityMap[slug];
  const site = config.sites.find((s) => s.id === siteId);
  if (!site) throw new Error(`sites-config.json has no entry with id=${siteId}`);
  const copy = cityCopy[slug];
  const phone = formatPhone(site.phone);
  const phoneDigits = digitsOnly(site.phoneFull || site.phone);
  const phoneE164 = phoneDigits.length === 10 ? `+1${phoneDigits}` : `+${phoneDigits}`;
  const domain = site.domain;
  const titleCity = copy.displayCity;
  const p = pricing(site);

  let html = template;

  // ── Head: title, meta, OG, canonical ────────────────────────────
  html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>Clean Truck Check ${titleCity} | CARB HD I/M Compliance Testing</title>`,
  );
  html = html.replace(
    /<meta name="description" content="[^"]*">/,
    `<meta name="description" content="${copy.metaDescription}">`,
  );
  html = html.replace(
    /<meta name="keywords" content="[^"]*">/,
    `<meta name="keywords" content="${copy.metaKeywords}">`,
  );
  html = html.replace(
    /<link rel="canonical" href="[^"]*">/,
    `<link rel="canonical" href="https://${domain}/">`,
  );
  html = html.replace(
    /<meta property="og:title" content="[^"]*">/,
    `<meta property="og:title" content="Clean Truck Check ${titleCity} | CARB Compliance Testing">`,
  );
  html = html.replace(
    /<meta property="og:description" content="[^"]*">/,
    `<meta property="og:description" content="CARB credentialed mobile testing for heavy-duty vehicles in ${copy.headlineRegion}. Stay compliant. Avoid $10,000/day fines.">`,
  );
  html = html.replace(
    /<meta property="og:url" content="[^"]*">/,
    `<meta property="og:url" content="https://${domain}/">`,
  );

  // ── CSS variables ───────────────────────────────────────────────
  html = html.replace(/:root\{[\s\S]*?\}/, rootBlock(site));

  // ── Nav + CTA phone + nav brand ─────────────────────────────────
  html = html.replace(
    /Clean Truck Check Roseville/g,
    `Clean Truck Check ${titleCity}`,
  );
  html = html.replace(
    /tel:\+19168904427/g,
    `tel:${phoneE164}`,
  );
  html = html.replace(
    /\(916\) 890-4427/g,
    phone,
  );

  // ── Hero copy ───────────────────────────────────────────────────
  html = html.replace(
    /CARB Credentialed Tester &bull; Roseville, CA/g,
    `CARB Credentialed Tester &bull; ${titleCity}, CA`,
  );
  html = html.replace(
    /CARB-credentialed mobile testing for trucks, buses, and fleets in Roseville, Sacramento, and the greater Placer County area\. Stay compliant\. Avoid fines up to \$10,000\/day\./,
    `CARB-credentialed mobile testing for trucks, buses, and fleets in ${copy.headlineRegion}. Stay compliant. Avoid fines up to $10,000/day.`,
  );

  // ── Pricing (per-city from sites-config.json) ───────────────────
  html = html.replace(
    /<div class="pricing-price">\$150 <span>\/ test<\/span><\/div>/,
    `<div class="pricing-price">${p.single} <span>/ test</span></div>`,
  );
  html = html.replace(
    /<div class="pricing-price">\$120 <span>\/ test<\/span><\/div>/,
    `<div class="pricing-price">${p.fleet} <span>/ test</span></div>`,
  );
  html = html.replace(
    /<div class="pricing-price">\$99 <span>\/ test<\/span><\/div>/,
    `<div class="pricing-price">${p.annual} <span>/ test</span></div>`,
  );

  // ── CTA coverage line + Footer brand description + postal ───────
  html = html.replace(
    /Serving Roseville, Sacramento, Rocklin, Lincoln, Auburn, and all of Placer &amp; Sacramento Counties/,
    copy.coverageLine,
  );
  html = html.replace(
    /CARB credentialed heavy-duty emissions testing serving the greater Roseville and Sacramento area\. Mobile on-site testing for trucks, buses, and fleets\./,
    `CARB credentialed heavy-duty emissions testing serving ${copy.footerRegion}. Mobile on-site testing for trucks, buses, and fleets.`,
  );
  html = html.replace(
    /info@cleantruckcheckroseville\.com/g,
    site.email || `info@${domain}`,
  );
  html = html.replace(
    /Roseville, CA 95678/,
    `${titleCity}, CA ${copy.postal}`,
  );
  html = html.replace(
    /&copy; 2026 Clean Truck Check Roseville\. All rights reserved\./,
    `&copy; 2026 Clean Truck Check ${titleCity}. All rights reserved.`,
  );

  return html;
}

let wrote = 0;
for (const slug of Object.keys(cityMap)) {
  const dir = join(root, 'cloudflare/sites', slug);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const html = renderCity(slug);
  writeFileSync(join(dir, 'index.html'), html);
  wrote++;
  console.log(`wrote cloudflare/sites/${slug}/index.html`);
}
console.log(`Generated ${wrote} city site(s) from sites-config.json.`);
