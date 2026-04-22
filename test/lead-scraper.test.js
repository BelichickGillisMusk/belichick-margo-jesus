import test from 'node:test';
import assert from 'node:assert/strict';
import { csvEscape, buildCsv, parseCliArgs } from '../src/lead-scraper/index.js';

test('csvEscape quotes commas and quotes safely', () => {
  assert.equal(csvEscape('ACME, Inc.'), '"ACME, Inc."');
  assert.equal(csvEscape('Bob "The Rig"'), '"Bob ""The Rig"""');
});

test('buildCsv returns header plus rows', () => {
  const csv = buildCsv([{ name: 'A', phone: '', address: 'Addr', website: '', rating: 'N/A', reviews: 0, status: 'OK' }]);
  assert.match(csv, /^Name,Phone,Address,Website,Rating,Reviews,Status/m);
  assert.match(csv, /"A"/);
});

test('parseCliArgs applies defaults', () => {
  assert.deepEqual(parseCliArgs([]), { query: 'trucking companies', location: 'Chicago IL' });
  assert.deepEqual(parseCliArgs(['diesel', 'Sacramento CA']), { query: 'diesel', location: 'Sacramento CA' });
});
