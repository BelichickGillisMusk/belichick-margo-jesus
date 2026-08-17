import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePhone,
  formatPhone,
  normalizeEmail,
  weekKey,
  weekLabel,
  toVcard,
  mergeContacts,
} from '../src/contacts/index.js';

test('normalizePhone strips formatting and leading 1', () => {
  assert.equal(normalizePhone('(209) 485-3200'), '2094853200');
  assert.equal(normalizePhone('+1 510-334-2146'), '5103342146');
  assert.equal(normalizePhone('9167180737'), '9167180737');
  assert.equal(normalizePhone(''), '');
  assert.equal(normalizePhone('123'), '');
});

test('formatPhone pretty-prints a 10-digit number', () => {
  assert.equal(formatPhone('2094853200'), '(209) 485-3200');
});

test('normalizeEmail lowercases and rejects junk', () => {
  assert.equal(normalizeEmail('Danny@APlusCTC.com'), 'danny@aplusctc.com');
  assert.equal(normalizeEmail('not-an-email'), '');
});

test('weekKey uses ISO weeks (Monday start)', () => {
  // Thursday Aug 14 2026 is ISO week 33
  assert.equal(weekKey(new Date(2026, 7, 14)), '2026-W33');
  // Monday Aug 10 2026 is the start of week 33
  assert.equal(weekKey(new Date(2026, 7, 10)), '2026-W33');
  // Sunday Aug 9 2026 is still week 32
  assert.equal(weekKey(new Date(2026, 7, 9)), '2026-W32');
});

test('weekLabel includes a human date range', () => {
  const label = weekLabel('2026-W33');
  assert.match(label, /2026-W33/);
  assert.match(label, /Aug/);
});

test('toVcard emits importable vCard 3.0 with week note', () => {
  const card = toVcard({
    name: 'Cal Roots LLC',
    org: 'Cal Roots LLC',
    phone: '2094853200',
    address: '4641 Gomes Rd.',
    weekKey: '2025-W50',
    weekLabel: '2025-W50 (Dec 8–14)',
    vin: '1FUJGEDV4DLFF0462',
    source: 'SMS lead',
  });
  assert.match(card, /BEGIN:VCARD/);
  assert.match(card, /VERSION:3\.0/);
  assert.match(card, /FN:Cal Roots LLC/);
  assert.match(card, /TEL;TYPE=CELL,VOICE:\(209\) 485-3200/);
  assert.match(card, /NOTE:.*Tested 2025-W50/);
  assert.match(card, /CATEGORIES:NCM,2025-W50/);
  assert.match(card, /END:VCARD/);
});

test('mergeContacts collapses the same phone from two sources', () => {
  const merged = mergeContacts([
    { name: 'Cal Roots', phone: '2094853200', source: 'SMS lead' },
    { name: 'Cal Roots LLC', phone: '2094853200', email: 'ops@calroots.example', source: 'Stripe' },
  ]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].email, 'ops@calroots.example');
  assert.equal(merged[0].name, 'Cal Roots');
});
