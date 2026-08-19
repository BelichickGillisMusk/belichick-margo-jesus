const DELAY_MS = Number(process.env.INTEL_FETCH_DELAY_MS || 1500);
const TIMEOUT_MS = Number(process.env.INTEL_FETCH_TIMEOUT_MS || 12000);

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function fetchPublicPage(url, { fetchImpl = fetch, timeoutMs = TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'NorCalCARBMobile-intel/1.0 (+https://github.com/BelichickGillisMusk/belichick-margo-jesus)',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    const text = await response.text();
    return { ok: response.ok, status: response.status, text: text.slice(0, 80_000) };
  } finally {
    clearTimeout(timer);
  }
}

export async function snapshotRoster(roster, { fetchImpl = fetch, delayMs = DELAY_MS, hashPage } = {}) {
  const snapshots = {};
  for (const competitor of roster) {
    try {
      const page = await fetchPublicPage(competitor.url, { fetchImpl });
      const excerpt = page.text.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 800);
      snapshots[competitor.id] = {
        hash: hashPage(excerpt),
        excerpt,
        status: page.status,
        fetchedAt: new Date().toISOString(),
      };
    } catch (error) {
      snapshots[competitor.id] = {
        hash: null,
        excerpt: '',
        status: 0,
        error: error.message,
        fetchedAt: new Date().toISOString(),
      };
    }
    if (delayMs) await sleep(delayMs);
  }
  return snapshots;
}
