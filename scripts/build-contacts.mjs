#!/usr/bin/env node
// Build an iPad/Android-importable contacts folder, grouped by the ISO
// week each customer was tested.
//
// Inputs (any combination — missing files are skipped):
//   reports/inputs/tests.xlsx          CARB CTC-VIS export
//   reports/inputs/sms-leads.csv       INCOMING-SMS-LEADS
//   reports/inputs/stripe.csv          Stripe payments+payouts (File → Download CSV)
//   reports/inputs/invoices.csv        CLIENTS INVOICE SIMPLE (File → Download CSV)
//   reports/inputs/squarespace.csv     Squarespace orders (File → Download CSV)
//   reports/inputs/crm.csv             Master CRM export
//
// Outputs (gitignored except README):
//   contacts/all.vcf                   every NAP+email contact, one file
//   contacts/all-google.csv            Google Contacts / Android import
//   contacts/weeks/YYYY-Www.vcf        one vCard per test-week
//   contacts/weeks/YYYY-Www.csv        same week as Google CSV
//   contacts/call-sheet-by-week.csv    every test row (VIN/plate/date) even without NAP
//   contacts/SUMMARY.md                week-by-week counts

import { mkdir, readFile, writeFile, stat, copyFile } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import * as XLSX from 'xlsx';
import {
  normalizePhone,
  normalizeEmail,
  weekKey,
  weekLabel,
  toVcard,
  toGoogleCsvRow,
  mergeContacts,
  pickField,
  contactUid,
  fileSafeName,
  GOOGLE_CSV_COLUMNS,
} from '../src/contacts/index.js';
import { parseDate, normalizeVin } from '../src/reconcile/matcher.js';

