// Pure functions for reconciling CARB test rows against Master CRM + invoice
// exports. Match key is (normalized VIN) + (test date within ±windowDays).
// No filesystem, no I/O — safe to unit-test.

export const DEFAULT_INVOICE_WINDOW_DAYS = 14;
export const DEFAULT_CRM_WINDOW_DAYS = 45;

export function normalizeVin(raw) {
  if (raw === null || raw === undefined) return '';
  return String(raw).toUpperCase().replace(/[^A-Z0-9]/g, '');
}

const DATE_FORMATS = [
  // 08/14/2026 03:42:04 PM
  /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i,
  // 08/14/2026 15:42:04
  /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})$/,
  // 08/14/2026
  /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
  // 2026-08-14T15:42:04(Z|±HH:MM)?
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/,
  // 2026-08-14
  /^(\d{4})-(\d{2})-(\d{2})$/,
];

export function parseDate(value) {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  const raw = String(value).trim();
  for (const format of DATE_FORMATS) {
    const match = raw.match(format);
    if (!match) continue;

    if (format === DATE_FORMATS[0]) {
      const [, mo, d, y, hh, mm, ss, ampm] = match;
      let hour = Number(hh);
      if (/pm/i.test(ampm) && hour < 12) hour += 12;
      if (/am/i.test(ampm) && hour === 12) hour = 0;
      return new Date(Number(y), Number(mo) - 1, Number(d), hour, Number(mm), Number(ss));
    }
    if (format === DATE_FORMATS[1]) {
      const [, mo, d, y, hh, mm, ss] = match;
      return new Date(Number(y), Number(mo) - 1, Number(d), Number(hh), Number(mm), Number(ss));
    }
    if (format === DATE_FORMATS[2]) {
      const [, mo, d, y] = match;
      return new Date(Number(y), Number(mo) - 1, Number(d));
    }
    if (format === DATE_FORMATS[3]) {
      return new Date(raw);
    }
    if (format === DATE_FORMATS[4]) {
      const [, y, mo, d] = match;
      return new Date(Number(y), Number(mo) - 1, Number(d));
    }
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

export function daysBetween(a, b) {
  if (!a || !b) return Infinity;
  return Math.abs(a.getTime() - b.getTime()) / (1000 * 60 * 60 * 24);
}

// Build an index of records by normalized VIN → array of {vin, date, record}
export function indexByVin(records, { vinField, dateField }) {
  const index = new Map();
  for (const record of records) {
    const vin = normalizeVin(record[vinField]);
    if (!vin) continue;
    const date = parseDate(record[dateField]);
    const bucket = index.get(vin) || [];
    bucket.push({ vin, date, record });
    index.set(vin, bucket);
  }
  return index;
}

// Pick the CRM/invoice record whose date is closest to the test date and
// within the window. Returns null if no candidate qualifies.
export function pickBestMatch(candidates, testDate, windowDays) {
  if (!candidates || candidates.length === 0) return null;

  let best = null;
  let bestDelta = Infinity;

  for (const candidate of candidates) {
    if (!candidate.date) {
      // If the candidate has no parseable date, keep it as a weak fallback
      // only when no dated candidate qualifies.
      if (!best) best = { ...candidate, deltaDays: null, dateMatch: false };
      continue;
    }
    const delta = daysBetween(candidate.date, testDate);
    if (delta <= windowDays && delta < bestDelta) {
      bestDelta = delta;
      best = { ...candidate, deltaDays: delta, dateMatch: true };
    }
  }

  return best;
}

export function reconcile({
  tests,
  crm = [],
  invoices = [],
  crmVinField = 'VIN',
  crmDateField = 'Date',
  invoiceVinField = 'VIN',
  invoiceDateField = 'Date',
  testVinField = 'vin',
  testDateField = 'testDate',
  invoiceWindowDays = DEFAULT_INVOICE_WINDOW_DAYS,
  crmWindowDays = DEFAULT_CRM_WINDOW_DAYS,
} = {}) {
  const crmIndex = indexByVin(crm, { vinField: crmVinField, dateField: crmDateField });
  const invoiceIndex = indexByVin(invoices, { vinField: invoiceVinField, dateField: invoiceDateField });

  const rows = tests.map(test => {
    const vin = normalizeVin(test[testVinField]);
    const testDate = parseDate(test[testDateField]);

    if (!vin || !testDate) {
      return {
        test,
        vin,
        testDate,
        crmMatch: null,
        invoiceMatch: null,
        status: 'BAD_KEY',
        full: false,
      };
    }

    const crmCandidates = crmIndex.get(vin);
    const invoiceCandidates = invoiceIndex.get(vin);

    const crmMatch = pickBestMatch(crmCandidates, testDate, crmWindowDays);
    const invoiceMatch = pickBestMatch(invoiceCandidates, testDate, invoiceWindowDays);

    let status;
    let full = false;
    if (crmMatch && crmMatch.dateMatch && invoiceMatch && invoiceMatch.dateMatch) {
      status = 'FULL';
      full = true;
    } else if (crmMatch?.dateMatch || invoiceMatch?.dateMatch) {
      status = 'PARTIAL';
    } else if (crmCandidates || invoiceCandidates) {
      status = 'VIN_ONLY';
    } else {
      status = 'UNMATCHED';
    }

    return { test, vin, testDate, crmMatch, invoiceMatch, status, full };
  });

  const totals = rows.reduce(
    (acc, row) => {
      acc.total += 1;
      acc[row.status] = (acc[row.status] || 0) + 1;
      if (row.full) acc.full += 1;
      return acc;
    },
    { total: 0, full: 0 }
  );

  totals.fullPct = totals.total ? (totals.full / totals.total) * 100 : 0;

  return { rows, totals };
}
