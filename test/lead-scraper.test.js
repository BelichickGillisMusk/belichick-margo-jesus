import test from 'node:test';
import assert from 'node:assert/strict';
import {
  csvEscape,
  buildCsv,
  buildCompanyResearchCsv,
  chooseBestEmail,
  extractEmailsFromText,
  parseCliArgs,
  parseCompanyList,
} from '../src/lead-scraper/index.js';

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
  assert.deepEqual(parseCliArgs([]), { mode: 'search', query: 'trucking companies', location: 'Chicago IL' });
  assert.deepEqual(parseCliArgs(['diesel', 'Sacramento CA']), { mode: 'search', query: 'diesel', location: 'Sacramento CA' });
});

test('parseCliArgs supports company list modes', () => {
  assert.deepEqual(parseCliArgs(['--companies-text', '1. Alpha', 'California']), {
    mode: 'company-list',
    companiesText: '1. Alpha',
    location: 'California',
  });
});

test('parseCompanyList preserves numbered input', () => {
  assert.deepEqual(parseCompanyList('1. Alpha Freight\n2) Beta Logistics\nGamma Hauling'), [
    { itemNumber: 1, companyName: 'Alpha Freight' },
    { itemNumber: 2, companyName: 'Beta Logistics' },
    { itemNumber: 3, companyName: 'Gamma Hauling' },
  ]);
});

test('extractEmailsFromText returns normalized public emails', () => {
  const html = 'Contact fleet@acme.com or INFO@acme.com. Ignore person@hunter.io.';
  assert.deepEqual(extractEmailsFromText(html), ['fleet@acme.com', 'info@acme.com']);
});

test('chooseBestEmail prefers operational contacts over generic inboxes', () => {
  assert.equal(chooseBestEmail(['info@acme.com', 'dispatch@acme.com', 'ceo@acme.com']), 'dispatch@acme.com');
  assert.equal(chooseBestEmail([]), 'UNKNOWN');
});

test('buildCompanyResearchCsv returns new contact columns', () => {
  const csv = buildCompanyResearchCsv([{
    itemNumber: 1,
    companyName: 'Acme',
    matchedName: 'Acme Transport',
    phone: '',
    address: 'Addr',
    website: 'https://acme.com',
    bestEmail: 'dispatch@acme.com',
    allEmails: ['dispatch@acme.com'],
    recommendedTargets: ['Fleet Manager', 'COO', 'CEO'],
    sourceNotes: 'https://acme.com/contact => dispatch@acme.com',
    confidence: 'high',
  }]);

  assert.match(csv, /^Item,Company,Matched Place,Phone,Address,Website,Best Email,All Emails,Recommended Targets,Source Notes,Confidence/m);
  assert.match(csv, /"dispatch@acme\.com"/);
});
