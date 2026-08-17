#!/usr/bin/env node
// Reconciliation runner:
//   1) Load CARB test export (xlsx or csv)
//   2) Load Master CRM export (csv or xlsx)
//   3) Load Invoice export (csv or xlsx)
//   4) Match by (VIN + date-within-window). VIN alone is not sufficient
//      because most vehicles are tested more than once per year.
//   5) Write reconciliation-YYYY-MM-DD.csv + summary-YYYY-MM-DD.md
//   6) Exit code 0 always; a big banner prints once >=70% of test rows
//      have BOTH a CRM match and an invoice match ("FULL").
//
// Env / paths:
//   TESTS_FILE     default: reports/inputs/tests.xlsx
//   CRM_FILE       default: reports/inputs/crm.csv
//   INVOICES_FILE  default: reports/inputs/invoices.csv
//   OUT_DIR        default: reports/outputs
//   FULL_THRESHOLD default: 70 (percent)
//   INVOICE_WINDOW_DAYS   default: 14
//   CRM_WINDOW_DAYS       default: 45

import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { basename, extname, join, resolve } from 'node:path';
import * as XLSX from 'xlsx';
import {
  reconcile,
  DEFAULT_INVOICE_WINDOW_DAYS,
  DEFAULT_CRM_WINDOW_DAYS,
} from '../src/reconcile/matcher.js';

const CWD = process.cwd();
const TESTS_FILE = process.env.TESTS_FILE || 'reports/inputs/tests.xlsx';
const CRM_FILE = process.env.CRM_FILE || 'reports/inputs/crm.csv';
const INVOICES_FILE = process.env.INVOICES_FILE || 'reports/inputs/invoices.csv';
const OUT_DIR = process.env.OUT_DIR || 'reports/outputs';
const FULL_THRESHOLD = Number(process.env.FULL_THRESHOLD || 70);
const INVOICE_WINDOW_DAYS = Number(process.env.INVOICE_WINDOW_DAYS || DEFAULT_INVOICE_WINDOW_DAYS);
const CRM_WINDOW_DAYS = Number(process.env.CRM_WINDOW_DAYS || DEFAULT_CRM_WINDOW_DAYS);

function fileExists(path) {
  return stat(path).then(() => true).catch(() => false);
}

async function loadSheet(path) {
  const abs = resolve(CWD, path);
  const exists = await fileExists(abs);
  if (!exists) return null;

  const buffer = await readFile(abs);
  const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true, raw: false });
  const [sheetName] = workbook.SheetNames;
  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

function normalizeKey(name) {
  return String(name).toLowerCase().replace(/[\s_/-]/g, '');
}

// Try each candidate header in order. Skip empty values so we can fall
// through to a backup column (e.g. User VIN → eVIN).
function pickField(row, ...candidates) {
  const keys = Object.keys(row);
  for (const candidate of candidates) {
    const target = normalizeKey(candidate);
    const matchKey = keys.find(key => normalizeKey(key) === target);
    if (matchKey === undefined) continue;
    const value = row[matchKey];
    const empty = value === null || value === undefined || String(value).trim() === '';
    if (!empty) return value;
  }
  return '';
}

// Normalize the CARB export headers (they carry lots of whitespace).
function normalizeTestRow(row) {
  return {
    testId: pickField(row, 'Test ID', 'TestID'),
    vin: pickField(row, 'User VIN', 'UserVIN', 'eVIN', 'VIN'),
    evin: pickField(row, 'eVIN'),
    userVin: pickField(row, 'User VIN', 'UserVIN'),
    licensePlate: pickField(row, 'License Plate', 'LicensePlate'),
    testType: pickField(row, 'Test Type', 'TestType'),
    testResult: pickField(row, 'Test Result', 'Result'),
    testerId: pickField(row, 'Tester ID', 'TesterID'),
    testDate: pickField(row, 'Test Date/Time', 'Test Date', 'TestDate'),
    receivedDate: pickField(row, 'Received Date/Time', 'Received Date'),
  };
}

