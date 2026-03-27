#!/usr/bin/env node
/**
 * CARB Sites Audit Tool — "Our SEMrush"
 *
 * Quick mode: Parses static HTML files and scores them on:
 * - Schema (JSON-LD completeness + validation)
 * - SEO (title, meta, OG tags, canonical)
 * - Content (required elements, blacklisted content)
 * - Pricing (cross-check vs sites-config.json)
 * - Performance (file size, font preconnect, no blocking JS)
 * - Accessibility (contrast ratios, semantic HTML, ARIA)
 * - Mobile (viewport, responsive hints)
 *
 * Usage: npm run audit [--site=cleantruckchecklodi] [--verbose] [--json]
 */

import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { load } from 'cheerio';
import Table from 'cli-table3';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

// Parse CLI args
const args = process.argv.slice(2);
const siteFilter = args.find(a => a.startsWith('--site='))?.split('=')[1];
const verbose = args.includes('--verbose') || args.includes('-v');
const jsonOutput = args.includes('--json');

// Load config
const config = JSON.parse(readFileSync(join(ROOT, 'sites-config.json'), 'utf8'));
const rules = JSON.parse(readFileSync(join(ROOT, 'tools', 'audit-rules.json'), 'utf8'));

// ─── Color contrast helpers ────────────────────────────────────────
function hexToRgb(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16)
  };
}

