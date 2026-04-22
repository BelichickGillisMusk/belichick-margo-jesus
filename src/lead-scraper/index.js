import 'dotenv/config';
import { readFileSync, writeFileSync } from 'node:fs';
import { google } from 'googleapis';
import { isMainModule, parseIntegerEnv } from '../shared/runtime-contract.js';

const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY;
const SHEETS_ID = process.env.GOOGLE_SHEETS_ID;
const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || './google-service-account.json';
const REQUEST_RETRIES = parseIntegerEnv('SCRAPER_REQUEST_RETRIES', 3, 1);
const REQUEST_DELAY_MS = parseIntegerEnv('SCRAPER_REQUEST_DELAY_MS', 200, 0);
const CONTACT_PAGE_PATHS = ['/', '/contact', '/contact-us', '/about', '/about-us'];
const RECOMMENDED_CONTACT_TARGETS = ['Fleet Manager', 'COO', 'CEO'];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function validateSearchInput(query) {
  if (!query?.trim()) {
    throw new Error('A search query is required. Example: npm run scrape -- "trucking companies" "Los Angeles CA"');
  }
}

async function fetchWithRetry(url, label, parse) {
  let lastError;

  for (let attempt = 1; attempt <= REQUEST_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const retriable = response.status >= 500 || response.status === 429;
        const message = `${label} HTTP ${response.status}`;
        if (!retriable || attempt === REQUEST_RETRIES) {
          throw new Error(message);
        }
        lastError = new Error(message);
      } else {
        return await parse(response);
      }
    } catch (error) {
      lastError = error;
      if (attempt === REQUEST_RETRIES) {
        break;
      }
    }

    await sleep(REQUEST_DELAY_MS * attempt);
  }

  throw lastError;
}

async function fetchJsonWithRetry(url, label) {
  return fetchWithRetry(url, label, response => response.json());
}

async function fetchTextWithRetry(url, label) {
  return fetchWithRetry(url, label, response => response.text());
}

function ensureGoogleStatus(data, label) {
  if (data.status === 'ZERO_RESULTS') {
    return [];
  }

  if (data.status !== 'OK') {
    throw new Error(`${label}: ${data.status}${data.error_message ? ` - ${data.error_message}` : ''}`);
  }

  return null;
}

export async function searchPlaces(query, location) {
  validateSearchInput(query);
  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  url.searchParams.set('query', location?.trim() ? `${query} in ${location}` : query);
  url.searchParams.set('key', PLACES_KEY);

  const data = await fetchJsonWithRetry(url, 'Google Places text search');
  const emptyResult = ensureGoogleStatus(data, 'Google Places text search');
  if (emptyResult) {
    return emptyResult;
  }

  return data.results.map(result => ({
    placeId: result.place_id,
    name: result.name,
    address: result.formatted_address,
    rating: result.rating || 'N/A',
    totalReviews: result.user_ratings_total || 0,
    open: result.business_status === 'OPERATIONAL',
  }));
}

export async function getPlaceDetails(placeId) {
  const fields = 'name,formatted_phone_number,formatted_address,website,opening_hours,business_status,rating,user_ratings_total';
  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('fields', fields);
  url.searchParams.set('key', PLACES_KEY);

  const data = await fetchJsonWithRetry(url, 'Google Places detail lookup');
  const emptyResult = ensureGoogleStatus(data, 'Google Places detail lookup');
  if (emptyResult) {
    return null;
  }

  const result = data.result;
  return {
    name: result.name || '',
    phone: result.formatted_phone_number || '',
    address: result.formatted_address || '',
    website: result.website || '',
    rating: result.rating || 'N/A',
    reviews: result.user_ratings_total || 0,
    status: result.business_status || 'UNKNOWN',
  };
}