function toCsvCell(value) {
  if (value === null || value === undefined) return '';
  const raw = value instanceof Date ? value.toISOString() : String(value);
  if (/[",\n]/.test(raw)) {
    return `"${raw.replace(/"/g, '""')}"`;
  }
  return raw;
}

function rowsToCsv(rows, columns) {
  const header = columns.map(c => c.label).join(',');
  const body = rows.map(row =>
    columns.map(c => toCsvCell(typeof c.value === 'function' ? c.value(row) : row[c.value])).join(',')
  );
  return [header, ...body].join('\n');
}

function formatBanner(text, char = '=') {
  const bar = char.repeat(Math.max(80, text.length + 8));
  return `${bar}\n${char}${char}${char}  ${text}\n${bar}`;
}

async function main() {
  console.log(`[reconcile] cwd=${CWD}`);
  console.log(`[reconcile] tests=${TESTS_FILE}`);
  console.log(`[reconcile] crm=${CRM_FILE}`);
  console.log(`[reconcile] invoices=${INVOICES_FILE}`);
  console.log(`[reconcile] windows: invoice=±${INVOICE_WINDOW_DAYS}d  crm=±${CRM_WINDOW_DAYS}d`);
  console.log(`[reconcile] threshold: ${FULL_THRESHOLD}% full to fire banner`);

  const rawTests = await loadSheet(TESTS_FILE);
  if (!rawTests) {
    console.error(`\n❌ Tests file not found: ${TESTS_FILE}`);
    console.error(`   Drop the CARB CTC-VIS export at that path and re-run.`);
    process.exit(1);
  }

  const tests = rawTests.map(normalizeTestRow);
  const validTests = tests.filter(t => t.vin && t.testDate);
  console.log(`\n[reconcile] tests loaded: ${tests.length} rows (${validTests.length} with VIN+date)`);

  const rawCrm = await loadSheet(CRM_FILE);
  const rawInvoices = await loadSheet(INVOICES_FILE);

  if (!rawCrm) {
    console.warn(`⚠  CRM file not found: ${CRM_FILE} — every row will be UNMATCHED for CRM.`);
  } else {
    console.log(`[reconcile] CRM rows loaded: ${rawCrm.length}`);
  }
  if (!rawInvoices) {
    console.warn(`⚠  Invoice file not found: ${INVOICES_FILE} — every row will be UNMATCHED for invoice.`);
  } else {
    console.log(`[reconcile] invoice rows loaded: ${rawInvoices.length}`);
  }

  const crmVinKey = (rawCrm && Object.keys(rawCrm[0] || {}).find(k => /vin/i.test(k))) || 'VIN';
  const crmDateKey =
    (rawCrm && Object.keys(rawCrm[0] || {}).find(k => /(test.*date|date|scheduled)/i.test(k))) || 'Date';
  const invoiceVinKey =
    (rawInvoices && Object.keys(rawInvoices[0] || {}).find(k => /vin/i.test(k))) || 'VIN';
  const invoiceDateKey =
    (rawInvoices &&
      Object.keys(rawInvoices[0] || {}).find(k => /(invoice.*date|service.*date|date)/i.test(k))) ||
    'Date';

  if (rawCrm) console.log(`[reconcile] CRM mapping: vin="${crmVinKey}" date="${crmDateKey}"`);
  if (rawInvoices) console.log(`[reconcile] Invoice mapping: vin="${invoiceVinKey}" date="${invoiceDateKey}"`);

  const { rows, totals } = reconcile({
    tests,
    crm: rawCrm || [],
    invoices: rawInvoices || [],
    crmVinField: crmVinKey,
    crmDateField: crmDateKey,
    invoiceVinField: invoiceVinKey,
    invoiceDateField: invoiceDateKey,
    invoiceWindowDays: INVOICE_WINDOW_DAYS,
    crmWindowDays: CRM_WINDOW_DAYS,
  });

  const stamp = new Date().toISOString().slice(0, 10);
  await mkdir(OUT_DIR, { recursive: true });

  const csvColumns = [
    { label: 'Test ID', value: r => r.test.testId },
    { label: 'VIN', value: r => r.vin },
    { label: 'License Plate', value: r => r.test.licensePlate },
    { label: 'Test Type', value: r => r.test.testType },
    { label: 'Test Result', value: r => r.test.testResult },
    { label: 'Test Date', value: r => r.testDate?.toISOString() || r.test.testDate },
    { label: 'Status', value: r => r.status },
    { label: 'Full', value: r => (r.full ? 'YES' : 'no') },
    { label: 'CRM ΔDays', value: r => (r.crmMatch?.deltaDays == null ? '' : r.crmMatch.deltaDays.toFixed(1)) },
    { label: 'Invoice ΔDays', value: r => (r.invoiceMatch?.deltaDays == null ? '' : r.invoiceMatch.deltaDays.toFixed(1)) },
  ];
  const csvPath = join(OUT_DIR, `reconciliation-${stamp}.csv`);
  await writeFile(csvPath, rowsToCsv(rows, csvColumns), 'utf8');

  const statusCounts = ['FULL', 'PARTIAL', 'VIN_ONLY', 'UNMATCHED', 'BAD_KEY']
    .filter(s => totals[s])
    .map(s => `  ${s.padEnd(10)} ${totals[s]}  (${((totals[s] / totals.total) * 100).toFixed(1)}%)`);

  const summary = [
    `# Reconciliation Summary — ${stamp}`,
    ``,
    `**Tests file:** \`${basename(TESTS_FILE)}\` (${tests.length} rows, ${validTests.length} with valid VIN+date)`,
    `**CRM file:** ${rawCrm ? `\`${basename(CRM_FILE)}\` (${rawCrm.length} rows)` : '_not provided_'}`,
    `**Invoice file:** ${rawInvoices ? `\`${basename(INVOICES_FILE)}\` (${rawInvoices.length} rows)` : '_not provided_'}`,
    `**Match windows:** invoice ±${INVOICE_WINDOW_DAYS}d · CRM ±${CRM_WINDOW_DAYS}d`,
    ``,
    `## Result`,
    ``,
    `**Full rows (CRM + invoice both matched on VIN + date): ${totals.full} / ${totals.total} (${totals.fullPct.toFixed(1)}%)**`,
    ``,
    `\`\`\``,
    ...statusCounts,
    `\`\`\``,
    ``,
    `Per-row CSV: \`${basename(csvPath)}\``,
  ].join('\n');

  const summaryPath = join(OUT_DIR, `summary-${stamp}.md`);
  await writeFile(summaryPath, summary, 'utf8');

  console.log('\n[reconcile] status breakdown:');
  for (const line of statusCounts) console.log(line);
  console.log(`\n[reconcile] wrote: ${csvPath}`);
  console.log(`[reconcile] wrote: ${summaryPath}`);

  console.log('\n' + formatBanner(
    `RECONCILIATION: ${totals.full}/${totals.total} rows FULL (${totals.fullPct.toFixed(1)}%)`,
    totals.fullPct >= FULL_THRESHOLD ? '=' : '-'
  ));

  if (totals.fullPct >= FULL_THRESHOLD) {
    console.log('\n' + formatBanner(`🎯  THRESHOLD MET — ${totals.fullPct.toFixed(1)}% ≥ ${FULL_THRESHOLD}%`, '*'));
    console.log('\n(This is the “over 70% of rows are full” banner Bryan asked for.)');
  } else {
    const need = Math.ceil((FULL_THRESHOLD / 100) * totals.total) - totals.full;
    console.log(`\n[reconcile] ${need} more FULL rows needed to cross ${FULL_THRESHOLD}% (${totals.full}/${Math.ceil((FULL_THRESHOLD / 100) * totals.total)}).`);
    const missing = [];
    if (!rawCrm) missing.push(CRM_FILE);
    if (!rawInvoices) missing.push(INVOICES_FILE);
    if (missing.length) {
      console.log(`[reconcile] Missing input files: ${missing.join(', ')}`);
    }
  }
}

main().catch(error => {
  console.error(`[reconcile] failed: ${error.message}`);
  console.error(error.stack);
  process.exit(1);
});
