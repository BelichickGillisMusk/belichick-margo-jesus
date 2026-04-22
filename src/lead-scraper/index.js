import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { google } from 'googleapis';
import { isMainModule, parseIntegerEnv } from '../shared/runtime-contract.js';

const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY;
const SHEETS_ID = process.env.GOOGLE_SHEETS_ID;
const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || './google-service-account.json';
const REQUEST_RETRIES = parseIntegerEnv('SCRAPER_REQUEST_RETRIES', 3, 1);
const REQUEST_DELAY_MS = parseIntegerEnv('SCRAPER_REQUEST_DELAY_MS', 200, 0);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function validateSearchInput(query, location) {
  if (!query?.trim()) {
    throw new Error('A search query is required. Example: npm run scrape -- "trucking companies" "Los Angeles CA"');
  }

  if (!location?.trim()) {
    throw new Error('A location is required. Example: npm run scrape -- "trucking companies" "Los Angeles CA"');
  }
}

async function fetchJsonWithRetry(url, label) {
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
        return await response.json();
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
  validateSearchInput(query, location);
  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  url.searchParams.set('query', `${query} in ${location}`);
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

function printLeads(leads) {
  console.log('Name | Phone | Address | Website | Rating | Reviews');
  console.log('─'.repeat(110));
  for (const lead of leads) {
    console.log(`${lead.name} | ${lead.phone || 'N/A'} | ${lead.address} | ${lead.website || 'N/A'} | ${lead.rating} | ${lead.reviews}`);
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
  return {
    query: argv[0] || 'trucking companies',
    location: argv[1] || 'Chicago IL',
  };
}

export async function runScrape({ query, location }) {
  if (!PLACES_KEY) {
    throw new Error('Set GOOGLE_PLACES_API_KEY in .env');
  }

  validateSearchInput(query, location);
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