const CWD = process.cwd();
const OUT_DIR = process.env.CONTACTS_DIR || 'contacts';
const GUMPTION_URL = process.env.GUMPTION_BASE_URL || process.env.GUMPTION_PUBLIC_URL || 'https://gumption.co';
const INPUTS = {
  tests: process.env.TESTS_FILE || 'reports/inputs/tests.xlsx',
  sms: process.env.SMS_FILE || 'reports/inputs/sms-leads.csv',
  stripe: process.env.STRIPE_FILE || 'reports/inputs/stripe.csv',
  invoices: process.env.INVOICES_FILE || 'reports/inputs/invoices.csv',
  squarespace: process.env.SQUARESPACE_FILE || 'reports/inputs/squarespace.csv',
  crm: process.env.CRM_FILE || 'reports/inputs/crm.csv',
};

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function loadSheet(path) {
  const abs = resolve(CWD, path);
  if (!(await exists(abs))) return null;
  const buffer = await readFile(abs);
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, raw: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

function contactFromSms(row) {
  const company = pickField(row, 'company', 'name', 'business');
  const phone = normalizePhone(pickField(row, 'phone', 'mobile', 'cell'));
  const address = pickField(row, 'location', 'address', 'street');
  const date = parseDate(pickField(row, 'date', 'test date', 'created'));
  return {
    name: company,
    org: company,
    phone,
    email: '',
    address,
    testDate: date ? date.toISOString().slice(0, 10) : '',
    weekKey: date ? weekKey(date) : '',
    weekLabel: date ? weekLabel(weekKey(date)) : '',
    source: 'SMS lead',
  };
}

function contactFromStripe(row) {
  const name = pickField(row, 'Customer Name', 'Customer', 'Card Name', 'Description', 'Name');
  const email = normalizeEmail(pickField(row, 'Customer Email', 'Email', 'Receipt Email'));
  const phone = normalizePhone(pickField(row, 'Customer Phone', 'Phone', 'Phone Number'));
  const date = parseDate(pickField(row, 'Created (UTC)', 'Created', 'Date', 'Arrival Date'));
  const address = [pickField(row, 'Billing Address', 'Address'), pickField(row, 'City'), pickField(row, 'State'), pickField(row, 'Postal Code')]
    .filter(Boolean)
    .join(', ');
  return {
    name,
    org: name,
    phone,
    email,
    address,
    testDate: date ? date.toISOString().slice(0, 10) : '',
    weekKey: date ? weekKey(date) : '',
    weekLabel: date ? weekLabel(weekKey(date)) : '',
    source: 'Stripe',
  };
}

function contactFromInvoice(row) {
  const name = pickField(row, 'Customer', 'Client', 'Name', 'Company', 'Bill To');
  const email = normalizeEmail(pickField(row, 'Email', 'Customer Email'));
  const phone = normalizePhone(pickField(row, 'Phone', 'Mobile', 'Telephone'));
  const address = pickField(row, 'Address', 'Billing Address', 'Location');
  const vin = normalizeVin(pickField(row, 'VIN', 'User VIN', 'eVIN'));
  const date = parseDate(pickField(row, 'Invoice Date', 'Date', 'Service Date', 'Test Date'));
  return {
    name,
    org: name,
    phone,
    email,
    address,
    vin,
    testDate: date ? date.toISOString().slice(0, 10) : '',
    weekKey: date ? weekKey(date) : '',
    weekLabel: date ? weekLabel(weekKey(date)) : '',
    source: 'Invoice',
  };
}

function contactFromSquarespace(row) {
  const name = pickField(row, 'Billing Name', 'Customer Name', 'Name', 'Shipping Name');
  const email = normalizeEmail(pickField(row, 'Email', 'Customer Email'));
  const phone = normalizePhone(pickField(row, 'Phone', 'Billing Phone', 'Shipping Phone'));
  const address = [
    pickField(row, 'Billing Address 1', 'Address 1', 'Shipping Address 1'),
    pickField(row, 'Billing City', 'City'),
    pickField(row, 'Billing State', 'State'),
    pickField(row, 'Billing Zip', 'Zip', 'Postal Code'),
  ].filter(Boolean).join(', ');
  const date = parseDate(pickField(row, 'Fulfilled On', 'Paid On', 'Submitted On', 'Date'));
  return {
    name,
    org: name,
    phone,
    email,
    address,
    testDate: date ? date.toISOString().slice(0, 10) : '',
    weekKey: date ? weekKey(date) : '',
    weekLabel: date ? weekLabel(weekKey(date)) : '',
    source: 'Squarespace',
  };
}

function contactFromCrm(row) {
  const name = pickField(row, 'Customer', 'Company', 'Name', 'Fleet', 'Business');
  const email = normalizeEmail(pickField(row, 'Email', 'Contact Email'));
  const phone = normalizePhone(pickField(row, 'Phone', 'Mobile', 'Cell'));
  const address = pickField(row, 'Address', 'Location', 'Yard');
  const vin = normalizeVin(pickField(row, 'VIN', 'User VIN'));
  const date = parseDate(pickField(row, 'Test Date', 'Last Test', 'Date', 'Service Date'));
  return {
    name,
    org: name,
    phone,
    email,
    address,
    vin,
    testDate: date ? date.toISOString().slice(0, 10) : '',
    weekKey: date ? weekKey(date) : '',
    weekLabel: date ? weekLabel(weekKey(date)) : '',
    source: 'CRM',
  };
}

function testRow(row) {
  const vin = normalizeVin(pickField(row, 'User VIN', 'eVIN', 'VIN'));
  const plate = pickField(row, 'License Plate', 'Plate');
  const testType = pickField(row, 'Test Type');
  const testResult = pickField(row, 'Test Result', 'Result');
  const date = parseDate(pickField(row, 'Test Date/Time', 'Test Date'));
  return {
    vin,
    plate,
    testType,
    testResult,
    testDate: date ? date.toISOString().slice(0, 10) : '',
    weekKey: date ? weekKey(date) : 'unknown',
    weekLabel: date ? weekLabel(weekKey(date)) : 'unknown',
  };
}

function csvEscape(value) {
  const raw = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

function toCsv(rows, columns) {
  const header = columns.join(',');
  const body = rows.map(row => columns.map(col => csvEscape(row[col] ?? '')).join(','));
  return [header, ...body].join('\n');
}

function hasNap(contact) {
  return Boolean(contact.phone || contact.email);
}

async function main() {
  console.log('[contacts] building week-grouped NAP+email cards');

  const loaded = {};
  for (const [key, path] of Object.entries(INPUTS)) {
    loaded[key] = await loadSheet(path);
    console.log(`[contacts] ${key}: ${loaded[key] ? `${loaded[key].length} rows from ${basename(path)}` : `MISSING (${path})`}`);
  }

  const rawContacts = [];
  if (loaded.sms) rawContacts.push(...loaded.sms.map(contactFromSms));
  if (loaded.stripe) rawContacts.push(...loaded.stripe.map(contactFromStripe));
  if (loaded.invoices) rawContacts.push(...loaded.invoices.map(contactFromInvoice));
  if (loaded.squarespace) rawContacts.push(...loaded.squarespace.map(contactFromSquarespace));
  if (loaded.crm) rawContacts.push(...loaded.crm.map(contactFromCrm));

  const tests = (loaded.tests || []).map(testRow).filter(t => t.vin && t.testDate);

  // Attach the most recent test week onto any contact that shares a VIN.
  const testsByVin = new Map();
  for (const test of tests) {
    const bucket = testsByVin.get(test.vin) || [];
    bucket.push(test);
    testsByVin.set(test.vin, bucket);
  }
  for (const contact of rawContacts) {
    if (!contact.vin) continue;
    const hits = testsByVin.get(contact.vin);
    if (!hits?.length) continue;
    const latest = hits.slice().sort((a, b) => b.testDate.localeCompare(a.testDate))[0];
    contact.testDate = contact.testDate || latest.testDate;
    contact.weekKey = contact.weekKey || latest.weekKey;
    contact.weekLabel = contact.weekLabel || latest.weekLabel;
    contact.plate = contact.plate || latest.plate;
    contact.testType = contact.testType || latest.testType;
    contact.testResult = contact.testResult || latest.testResult;
  }

  const merged = mergeContacts(rawContacts.filter(c => c.name || c.phone || c.email));
  const callable = merged.filter(hasNap).map(contact => ({ ...contact, uid: contactUid(contact) }));
  const nameless = merged.filter(c => !hasNap(c));

  await mkdir(join(OUT_DIR, 'weeks'), { recursive: true });
  await mkdir(join(OUT_DIR, 'import-ipad'), { recursive: true });
  await mkdir(join(OUT_DIR, 'import-android', 'one-each'), { recursive: true });

  // Blank line between cards. Some Android OEMs treat a glued multi-card
  // file as ONE contact (the 500-numbers bug).
  const allVcf = callable.map(toVcard).join('\r\n\r\n') + '\r\n';
  await writeFile(join(OUT_DIR, 'all.vcf'), allVcf, 'utf8');
  await writeFile(join(OUT_DIR, 'import-ipad', 'all.vcf'), allVcf, 'utf8');

  const googleRows = callable.map(toGoogleCsvRow);
  const googleCsv = toCsv(googleRows, GOOGLE_CSV_COLUMNS);
  await writeFile(join(OUT_DIR, 'all-google.csv'), googleCsv, 'utf8');
  await writeFile(join(OUT_DIR, 'import-android', 'all-google.csv'), googleCsv, 'utf8');

  for (const contact of callable) {
    const safe = fileSafeName(contact);
    await writeFile(join(OUT_DIR, 'import-android', 'one-each', `${safe}.vcf`), `${toVcard(contact)}\r\n`, 'utf8');
  }

  const byWeek = new Map();
  for (const contact of callable) {
    const key = contact.weekKey || 'unscheduled';
    const bucket = byWeek.get(key) || [];
    bucket.push(contact);
    byWeek.set(key, bucket);
  }
  for (const test of tests) {
    const bucket = byWeek.get(test.weekKey) || [];
    byWeek.set(test.weekKey, bucket);
  }

  const weekKeys = [...byWeek.keys()].sort();
  for (const key of weekKeys) {
    const people = (byWeek.get(key) || []).filter(hasNap);
    if (!people.length) continue;
    const vcf = people.map(toVcard).join('\r\n\r\n') + '\r\n';
    const csv = toCsv(people.map(toGoogleCsvRow), GOOGLE_CSV_COLUMNS);
    const safe = key.replace(/[^\w.-]/g, '_');
    await writeFile(join(OUT_DIR, 'weeks', `${safe}.vcf`), vcf, 'utf8');
    await writeFile(join(OUT_DIR, 'weeks', `${safe}.csv`), csv, 'utf8');
    await writeFile(join(OUT_DIR, 'import-ipad', `${safe}.vcf`), vcf, 'utf8');
    await writeFile(join(OUT_DIR, 'import-android', `${safe}.csv`), csv, 'utf8');
  }

  const callSheet = tests.map(t => ({
    Week: t.weekLabel,
    'Test Date': t.testDate,
    VIN: t.vin,
    Plate: t.plate,
    Type: t.testType,
    Result: t.testResult,
  }));
  await writeFile(
    join(OUT_DIR, 'call-sheet-by-week.csv'),
    toCsv(callSheet, ['Week', 'Test Date', 'VIN', 'Plate', 'Type', 'Result']),
    'utf8',
  );

  const testWeeks = new Map();
  for (const test of tests) {
    const entry = testWeeks.get(test.weekKey) || { tests: 0, vins: new Set() };
    entry.tests += 1;
    entry.vins.add(test.vin);
    testWeeks.set(test.weekKey, entry);
  }

  const summaryLines = [
    `# Contacts export — ${new Date().toISOString().slice(0, 10)}`,
    ``,
    `**Gumption:** [${GUMPTION_URL}](${GUMPTION_URL})`,
    `**Callable contacts (phone or email):** ${callable.length}`,
    `**Records with a name but no phone/email:** ${nameless.length}`,
    `**Test rows on the week call-sheet:** ${tests.length}`,
    ``,
    `## Sources loaded`,
    ``,
    ...Object.entries(INPUTS).map(([key, path]) =>
      `- ${key}: ${loaded[key] ? `${loaded[key].length} rows` : `_missing — drop a CSV at \`${path}\`_`}`
    ),
    ``,
    `## Test volume by week (do one week's calls in one sitting)`,
    ``,
    `| Week | Tests | Unique VINs | Contacts with NAP |`,
    `|---|---:|---:|---:|`,
    ...[...testWeeks.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([key, entry]) => {
      const nap = (byWeek.get(key) || []).filter(hasNap).length;
      return `| ${weekLabel(key)} | ${entry.tests} | ${entry.vins.size} | ${nap} |`;
    }),
    ``,
    `## How to get the rest of the names`,
    ``,
    `The three Google files you dropped were Drive *shortcuts* (184 bytes each), not the actual sheets.`,
    `On a laptop: open each file → **File → Download → Comma-separated values (.csv)** → drop here:`,
    ``,
    `- \`NCM-STRIPE — SS NorCal\` → \`reports/inputs/stripe.csv\``,
    `- \`CLIENTS INVOICE SIMPLE\` → \`reports/inputs/invoices.csv\``,
    `- \`Squarespace orders\` → \`reports/inputs/squarespace.csv\``,
    `- Master CRM → \`reports/inputs/crm.csv\``,
    ``,
    `Then re-run \`npm run contacts\`. New rows merge on phone/email; week tags come from the test date.`,
  ];
  await writeFile(join(OUT_DIR, 'SUMMARY.md'), summaryLines.join('\n'), 'utf8');
  await writeFile(join(OUT_DIR, 'GUMPTION.url'), `[InternetShortcut]\nURL=${GUMPTION_URL}\n`, 'utf8');
  await writeFile(join(OUT_DIR, 'import-android', 'GUMPTION.url'), `[InternetShortcut]\nURL=${GUMPTION_URL}\n`, 'utf8');
  await writeFile(join(OUT_DIR, 'import-ipad', 'GUMPTION.url'), `[InternetShortcut]\nURL=${GUMPTION_URL}\n`, 'utf8');

  // Keep a copy of the README next to the import folders so it travels with AirDrop.
  if (await exists(join(OUT_DIR, 'README.md'))) {
    await copyFile(join(OUT_DIR, 'README.md'), join(OUT_DIR, 'import-ipad', 'HOW-TO-IMPORT.txt')).catch(() => {});
  }

  console.log(`\n[contacts] callable: ${callable.length}  nameless: ${nameless.length}  tests: ${tests.length}`);
  console.log(`[contacts] wrote ${OUT_DIR}/all.vcf`);
  console.log(`[contacts] wrote ${OUT_DIR}/all-google.csv`);
  console.log(`[contacts] wrote ${OUT_DIR}/weeks/ (${weekKeys.filter(k => (byWeek.get(k) || []).some(hasNap)).length} week files with NAP)`);
  console.log(`[contacts] wrote ${OUT_DIR}/call-sheet-by-week.csv`);
  console.log(`[contacts] wrote ${OUT_DIR}/SUMMARY.md`);
}

main().catch(error => {
  console.error(`[contacts] failed: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
