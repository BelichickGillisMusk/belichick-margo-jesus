import 'dotenv/config';
import { writeFileSync } from 'node:fs';
import { google } from 'googleapis';

const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY;
const SHEETS_ID = process.env.GOOGLE_SHEETS_ID;
const SERVICE_ACCOUNT_KEY = process.env.GOOGLE_SERVICE_ACCOUNT_KEY || './google-service-account.json';

// ── Google Places Text Search ─────────────────────────────────
async function searchPlaces(query, location) {
  const url = new URL('https://maps.googleapis.com/maps/api/place/textsearch/json');
  url.searchParams.set('query', `${query} in ${location}`);
  url.searchParams.set('key', PLACES_KEY);

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== 'OK') {
    console.error(`Places API error: ${data.status} - ${data.error_message || ''}`);
    return [];
  }

  return data.results.map(r => ({
    placeId: r.place_id,
    name: r.name,
    address: r.formatted_address,
    rating: r.rating || 'N/A',
    totalReviews: r.user_ratings_total || 0,
    open: r.business_status === 'OPERATIONAL',
  }));
}

// ── Google Places Detail Lookup ───────────────────────────────
async function getPlaceDetails(placeId) {
  const fields = 'name,formatted_phone_number,formatted_address,website,opening_hours,business_status,rating,user_ratings_total';
  const url = new URL('https://maps.googleapis.com/maps/api/place/details/json');
  url.searchParams.set('place_id', placeId);
  url.searchParams.set('fields', fields);
  url.searchParams.set('key', PLACES_KEY);

  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== 'OK') return null;

  const r = data.result;
  return {
    name: r.name || '',
    phone: r.formatted_phone_number || '',
    address: r.formatted_address || '',
    website: r.website || '',
    rating: r.rating || 'N/A',
    reviews: r.user_ratings_total || 0,
    status: r.business_status || 'UNKNOWN',
  };
}

// ── Write to Google Sheets ────────────────────────────────────
async function writeToSheets(leads) {
  if (!SHEETS_ID) {
    console.log('\n⚠ No GOOGLE_SHEETS_ID set — printing to console instead:\n');
    printLeads(leads);
    return;
  }

  let auth;
  try {
    auth = new google.auth.GoogleAuth({
      keyFile: SERVICE_ACCOUNT_KEY,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  } catch {
    console.log('\n⚠ Could not load Google service account — printing to console:\n');
    printLeads(leads);
    return;
  }

  const sheets = google.sheets({ version: 'v4', auth });

  const header = ['Name', 'Phone', 'Address', 'Website', 'Rating', 'Reviews', 'Status', 'Scraped'];
  const rows = leads.map(l => [
    l.name, l.phone, l.address, l.website,
    String(l.rating), String(l.reviews), l.status,
    new Date().toISOString(),
  ]);

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEETS_ID,
    range: 'Leads!A1',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [header, ...rows] },
  });

  console.log(`✅ ${leads.length} leads written to Google Sheets`);
}

// ── Console output ────────────────────────────────────────────
function printLeads(leads) {
  console.log('Name | Phone | Address | Rating | Reviews');
  console.log('─'.repeat(80));
  for (const l of leads) {
    console.log(`${l.name} | ${l.phone || 'N/A'} | ${l.address} | ${l.rating} | ${l.reviews}`);
  }
}

// ── Main ──────────────────────────────────────────────────────
async function main() {
  const query = process.argv[2] || 'trucking companies';
  const location = process.argv[3] || 'Chicago IL';

  if (!PLACES_KEY) {
    console.error('❌ Set GOOGLE_PLACES_API_KEY in .env');
    process.exit(1);
  }

  console.log(`🔍 Searching: "${query}" in ${location}...`);

  const results = await searchPlaces(query, location);
  console.log(`📍 Found ${results.length} businesses. Getting details...`);

  const leads = [];
  for (const r of results) {
    const detail = await getPlaceDetails(r.placeId);
    if (detail) {
      leads.push(detail);
      // Respect rate limits
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  console.log(`✅ ${leads.length} leads with full details.\n`);

  // Always print to console
  printLeads(leads);

  // Write to Sheets if configured
  await writeToSheets(leads);

  // Save CSV backup
  const timestamp = new Date().toISOString().slice(0, 10);
  const safeName = location.replace(/[^a-zA-Z0-9]/g, '-');
  const header = 'Name,Phone,Address,Website,Rating,Reviews,Status';
  const rows = leads.map(l =>
    [l.name, l.phone, `"${l.address}"`, l.website, l.rating, l.reviews, l.status].join(',')
  );
  const csvPath = `leads-${safeName}-${timestamp}.csv`;
  writeFileSync(csvPath, [header, ...rows].join('\n'));
  console.log(`\n📄 CSV saved: ${csvPath}`);
}

main().catch(err => {
  console.error('💀 Scraper failed:', err.message);
  process.exit(1);
});
