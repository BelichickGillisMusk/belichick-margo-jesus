function byKind(events, kind) {
  return events.filter(event => event.kind === kind);
}

export function buildBrief(context, { date = new Date().toISOString().slice(0, 10) } = {}) {
  const events = context.events || [];
  const today = events.filter(event => (event.ts || '').slice(0, 10) === date);
  const pool = today.length ? today : events.slice(-12);

  const sales = pool.map(event => {
    if (event.kind === 'pricing') {
      return `${event.title} — ask whether the fleet is shopping that rate, then hold NorCal’s mobile + same-week pitch. Do not invent a matching price.`;
    }
    if (event.kind === 'launch') {
      return `${event.title} — if a prospect names this, acknowledge it and ask whether they still have to haul the truck to a shop.`;
    }
    return `${event.title} — stay honest. Cite CARB Tester ID IF530523 and the city phones if they compare testers.`;
  });

  const marketing = pool.map(event => `${event.kind}: ${event.title}`);

  const product = [
    ...byKind(pool, 'integration').map(event => `${event.title} — does our booking/VIN flow need a hook?`),
    ...byKind(pool, 'launch').map(event => `${event.title} — worth a second look before we copy anything.`),
  ];

  const voice = (context.voice || []).slice(0, 5).map(theme => `${theme.theme} (heard ${theme.count}×)`);
  const prior = (context.assignments || []).slice(0, 3).map(item => `${item.question}`);

  const lines = [
    `# Daily intel brief — ${date}`,
    '',
    `Watched: ${context.roster?.length || 0} competitors. Events in this brief: ${pool.length}.`,
    '',
    '## Sales — what to say',
    ...(sales.length ? sales.map(line => `- ${line}`) : ['- No market move today. Keep the A.C.E.S. pitch: we come to the yard.']),
    '',
    '## Marketing — what changed',
    ...(marketing.length ? marketing.map(line => `- ${line}`) : ['- Quiet tape. Do not publish a “competitor news” post from silence.']),
    '',
    '## Product — what deserves another look',
    ...(product.length ? product.map(line => `- ${line}`) : ['- No launch or integration worth a build this cycle.']),
    '',
    '## Memory carried forward',
    `- Previous research: ${prior.length ? prior.join(' · ') : 'none yet — this run becomes the next assignment’s context.'}`,
    `- Customer voice: ${voice.length ? voice.join(' · ') : 'none logged. Use /intel-voice to capture what fleets keep saying.'}`,
    '',
    '## TPS',
    `- STATUS: ONLINE`,
    `- WHAT I DID: briefed ${pool.length} events across ${context.roster?.length || 0} competitors`,
    `- TOKENS USED: structural brief (Kimi layer is separate when KIMI_API_KEY is set)`,
    `- RED FLAGS: none invented — only observed events and logged voice`,
    `- NEXT ACTION: next assignment loads intel/memory/ instead of redoing this work`,
    '',
    '_Kimi does not redo last week’s work. The log in intel/memory/ is the prompt._',
  ];

  return {
    date,
    markdown: lines.join('\n'),
    counts: {
      roster: context.roster?.length || 0,
      events: pool.length,
      sales: sales.length,
      marketing: marketing.length,
      product: product.length,
      voice: voice.length,
      prior: prior.length,
    },
  };
}
