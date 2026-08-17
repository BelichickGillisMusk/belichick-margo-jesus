// Contact-card builder for NorCal CARB Mobile.
// Produces iOS/Android-importable vCards and Google Contacts CSVs,
// grouped by the ISO week the customer was tested so Bryan can
// knock out a whole week's callbacks in one sitting.

export function normalizePhone(raw) {
  if (raw === null || raw === undefined) return '';
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('1')) return digits.slice(1);
  if (digits.length === 10) return digits;
  return '';
}

export function formatPhone(digits) {
  if (!digits || digits.length !== 10) return '';
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export function normalizeEmail(raw) {
  if (!raw) return '';
  const value = String(raw).trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : '';
}

export function isoWeek(date) {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay() || 7;
  utc.setUTCDate(utc.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utc - yearStart) / 86400000 + 1) / 7);
  return { year: utc.getUTCFullYear(), week };
}

export function weekBounds(year, week) {
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - day + 1 + (week - 1) * 7);
  const sunday = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  return { start: monday, end: sunday };
}

export function weekKey(date) {
  const { year, week } = isoWeek(date);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function weekLabel(key) {
  const match = key.match(/^(\d{4})-W(\d{2})$/);
  if (!match) return key;
  const year = Number(match[1]);
  const week = Number(match[2]);
  const { start, end } = weekBounds(year, week);
  const fmt = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
  return `${key} (${fmt(start)}–${fmt(end)})`;
}

export function vcardEscape(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;');
}

export function contactUid(contact) {
  const key = contact.phone || contact.email || contact.vin || contact.name || 'unknown';
  return `ncm-${String(key).toLowerCase().replace(/[^a-z0-9]/g, '')}`;
}

export function fileSafeName(contact) {
  const base = (contact.name || contact.org || contact.phone || 'contact')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  const tail = (contact.phone || contact.uid || 'x').slice(-4);
  return `${base}-${tail}`;
}

export function toVcard(contact) {
  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
  const name = contact.name || contact.org || 'Unknown';
  const uid = contact.uid || contactUid(contact);
  // Structured N is required so Android/Samsung do not collapse every
  // card onto the first FN they see in a multi-card file.
  lines.push(`N:${vcardEscape(name)};;;;`);
  lines.push(`FN:${vcardEscape(name)}`);
  lines.push(`UID:${vcardEscape(uid)}`);
  if (contact.org) lines.push(`ORG:${vcardEscape(contact.org)}`);
  // One TEL only. Duplicating CELL+WORK with the same number is a
  // common trigger for OEM contact-mergers.
  if (contact.phone) {
    lines.push(`TEL;TYPE=CELL:${formatPhone(contact.phone)}`);
  }
  if (contact.email) lines.push(`EMAIL;TYPE=INTERNET:${vcardEscape(contact.email)}`);
  if (contact.address) lines.push(`ADR;TYPE=WORK:;;${vcardEscape(contact.address)};;;;`);
  const notes = [];
  if (contact.weekLabel) notes.push(`Tested ${contact.weekLabel}`);
  if (contact.testDate) notes.push(`Test date: ${contact.testDate}`);
  if (contact.vin) notes.push(`VIN: ${contact.vin}`);
  if (contact.plate) notes.push(`Plate: ${contact.plate}`);
  if (contact.testType) notes.push(`Type: ${contact.testType}`);
  if (contact.testResult) notes.push(`Result: ${contact.testResult}`);
  if (contact.source) notes.push(`Source: ${contact.source}`);
  if (notes.length) lines.push(`NOTE:${vcardEscape(notes.join(' · '))}`);
  lines.push('END:VCARD');
  return lines.join('\r\n');
}

// Official Google Contacts export headers (2024+). The older
// "Name" / "Given Name" / "Phone 1 - Type" columns are ignored by the
// current importer, which then dumps every phone onto the first row —
// that is the "one contact with 500 numbers" bug.
export const GOOGLE_CSV_COLUMNS = [
  'First Name',
  'Last Name',
  'File As',
  'Organization Name',
  'Phone 1 - Label',
  'Phone 1 - Value',
  'E-mail 1 - Label',
  'E-mail 1 - Value',
  'Address 1 - Label',
  'Address 1 - Formatted',
  'Notes',
  'Labels',
];

export function toGoogleCsvRow(contact) {
  const name = contact.name || contact.org || '';
  const fileAs = [name, contact.phone && formatPhone(contact.phone)].filter(Boolean).join(' · ');
  return {
    'First Name': name,
    'Last Name': '',
    'File As': fileAs,
    'Organization Name': contact.org || '',
    'Phone 1 - Label': contact.phone ? 'Mobile' : '',
    'Phone 1 - Value': contact.phone ? formatPhone(contact.phone) : '',
    'E-mail 1 - Label': contact.email ? 'Work' : '',
    'E-mail 1 - Value': contact.email || '',
    'Address 1 - Label': contact.address ? 'Work' : '',
    'Address 1 - Formatted': contact.address || '',
    Notes: [
      contact.weekLabel && `Tested ${contact.weekLabel}`,
      contact.vin && `VIN ${contact.vin}`,
      contact.plate && `Plate ${contact.plate}`,
      contact.testType && contact.testType,
      contact.testResult && contact.testResult,
      contact.source && `via ${contact.source}`,
    ].filter(Boolean).join(' · '),
    Labels: contact.weekKey ? `NCM ::: ${contact.weekKey}` : 'NCM',
  };
}

export function mergeContacts(records) {
  const byPhone = new Map();
  const byEmail = new Map();
  const unmatched = [];

  function absorb(existing, incoming) {
    for (const key of ['name', 'org', 'phone', 'email', 'address', 'vin', 'plate', 'testType', 'testResult', 'testDate', 'weekKey', 'weekLabel', 'source']) {
      if (!existing[key] && incoming[key]) existing[key] = incoming[key];
    }
    if (incoming.weekKey && existing.weekKey && incoming.weekKey !== existing.weekKey) {
      existing.weeks = Array.from(new Set([...(existing.weeks || [existing.weekKey]), incoming.weekKey]));
    }
  }

  for (const record of records) {
    if (record.phone && byPhone.has(record.phone)) {
      absorb(byPhone.get(record.phone), record);
      continue;
    }
    if (record.email && byEmail.has(record.email)) {
      absorb(byEmail.get(record.email), record);
      continue;
    }
    const copy = { ...record };
    if (record.phone) byPhone.set(record.phone, copy);
    if (record.email) byEmail.set(record.email, copy);
    if (!record.phone && !record.email) unmatched.push(copy);
  }

  const seen = new Set();
  const merged = [];
  for (const contact of [...byPhone.values(), ...byEmail.values(), ...unmatched]) {
    if (seen.has(contact)) continue;
    seen.add(contact);
    merged.push(contact);
  }
  return merged;
}

export function pickField(row, ...candidates) {
  const keys = Object.keys(row);
  const normalize = name => String(name).toLowerCase().replace(/[\s_/-]/g, '');
  for (const candidate of candidates) {
    const target = normalize(candidate);
    const matchKey = keys.find(key => normalize(key) === target);
    if (matchKey === undefined) continue;
    const value = row[matchKey];
    if (value === null || value === undefined || String(value).trim() === '') continue;
    return String(value).trim();
  }
  return '';
}
