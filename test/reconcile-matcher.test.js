import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeVin,
  parseDate,
  daysBetween,
  pickBestMatch,
  reconcile,
} from '../src/reconcile/matcher.js';

test('normalizeVin strips whitespace, punctuation, and uppercases', () => {
  assert.equal(normalizeVin(' 1fujgedv4dLff0462 '), '1FUJGEDV4DLFF0462');
  assert.equal(normalizeVin('1FU-JGE_DV4DLFF 0462'), '1FUJGEDV4DLFF0462');
  assert.equal(normalizeVin(null), '');
  assert.equal(normalizeVin(undefined), '');
  assert.equal(normalizeVin(12345), '12345');
});

test('parseDate handles CARB export formats', () => {
  assert.deepEqual(parseDate('08/14/2026 03:42:04 PM'), new Date(2026, 7, 14, 15, 42, 4));
  assert.deepEqual(parseDate(' 07/31/2026 '), new Date(2026, 6, 31));
  assert.deepEqual(parseDate('2026-08-14'), new Date(2026, 7, 14));
  assert.equal(parseDate(''), null);
  assert.equal(parseDate(null), null);
  assert.equal(parseDate('nonsense-2026-glorp'), null);
});

test('parseDate accepts Date instances and ISO strings', () => {
  const iso = '2026-08-14T15:42:04.000Z';
  const parsed = parseDate(iso);
  assert.ok(parsed instanceof Date);
  assert.equal(parsed.toISOString(), iso);
});

test('daysBetween returns absolute distance in days', () => {
  const a = new Date('2026-08-14');
  const b = new Date('2026-08-17');
  assert.equal(daysBetween(a, b), 3);
  assert.equal(daysBetween(b, a), 3);
  assert.equal(daysBetween(null, b), Infinity);
});

test('pickBestMatch picks the closest in-window candidate', () => {
  const testDate = new Date('2026-08-14');
  const candidates = [
    { vin: 'A', date: new Date('2026-07-01'), record: { id: 'far' } },
    { vin: 'A', date: new Date('2026-08-10'), record: { id: 'close' } },
    { vin: 'A', date: new Date('2026-08-13'), record: { id: 'closest' } },
    { vin: 'A', date: new Date('2026-09-05'), record: { id: 'future-far' } },
  ];
  const match = pickBestMatch(candidates, testDate, 14);
  assert.equal(match.record.id, 'closest');
  assert.equal(match.dateMatch, true);
  assert.ok(match.deltaDays <= 1);
});

test('pickBestMatch returns null when nothing is inside the window', () => {
  const testDate = new Date('2026-08-14');
  const candidates = [
    { vin: 'A', date: new Date('2026-01-01'), record: { id: 'january' } },
  ];
  const match = pickBestMatch(candidates, testDate, 14);
  assert.equal(match, null);
});

test('reconcile marks a row FULL only when BOTH CRM and invoice match on VIN+date', () => {
  const tests = [
    { vin: '1FUJGEDV4DLFF0462', testDate: '2026-08-14' },
    { vin: '3HAMMAAL9CL598306', testDate: '2026-08-14' },
    { vin: 'INVOICE-BUT-NO-CRM', testDate: '2026-08-14' },
    { vin: 'CRM-BUT-NO-INVOICE', testDate: '2026-08-14' },
    { vin: 'VIN-MATCH-BUT-STALE-DATE', testDate: '2026-08-14' },
  ];
  const crm = [
    { VIN: '1FUJGEDV4DLFF0462', Date: '2026-08-10', Customer: 'Fleet Alpha' },
    { VIN: '3HAMMAAL9CL598306', Date: '2026-08-13', Customer: 'Fleet Bravo' },
    { VIN: 'CRM-BUT-NO-INVOICE', Date: '2026-08-14', Customer: 'Fleet Charlie' },
    { VIN: 'VIN-MATCH-BUT-STALE-DATE', Date: '2025-01-01', Customer: 'Fleet Delta' },
  ];
  const invoices = [
    { VIN: '1FUJGEDV4DLFF0462', Date: '2026-08-14', Amount: 179 },
    { VIN: '3HAMMAAL9CL598306', Date: '2026-08-15', Amount: 179 },
    { VIN: 'INVOICE-BUT-NO-CRM', Date: '2026-08-14', Amount: 199 },
    { VIN: 'VIN-MATCH-BUT-STALE-DATE', Date: '2025-01-05', Amount: 75 },
  ];

  const { rows, totals } = reconcile({ tests, crm, invoices });

  assert.equal(rows[0].status, 'FULL');
  assert.equal(rows[0].full, true);
  assert.equal(rows[1].status, 'FULL');
  assert.equal(rows[2].status, 'PARTIAL');
  assert.equal(rows[3].status, 'PARTIAL');
  assert.equal(rows[4].status, 'VIN_ONLY');

  assert.equal(totals.total, 5);
  assert.equal(totals.full, 2);
  assert.equal(Math.round(totals.fullPct), 40);
});

test('reconcile flags rows with missing VIN or date as BAD_KEY', () => {
  const { rows, totals } = reconcile({
    tests: [{ vin: '', testDate: '2026-08-14' }, { vin: 'ABC', testDate: '' }],
    crm: [],
    invoices: [],
  });
  assert.equal(rows[0].status, 'BAD_KEY');
  assert.equal(rows[1].status, 'BAD_KEY');
  assert.equal(totals.full, 0);
});

test('reconcile keeps VIN-only matches distinct from UNMATCHED', () => {
  const { rows } = reconcile({
    tests: [{ vin: 'V1', testDate: '2026-08-14' }],
    crm: [{ VIN: 'V1', Date: '2020-01-01', Customer: 'ancient' }],
    invoices: [],
  });
  assert.equal(rows[0].status, 'VIN_ONLY');
});
