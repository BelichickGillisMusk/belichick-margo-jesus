export const EVENT_KINDS = ['launch', 'pricing', 'integration', 'positioning', 'page-change', 'customer-voice'];

const HINTS = [
  { kind: 'pricing', pattern: /\b(price|pricing|\$\d|rate card|fee|discount)\b/i },
  { kind: 'launch', pattern: /\b(launch|now available|introducing|new (service|product|program)|announcing)\b/i },
  { kind: 'integration', pattern: /\b(integrat|api|webhook|connects with|partnership|plugin)\b/i },
  { kind: 'positioning', pattern: /\b(rebrand|tagline|we now|positioned|unlike|vs\.|compared to)\b/i },
];

export function classifyChange(text) {
  const haystack = String(text || '');
  for (const hint of HINTS) {
    if (hint.pattern.test(haystack)) return hint.kind;
  }
  return 'page-change';
}

export function diffSnapshots(roster, previous, next) {
  const events = [];
  for (const competitor of roster) {
    const before = previous[competitor.id];
    const after = next[competitor.id];
    if (!after) continue;
    if (!before) {
      events.push({
        competitorId: competitor.id,
        kind: 'page-change',
        title: `First snapshot for ${competitor.name}`,
        detail: 'Baseline stored. Future diffs will flag launches, pricing, integrations, and positioning.',
        sourceUrl: competitor.url,
        confidence: 'observed',
      });
      continue;
    }
    if (before.hash === after.hash) continue;
    events.push({
      competitorId: competitor.id,
      kind: classifyChange(after.excerpt || ''),
      title: `${competitor.name} page changed`,
      detail: after.excerpt || 'Public page hash changed.',
      sourceUrl: competitor.url,
      confidence: 'observed',
    });
  }
  return events;
}