function relativeLuminance({ r, g, b }) {
  const [rs, gs, bs] = [r, g, b].map(c => {
    c = c / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hexToRgb(hex1));
  const l2 = relativeLuminance(hexToRgb(hex2));
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

// ─── Schema Audit ──────────────────────────────────────────────────
function auditSchema(html, $, siteConfig) {
  const issues = [];
  let score = 0;
  const maxScore = 100;

  // Extract all JSON-LD blocks
  const jsonLdBlocks = [];
  $('script[type="application/ld+json"]').each((i, el) => {
    try {
      jsonLdBlocks.push(JSON.parse($(el).html()));
    } catch (e) {
      issues.push({ severity: 'error', msg: `JSON-LD block ${i + 1}: Invalid JSON — ${e.message}` });
    }
  });

  if (jsonLdBlocks.length === 0) {
    issues.push({ severity: 'error', msg: 'No JSON-LD schema found' });
    return { score: 0, issues, details: { blocks: 0 } };
  }

  // Flatten nested types
  const allTypes = new Set();
  function extractTypes(obj) {
    if (!obj) return;
    if (obj['@type']) {
      const types = Array.isArray(obj['@type']) ? obj['@type'] : [obj['@type']];
      types.forEach(t => allTypes.add(t));
    }
    Object.values(obj).forEach(v => {
      if (typeof v === 'object' && v !== null) {
        if (Array.isArray(v)) v.forEach(item => { if (typeof item === 'object') extractTypes(item); });
        else extractTypes(v);
      }
    });
  }
  jsonLdBlocks.forEach(extractTypes);

  // Check required types
  const requiredTypes = rules.requiredSchemaTypes;
  const pointsPerType = 60 / requiredTypes.length; // 60 points for type coverage

  requiredTypes.forEach(type => {
    // AutoRepair counts as LocalBusiness
    if (type === 'LocalBusiness' && (allTypes.has('LocalBusiness') || allTypes.has('AutoRepair'))) {
      score += pointsPerType;
    } else if (type === 'AutoRepair' && (allTypes.has('AutoRepair') || allTypes.has('LocalBusiness'))) {
      score += pointsPerType;
    } else if (allTypes.has(type)) {
      score += pointsPerType;
    } else {
      issues.push({ severity: 'error', msg: `Missing schema type: ${type}` });
    }
  });

  // Check LocalBusiness/AutoRepair has required fields
  const bizBlock = jsonLdBlocks.find(b => b['@type'] === 'AutoRepair' || b['@type'] === 'LocalBusiness');
  if (bizBlock) {
    const requiredFields = ['name', 'telephone', 'email', 'url', 'address', 'areaServed'];
    const fieldPoints = 20 / requiredFields.length;
    requiredFields.forEach(field => {
      if (bizBlock[field]) {
        score += fieldPoints;
      } else {
        issues.push({ severity: 'warning', msg: `LocalBusiness missing field: ${field}` });
      }
    });

    // Check prices in schema match config
    if (siteConfig.obdPrice !== null) {
      const offers = bizBlock.hasOfferCatalog?.itemListElement || [];
      const obdOffer = offers.find(o => o.itemOffered?.name?.toLowerCase().includes('obd'));
      if (obdOffer && parseFloat(obdOffer.price) !== siteConfig.obdPrice) {
        issues.push({ severity: 'error', msg: `Schema OBD price $${obdOffer.price} != config $${siteConfig.obdPrice}` });
      }
    }
  }

  // Check AggregateRating values
  const hasRating = jsonLdBlocks.some(b => {
    if (b['@type'] === 'AggregateRating') return true;
    if (b.aggregateRating) return true;
    return false;
  });
  if (hasRating) score += 10;

  // Check FAQPage has questions
  const faqBlock = jsonLdBlocks.find(b => b['@type'] === 'FAQPage');
  if (faqBlock && faqBlock.mainEntity?.length >= 3) {
    score += 10;
  } else if (faqBlock) {
    score += 5;
    issues.push({ severity: 'warning', msg: `FAQPage has only ${faqBlock.mainEntity?.length || 0} questions (recommend 5+)` });
  }

  return { score: Math.min(Math.round(score), maxScore), issues, details: { blocks: jsonLdBlocks.length, types: [...allTypes] } };
}

// ─── SEO Audit ─────────────────────────────────────────────────────
function auditSEO($, siteConfig) {
  const issues = [];
  let score = 0;

  // Title tag (20 points)
  const title = $('title').text().trim();
  if (!title) {
    issues.push({ severity: 'error', msg: 'Missing <title> tag' });
  } else {
    if (title.length <= rules.seo.titleMaxLength && title.length >= rules.seo.titleMinLength) {
      score += 20;
    } else {
      score += 10;
      issues.push({ severity: 'warning', msg: `Title length ${title.length} chars (ideal: ${rules.seo.titleMinLength}-${rules.seo.titleMaxLength})` });
    }
  }

  // Meta description (20 points)
  const metaDesc = $('meta[name="description"]').attr('content') || '';
  if (!metaDesc) {
    issues.push({ severity: 'error', msg: 'Missing meta description' });
  } else {
    if (metaDesc.length >= rules.seo.metaDescMinLength && metaDesc.length <= rules.seo.metaDescMaxLength) {
      score += 20;
    } else {
      score += 10;
      issues.push({ severity: 'warning', msg: `Meta desc length ${metaDesc.length} chars (ideal: ${rules.seo.metaDescMinLength}-${rules.seo.metaDescMaxLength})` });
    }
  }

  // H1 tag (15 points)
  const h1s = $('h1');
  if (h1s.length === 1) {
    score += 15;
  } else if (h1s.length > 1) {
    score += 8;
    issues.push({ severity: 'warning', msg: `${h1s.length} H1 tags found (should be exactly 1)` });
  } else {
    issues.push({ severity: 'error', msg: 'No H1 tag found' });
  }

  // Canonical URL (10 points)
  const canonical = $('link[rel="canonical"]').attr('href');
  if (canonical) {
    score += 10;
    if (!canonical.includes(siteConfig.domain)) {
      issues.push({ severity: 'warning', msg: `Canonical URL doesn't match domain: ${canonical}` });
    }
  } else {
    issues.push({ severity: 'warning', msg: 'Missing canonical URL' });
  }

  // OG tags (15 points)
  const ogPoints = 15 / rules.seo.requiredOGTags.length;
  rules.seo.requiredOGTags.forEach(tag => {
    if ($(`meta[property="${tag}"]`).length > 0) {
      score += ogPoints;
    } else {
      issues.push({ severity: 'warning', msg: `Missing OG tag: ${tag}` });
    }
  });

  // Meta robots (5 points)
  const robots = $('meta[name="robots"]').attr('content') || '';
  if (robots.includes('index')) {
    score += 5;
  } else if (!robots) {
    score += 3; // No robots meta = browser default (index,follow)
  } else {
    issues.push({ severity: 'warning', msg: `Robots meta: "${robots}" — should include "index"` });
  }

  // Heading hierarchy (10 points)
  const headings = [];
  $('h1, h2, h3, h4, h5, h6').each((i, el) => headings.push(parseInt(el.tagName[1])));
  let hierarchyOk = true;
  for (let i = 1; i < headings.length; i++) {
    if (headings[i] > headings[i - 1] + 1) {
      hierarchyOk = false;
      break;
    }
  }
  if (hierarchyOk && headings.length > 0) {
    score += 10;
  } else {
    score += 5;
    issues.push({ severity: 'info', msg: 'Heading hierarchy has gaps (e.g., H1 → H3 skipping H2)' });
  }

  // Keywords in title (5 points)
  const cityName = siteConfig.nickname.split('/')[0].trim().toLowerCase();
  if (title.toLowerCase().includes(cityName) || title.toLowerCase().includes('carb')) {
    score += 5;
  } else {
    issues.push({ severity: 'info', msg: 'Title should include city name or "CARB"' });
  }

  return { score: Math.min(Math.round(score), 100), issues };
}

// ─── Content Audit ─────────────────────────────────────────────────
function auditContent(html, siteConfig) {
  const issues = [];
  let pass = true;

  // Required elements
  for (const [key, rule] of Object.entries(rules.requiredElements)) {
    const patterns = rule.patterns || [rule.pattern];
    const found = patterns.some(p => html.toLowerCase().includes(p.toLowerCase()));
    if (!found) {
      issues.push({ severity: 'error', msg: `Missing: ${rule.description}` });
      pass = false;
    }
  }

  // Blacklisted content
  for (const [pattern, rule] of Object.entries(rules.blacklistedContent)) {
    if (html.toLowerCase().includes(pattern.toLowerCase())) {
      issues.push({ severity: rule.severity, msg: `BLACKLISTED: ${rule.description}` });
      if (rule.severity === 'critical') pass = false;
    }
  }

  // Check phone number matches config
  if (siteConfig.phone) {
    const phoneDigits = siteConfig.phone.replace(/\D/g, '');
    if (!html.includes(phoneDigits) && !html.includes(siteConfig.phone)) {
      issues.push({ severity: 'warning', msg: `Phone ${siteConfig.phone} not found in HTML` });
    }
  }

  // Check email
  if (siteConfig.email && !html.includes(siteConfig.email)) {
    issues.push({ severity: 'warning', msg: `Email ${siteConfig.email} not found in HTML` });
  }

  return { pass, issues };
}

// ─── Pricing Audit ─────────────────────────────────────────────────
function auditPricing(html, siteConfig) {
  const issues = [];
  let pass = true;

  if (siteConfig.obdPrice === null) {
    issues.push({ severity: 'info', msg: 'Prices set to "keep current" — skipping price check' });
    return { pass: true, issues };
  }

  // Check OBD price appears
  const obdStr = `$${siteConfig.obdPrice}`;
  if (!html.includes(obdStr)) {
    issues.push({ severity: 'error', msg: `OBD price ${obdStr} not found in HTML` });
    pass = false;
  }

  // Check OVI price appears
  const oviStr = `$${siteConfig.oviPrice}`;
  if (!html.includes(oviStr)) {
    issues.push({ severity: 'error', msg: `OVI price ${oviStr} not found in HTML` });
    pass = false;
  }

  // Check fleet prices
  const fleetOBDStr = `$${siteConfig.fleetOBD}`;
  const fleetOVIStr = `$${siteConfig.fleetOVI}`;
  if (!html.includes(fleetOBDStr)) {
    issues.push({ severity: 'warning', msg: `Fleet OBD price ${fleetOBDStr} not found` });
  }
  if (!html.includes(fleetOVIStr)) {
    issues.push({ severity: 'warning', msg: `Fleet OVI price ${fleetOVIStr} not found` });
  }

  // Check motorhome prices
  const mhOBD = `$${siteConfig.motorhomeOBD}`;
  const mhOVI = `$${siteConfig.motorhomeOVI}`;
  if (!html.includes(mhOBD) || !html.includes(mhOVI)) {
    issues.push({ severity: 'warning', msg: `Motorhome pricing not found (${mhOBD}/${mhOVI})` });
  }

  return { pass, issues };
}

// ─── Performance Audit ─────────────────────────────────────────────
function auditPerformance(html, $) {
  const issues = [];
  let score = 0;

  // File size (25 points)
  const sizeKB = Buffer.byteLength(html, 'utf8') / 1024;
  if (sizeKB <= rules.seo.maxHtmlSizeKB) {
    score += 25;
  } else {
    score += Math.max(0, 25 - Math.floor((sizeKB - rules.seo.maxHtmlSizeKB) / 10));
    issues.push({ severity: 'warning', msg: `HTML size ${sizeKB.toFixed(1)}KB exceeds ${rules.seo.maxHtmlSizeKB}KB` });
  }

  // No external blocking JS (25 points)
  const externalScripts = $('script[src]').not('[async]').not('[defer]');
  if (externalScripts.length === 0) {
    score += 25;
  } else {
    score += 15;
    issues.push({ severity: 'warning', msg: `${externalScripts.length} blocking external script(s)` });
  }

  // Font preconnect (15 points)
  const preconnects = $('link[rel="preconnect"]');
  if (preconnects.length > 0) {
    score += 15;
  } else {
    const usesGoogleFonts = html.includes('fonts.googleapis.com');
    if (usesGoogleFonts) {
      issues.push({ severity: 'warning', msg: 'Uses Google Fonts but no preconnect hint' });
    } else {
      score += 15; // No external fonts = fine
    }
  }

  // Inline CSS (good for single-page — 15 points)
  const inlineStyles = $('style').length;
  const externalCSS = $('link[rel="stylesheet"]').not('[href*="fonts.googleapis"]').length;
  if (externalCSS === 0) {
    score += 15; // All inline = great for single-page
  } else {
    score += 8;
    issues.push({ severity: 'info', msg: `${externalCSS} external stylesheet(s) — consider inlining for single-page` });
  }

  // No images without dimensions (10 points)
  const imgsWithoutDims = $('img').filter((i, el) => !$(el).attr('width') && !$(el).attr('height')).length;
  const totalImgs = $('img').length;
  if (totalImgs === 0 || imgsWithoutDims === 0) {
    score += 10;
  } else {
    issues.push({ severity: 'warning', msg: `${imgsWithoutDims}/${totalImgs} images missing width/height (CLS risk)` });
  }

  // CSS display:swap for fonts (10 points)
  if (html.includes('display=swap') || !html.includes('fonts.googleapis.com')) {
    score += 10;
  } else {
    issues.push({ severity: 'warning', msg: 'Google Fonts loaded without display=swap' });
  }

  return { score: Math.min(Math.round(score), 100), issues, details: { sizeKB: sizeKB.toFixed(1) } };
}

// ─── Accessibility Audit ───────────────────────────────────────────
function auditAccessibility($, siteConfig) {
  const issues = [];
  let score = 0;

  // Lang attribute (10 points)
  const lang = $('html').attr('lang');
  if (lang) {
    score += 10;
  } else {
    issues.push({ severity: 'error', msg: 'Missing lang attribute on <html>' });
  }

  // Charset (5 points)
  if ($('meta[charset]').length > 0) {
    score += 5;
  }

  // ARIA landmarks (15 points)
  const hasNav = $('nav').length > 0;
  const hasMain = $('main').length > 0 || $('[role="main"]').length > 0;
  const hasFooter = $('footer').length > 0;
  if (hasNav) score += 5;
  if (hasMain) score += 5;
  else issues.push({ severity: 'warning', msg: 'No <main> element found' });
  if (hasFooter) score += 5;

  // Button accessibility (15 points)
  const buttonsWithoutLabel = $('button').filter((i, el) => {
    const text = $(el).text().trim();
    const ariaLabel = $(el).attr('aria-label');
    return !text && !ariaLabel;
  }).length;
  if (buttonsWithoutLabel === 0) {
    score += 15;
  } else {
    score += 8;
    issues.push({ severity: 'warning', msg: `${buttonsWithoutLabel} button(s) without accessible label` });
  }

  // Link phone numbers are tel: links (10 points)
  if (siteConfig.phone) {
    const telLinks = $(`a[href^="tel:"]`).length;
    if (telLinks > 0) {
      score += 10;
    } else {
      issues.push({ severity: 'warning', msg: 'No tel: links found — phone numbers should be clickable' });
    }
  } else {
    score += 10;
  }

  // Color contrast (20 points)
  const bgColor = siteConfig.colors.bg || '#FFFFFF';
  const primaryColor = siteConfig.colors.primary || '#000000';
  const accentColor = siteConfig.colors.accent || '#333333';

  const primaryContrast = contrastRatio(primaryColor, bgColor);
  const accentContrast = contrastRatio(accentColor, bgColor);

  if (primaryContrast >= rules.accessibility.minContrastRatio) {
    score += 10;
  } else {
    issues.push({ severity: 'error', msg: `Primary color ${primaryColor} on ${bgColor}: contrast ${primaryContrast.toFixed(1)}:1 (need ${rules.accessibility.minContrastRatio}:1)` });
  }

  if (accentContrast >= rules.accessibility.minLargeTextContrast) {
    score += 10;
  } else {
    issues.push({ severity: 'warning', msg: `Accent color ${accentColor} on ${bgColor}: contrast ${accentContrast.toFixed(1)}:1 (need ${rules.accessibility.minLargeTextContrast}:1 for large text)` });
  }

  // Semantic HTML (15 points)
  const sections = $('section').length;
  const divSoup = $('div').length;
  const semanticRatio = sections / Math.max(1, sections + divSoup);
  if (semanticRatio > 0.2) {
    score += 15;
  } else if (semanticRatio > 0.1) {
    score += 8;
    issues.push({ severity: 'info', msg: 'Consider using more semantic HTML elements (<section>, <article>, etc.)' });
  } else {
    issues.push({ severity: 'warning', msg: 'Very few semantic HTML elements — mostly <div> soup' });
  }

  // Skip nav / focus management (10 points)
  const skipLink = $('a[href="#main"], a[href="#content"], .skip-nav, .skip-link').length;
  if (skipLink > 0) {
    score += 10;
  } else {
    score += 5; // Not critical for single-page
    issues.push({ severity: 'info', msg: 'No skip-to-content link found (nice-to-have)' });
  }

  return { score: Math.min(Math.round(score), 100), issues };
}

// ─── Mobile Audit ──────────────────────────────────────────────────
function auditMobile($, html) {
  const issues = [];
  let score = 0;

  // Viewport meta (30 points)
  const viewport = $('meta[name="viewport"]').attr('content') || '';
  if (viewport.includes('width=device-width')) {
    score += 30;
  } else {
    issues.push({ severity: 'error', msg: 'Missing or incorrect viewport meta tag' });
  }

  // Media queries present (25 points)
  const mediaQueryCount = (html.match(/@media/g) || []).length;
  if (mediaQueryCount >= 2) {
    score += 25;
  } else if (mediaQueryCount >= 1) {
    score += 15;
    issues.push({ severity: 'info', msg: `Only ${mediaQueryCount} media query — consider adding more breakpoints` });
  } else {
    issues.push({ severity: 'error', msg: 'No media queries found — not responsive' });
  }

  // No fixed-width elements (15 points)
  const fixedWidths = (html.match(/width:\s*\d{4,}px/g) || []).length;
  if (fixedWidths === 0) {
    score += 15;
  } else {
    issues.push({ severity: 'warning', msg: `${fixedWidths} fixed-width declarations > 999px found` });
  }

  // Touch-friendly inputs (15 points)
  const inputs = $('input, select, textarea, button');
  score += 15; // Assume OK for static analysis (Lighthouse full audit catches real issues)

  // Mobile toggle/hamburger exists (15 points)
  const hasMobileNav = html.includes('mobile-toggle') || html.includes('hamburger') ||
                        html.includes('mobile-menu') || html.includes('nav-toggle');
  if (hasMobileNav) {
    score += 15;
  } else {
    score += 5;
    issues.push({ severity: 'info', msg: 'No mobile nav toggle detected' });
  }

  return { score: Math.min(Math.round(score), 100), issues };
}

// ─── Run Audit for One Site ────────────────────────────────────────
function auditSite(siteConfig) {
  const siteDirs = [
    join(ROOT, 'sites', siteConfig.id),
    join(ROOT, siteConfig.id)
  ];

  let htmlPath = null;
  for (const dir of siteDirs) {
    const p = join(dir, 'index.html');
    if (existsSync(p)) { htmlPath = p; break; }
  }

  if (!htmlPath) {
    return {
      site: siteConfig.domain,
      exists: false,
      schema: { score: 0, issues: [{ severity: 'error', msg: 'index.html not found' }] },
      seo: { score: 0, issues: [] },
      content: { pass: false, issues: [] },
      pricing: { pass: false, issues: [] },
      performance: { score: 0, issues: [] },
      accessibility: { score: 0, issues: [] },
      mobile: { score: 0, issues: [] },
      overall: 0
    };
  }

  const html = readFileSync(htmlPath, 'utf8');
  const $ = load(html);

  const schema = auditSchema(html, $, siteConfig);
  const seo = auditSEO($, siteConfig);
  const content = auditContent(html, siteConfig);
  const pricing = auditPricing(html, siteConfig);
  const performance = auditPerformance(html, $);
  const accessibility = auditAccessibility($, siteConfig);
  const mobile = auditMobile($, html);

  // Overall score: weighted average of scored categories + pass/fail penalties
  const weightedScore = (
    schema.score * 0.25 +
    seo.score * 0.25 +
    performance.score * 0.15 +
    accessibility.score * 0.20 +
    mobile.score * 0.15
  );

  // Deduct for content/pricing failures
  let penalty = 0;
  if (!content.pass) penalty += 15;
  if (!pricing.pass) penalty += 10;

  const overall = Math.max(0, Math.round(weightedScore - penalty));

  return {
    site: siteConfig.domain,
    exists: true,
    htmlPath,
    schema,
    seo,
    content,
    pricing,
    performance,
    accessibility,
    mobile,
    overall
  };
}

// ─── Format Output ─────────────────────────────────────────────────
function formatScore(score) {
  if (score >= 90) return chalk.green.bold(`${score}`);
  if (score >= 70) return chalk.yellow(`${score}`);
  return chalk.red.bold(`${score}`);
}

function formatPassFail(pass) {
  return pass ? chalk.green.bold('PASS') : chalk.red.bold('FAIL');
}

function printResults(results) {
  console.log('\n' + chalk.bold.cyan('═══════════════════════════════════════════════════════════════'));
  console.log(chalk.bold.cyan('  CARB Sites Audit Report — ' + new Date().toISOString().split('T')[0]));
  console.log(chalk.bold.cyan('═══════════════════════════════════════════════════════════════\n'));

  const table = new Table({
    head: [
      chalk.white.bold('Site'),
      chalk.white.bold('SEO'),
      chalk.white.bold('Schema'),
      chalk.white.bold('Perf'),
      chalk.white.bold('A11y'),
      chalk.white.bold('Mobile'),
      chalk.white.bold('Content'),
      chalk.white.bold('Prices'),
      chalk.white.bold('Overall')
    ],
    colWidths: [30, 7, 9, 7, 7, 8, 9, 9, 9],
    style: { head: [], border: ['gray'] }
  });

  results.forEach(r => {
    if (!r.exists) {
      table.push([
        chalk.gray(r.site),
        chalk.gray('—'), chalk.gray('—'), chalk.gray('—'), chalk.gray('—'), chalk.gray('—'),
        chalk.gray('—'), chalk.gray('—'),
        chalk.gray('N/A')
      ]);
    } else {
      table.push([
        r.overall >= 80 ? chalk.green(r.site) : r.overall >= 50 ? chalk.yellow(r.site) : chalk.red(r.site),
        formatScore(r.seo.score),
        formatScore(r.schema.score),
        formatScore(r.performance.score),
        formatScore(r.accessibility.score),
        formatScore(r.mobile.score),
        formatPassFail(r.content.pass),
        formatPassFail(r.pricing.pass),
        formatScore(r.overall)
      ]);
    }
  });

  console.log(table.toString());

  // Print detailed issues if verbose
  if (verbose) {
    results.forEach(r => {
      if (!r.exists) return;
      const allIssues = [
        ...r.schema.issues, ...r.seo.issues, ...r.content.issues,
        ...r.pricing.issues, ...r.performance.issues, ...r.accessibility.issues,
        ...r.mobile.issues
      ];
      if (allIssues.length === 0) return;

      console.log(`\n${chalk.bold.underline(r.site)}:`);
      allIssues.forEach(issue => {
        const icon = issue.severity === 'error' ? chalk.red('✗') :
                     issue.severity === 'critical' ? chalk.red.bold('✗✗') :
                     issue.severity === 'warning' ? chalk.yellow('⚠') :
                     chalk.gray('ℹ');
        console.log(`  ${icon} ${issue.msg}`);
      });
    });
  }

  // Summary
  const existing = results.filter(r => r.exists);
  const passing = existing.filter(r => r.overall >= 80);
  const avgScore = existing.length > 0 ? Math.round(existing.reduce((sum, r) => sum + r.overall, 0) / existing.length) : 0;

  console.log(`\n${chalk.bold('Summary:')} ${passing.length}/${existing.length} sites passing (80+) | Avg score: ${formatScore(avgScore)}`);
  console.log(`${chalk.gray('Sites found:')} ${existing.length}/${results.length} | ${chalk.gray('Missing:')} ${results.length - existing.length}`);

  if (!verbose && existing.some(r => r.overall < 80)) {
    console.log(chalk.gray('\nRun with --verbose for detailed issues'));
  }

  console.log('');
}

// ─── Main ──────────────────────────────────────────────────────────
const sites = siteFilter
  ? config.sites.filter(s => s.id === siteFilter || s.domain === siteFilter)
  : config.sites;

if (sites.length === 0) {
  console.error(chalk.red(`No site found matching "${siteFilter}"`));
  console.log(chalk.gray('Available sites: ' + config.sites.map(s => s.id).join(', ')));
  process.exit(1);
}

const results = sites.map(auditSite);

if (jsonOutput) {
  const reportDir = join(ROOT, 'reports');
  if (!existsSync(reportDir)) mkdirSync(reportDir, { recursive: true });
  const reportPath = join(reportDir, `audit-${new Date().toISOString().split('T')[0]}.json`);
  writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`Report saved: ${reportPath}`);
} else {
  printResults(results);
}

// Exit with error if any existing site fails
const exitCode = results.some(r => r.exists && r.overall < 50) ? 1 : 0;
process.exit(exitCode);