export function csvEscape(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`;
}

function sanitizeEmailCandidate(value) {
  return value
    .replace(/^[("'`<{[\s]+/, '')
    .replace(/[)"'`>}\].,;:\s]+$/, '')
    .trim()
    .toLowerCase();
}

export function extractEmailsFromText(text) {
  const matches = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || [];
  const unique = new Set();

  for (const match of matches) {
    const normalized = sanitizeEmailCandidate(match);
    if (normalized && !normalized.endsWith('@hunter.io') && !normalized.endsWith('@zoominfo.com')) {
      unique.add(normalized);
    }
  }

  return [...unique];
}

function scoreEmail(email) {
  const localPart = email.split('@')[0];

  if (/(fleet|dispatch|operations|ops|safety|maintenance|service)/.test(localPart)) {
    return 100;
  }

  if (/(ceo|coo|owner|president|chief|executive)/.test(localPart)) {
    return 90;
  }

  if (/(sales|support|office|admin)/.test(localPart)) {
    return 70;
  }

  if (/info/.test(localPart)) {
    return 40;
  }

  return 60;
}

export function chooseBestEmail(emails) {
  if (!emails.length) {
    return 'UNKNOWN';
  }

  return [...emails].sort((left, right) => scoreEmail(right) - scoreEmail(left) || left.localeCompare(right))[0];
}

function dedupeByKey(items, getKey) {
  const seen = new Set();
  return items.filter(item => {
    const key = getKey(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function parseCompanyList(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const match = line.match(/^(\d+)[.)-]?\s+(.+)$/);
      if (match) {
        return {
          itemNumber: Number.parseInt(match[1], 10),
          companyName: match[2].trim(),
        };
      }

      return {
        itemNumber: index + 1,
        companyName: line,
      };
    });
}

function normalizeWebsiteUrl(website) {
  if (!website) {
    return null;
  }

  try {
    return new URL(website).toString();
  } catch {
    return new URL(`https://${website}`).toString();
  }
}

async function discoverPublicEmails(website) {
  const normalized = normalizeWebsiteUrl(website);
  if (!normalized) {
    return {
      bestEmail: 'UNKNOWN',
      emails: [],
      sourceNotes: 'No public website found to inspect for contact emails.',
      confidence: 'low',
    };
  }

  const baseUrl = new URL(normalized);
  const findings = [];

  for (const path of CONTACT_PAGE_PATHS) {
    const pageUrl = new URL(path, baseUrl).toString();
    try {
      const html = await fetchTextWithRetry(pageUrl, `Public contact page ${pageUrl}`);
      const emails = extractEmailsFromText(html);
      if (emails.length > 0) {
        findings.push({ pageUrl, emails });
      }
    } catch {
      // Ignore individual page fetch failures and keep trying public pages.
    }

    await sleep(REQUEST_DELAY_MS);
  }

  const emails = dedupeByKey(findings.flatMap(finding => finding.emails), email => email);
  if (emails.length === 0) {
    return {
      bestEmail: 'UNKNOWN',
      emails: [],
      sourceNotes: `Tried public pages (${CONTACT_PAGE_PATHS.join(', ')}) but found no verified email on ${baseUrl.hostname}.`,
      confidence: 'low',
    };
  }

  const bestEmail = chooseBestEmail(emails);
  const sourceNotes = findings
    .map(finding => `${finding.pageUrl} => ${finding.emails.join(', ')}`)
    .join(' | ');

  return {
    bestEmail,
    emails,
    sourceNotes,
    confidence: bestEmail === 'UNKNOWN' ? 'low' : 'high',
  };
}

export function buildCsv(leads) {
  const header = ['Name', 'Phone', 'Address', 'Website', 'Rating', 'Reviews', 'Status'];
  const rows = leads.map(lead => [
    csvEscape(lead.name),
    csvEscape(lead.phone),
    csvEscape(lead.address),
    csvEscape(lead.website),
    csvEscape(lead.rating),
    csvEscape(lead.reviews),
    csvEscape(lead.status),
  ].join(','));

  return [header.join(','), ...rows].join('\n');
}

export function buildCompanyResearchCsv(rows) {
  const header = ['Item', 'Company', 'Matched Place', 'Phone', 'Address', 'Website', 'Best Email', 'All Emails', 'Recommended Targets', 'Source Notes', 'Confidence'];
  const dataRows = rows.map(row => [
    csvEscape(row.itemNumber),
    csvEscape(row.companyName),
    csvEscape(row.matchedName),
    csvEscape(row.phone),
    csvEscape(row.address),
    csvEscape(row.website),
    csvEscape(row.bestEmail),
    csvEscape(row.allEmails.join('; ')),
    csvEscape(row.recommendedTargets.join(' | ')),
    csvEscape(row.sourceNotes),
    csvEscape(row.confidence),
  ].join(','));

  return [header.join(','), ...dataRows].join('\n');
}

function printLeads(leads) {
  console.log('Name | Phone | Address | Website | Rating | Reviews');
  console.log('─'.repeat(110));
  for (const lead of leads) {
    console.log(`${lead.name} | ${lead.phone || 'N/A'} | ${lead.address} | ${lead.website || 'N/A'} | ${lead.rating} | ${lead.reviews}`);
  }
}

function printCompanyResearch(rows) {
  console.log('Item | Company | Best Email | Recommended Targets | Confidence');
  console.log('─'.repeat(120));
  for (const row of rows) {
    console.log(`${row.itemNumber} | ${row.companyName} | ${row.bestEmail} | ${row.recommendedTargets.join(' / ')} | ${row.confidence}`);
  }
}

async function writeToSheets(leads) {
  if (!SHEETS_ID) {
    console.log('\n⚠ No GOOGLE_SHEETS_ID set — printing to console only.');
    return;
  }

  let auth;
  try {
    auth = new google.auth.GoogleAuth({
      keyFile: SERVICE_ACCOUNT_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  } catch {
    console.log('\n⚠ Could not load Google service account — skipping Google Sheets export.');
    return;
  }

  const sheets = google.sheets({ version: 'v4', auth });
  const header = ['Name', 'Phone', 'Address', 'Website', 'Rating', 'Reviews', 'Status', 'Scraped'];
  const rows = leads.map(lead => [
    lead.name,
    lead.phone,
    lead.address,
    lead.website,
    String(lead.rating),
    String(lead.reviews),
    lead.status,
    new Date().toISOString(),
  ]);

  if (rows.length === 0) {
    return;
  }

  let shouldWriteHeader = true;
  try {
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEETS_ID,
      range: 'Leads!A1:H1',
    });
    shouldWriteHeader = !existing.data.values?.length;
  } catch {
    shouldWriteHeader = true;
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEETS_ID,
    range: 'Leads!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: shouldWriteHeader ? [header, ...rows] : rows,
    },
  });

  console.log(`✅ ${leads.length} leads written to Google Sheets`);
}

export function parseCliArgs(argv = process.argv.slice(2)) {
  if (argv[0] === '--companies-file') {
    return {
      mode: 'company-list',
      companiesText: readFileSync(argv[1], 'utf-8'),
      location: argv[2] || '',
    };
  }

  if (argv[0] === '--companies-text') {
    return {
      mode: 'company-list',
      companiesText: argv[1] || '',
      location: argv[2] || '',
    };
  }

  return {
    mode: 'search',
    query: argv[0] || 'trucking companies',
    location: argv[1] || 'Chicago IL',
  };
}

export async function researchCompanyList({ companiesText, location = '' }) {
  if (!PLACES_KEY) {
    throw new Error('Set GOOGLE_PLACES_API_KEY in .env');
  }

  const companies = parseCompanyList(companiesText);
  if (companies.length === 0) {
    throw new Error('Provide at least one company name in the numbered list.');
  }

  const rows = [];

  for (const company of companies) {
    const matches = await searchPlaces(company.companyName, location);
    const bestMatch = matches[0];

    if (!bestMatch) {
      rows.push({
        itemNumber: company.itemNumber,
        companyName: company.companyName,
        matchedName: 'UNKNOWN',
        phone: '',
        address: '',
        website: '',
        bestEmail: 'UNKNOWN',
        allEmails: [],
        recommendedTargets: RECOMMENDED_CONTACT_TARGETS,
        sourceNotes: 'No Google Business Profile / Google Places match found.',
        confidence: 'low',
      });
      continue;
    }

    const details = await getPlaceDetails(bestMatch.placeId);
    const contactResearch = await discoverPublicEmails(details?.website);

    rows.push({
      itemNumber: company.itemNumber,
      companyName: company.companyName,
      matchedName: details?.name || bestMatch.name || 'UNKNOWN',
      phone: details?.phone || '',
      address: details?.address || bestMatch.address || '',
      website: details?.website || '',
      bestEmail: contactResearch.bestEmail,
      allEmails: contactResearch.emails,
      recommendedTargets: RECOMMENDED_CONTACT_TARGETS,
      sourceNotes: contactResearch.sourceNotes,
      confidence: contactResearch.confidence,
    });

    await sleep(REQUEST_DELAY_MS);
  }

  printCompanyResearch(rows);
  const timestamp = new Date().toISOString().slice(0, 10);
  const csvPath = `company-contact-research-${timestamp}.csv`;
  writeFileSync(csvPath, buildCompanyResearchCsv(rows));
  console.log(`\n📄 Contact research CSV saved: ${csvPath}`);

  return { csvPath, rows };
}

export async function runScrape({ mode = 'search', query, location, companiesText }) {
  if (!PLACES_KEY) {
    throw new Error('Set GOOGLE_PLACES_API_KEY in .env');
  }

  if (mode === 'company-list') {
    return researchCompanyList({ companiesText, location });
  }

  validateSearchInput(query);
  console.log(`🔍 Searching: "${query}" in ${location}...`);

  const results = await searchPlaces(query, location);
  console.log(`📍 Found ${results.length} businesses. Getting details...`);

  const leads = [];
  for (const result of results) {
    const detail = await getPlaceDetails(result.placeId);
    if (detail) {
      leads.push(detail);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  console.log(`✅ ${leads.length} leads with full details.\n`);
  printLeads(leads);
  await writeToSheets(leads);

  const timestamp = new Date().toISOString().slice(0, 10);
  const safeName = location.replace(/[^a-zA-Z0-9]/g, '-');
  const csvPath = `leads-${safeName}-${timestamp}.csv`;
  writeFileSync(csvPath, buildCsv(leads));
  console.log(`\n📄 CSV saved: ${csvPath}`);

  return { csvPath, leads };
}

if (isMainModule(import.meta)) {
  runScrape(parseCliArgs()).catch(error => {
    console.error('💀 Scraper failed:', error.message);
    process.exit(1);
  });
}
