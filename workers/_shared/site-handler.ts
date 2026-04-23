// Shared fetch handler used by every site Worker.
// Each site Worker calls `handleSite(request, env, { domain, htmlStore })`.
// Own KV per site (no more shared HTML_STORE collision). Self-referential
// robots.txt and sitemap.xml. AI crawlers explicitly allowed. D1 leads
// insert + R2 archive happen in /api/book when those bindings are present.

export interface SiteEnv {
  LEADS_DB?: D1Database;
  FORM_SUBMISSIONS?: R2Bucket;
}

export interface SiteConfig {
  domain: string;
  htmlStore: KVNamespace;
}

const AI_ALLOW_BLOCK =
  '# AI crawlers: explicitly allowed so these sites surface in generative answers.\n' +
  'User-agent: GPTBot\nAllow: /\n' +
  'User-agent: ChatGPT-User\nAllow: /\n' +
  'User-agent: OAI-SearchBot\nAllow: /\n' +
  'User-agent: ClaudeBot\nAllow: /\n' +
  'User-agent: Claude-Web\nAllow: /\n' +
  'User-agent: anthropic-ai\nAllow: /\n' +
  'User-agent: PerplexityBot\nAllow: /\n' +
  'User-agent: Google-Extended\nAllow: /\n' +
  'User-agent: Applebot-Extended\nAllow: /\n' +
  'User-agent: CCBot\nAllow: /\n' +
  'User-agent: Bytespider\nAllow: /\n';

function robotsTxt(domain: string): string {
  return (
    'User-agent: *\n' +
    'Allow: /\n\n' +
    AI_ALLOW_BLOCK +
    `\nSitemap: https://${domain}/sitemap.xml\n`
  );
}

function sitemapXml(domain: string): string {
  const today = new Date().toISOString().slice(0, 10);
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    '  <url>\n' +
    `    <loc>https://${domain}/</loc>\n` +
    `    <lastmod>${today}</lastmod>\n` +
    '    <changefreq>weekly</changefreq>\n' +
    '    <priority>1.0</priority>\n' +
    '  </url>\n' +
    '</urlset>\n'
  );
}

async function handleBooking(
  request: Request,
  env: SiteEnv,
  domain: string,
): Promise<Response> {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'invalid_json' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const leadId = crypto.randomUUID();
  const submittedAt = new Date().toISOString();
  const pick = (k: string) => (typeof body[k] === 'string' ? (body[k] as string) : null);
  const pickInt = (k: string) => {
    const v = body[k];
    return typeof v === 'number' && Number.isFinite(v) ? Math.trunc(v) : null;
  };

  if (env.LEADS_DB) {
    await env.LEADS_DB
      .prepare(
        `INSERT INTO leads (id, source_domain, company_name, contact_name, phone, email, vin, test_type, vehicle_count, submitted_at, status, notes)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, 'new', ?11)`,
      )
      .bind(
        leadId,
        domain,
        pick('company_name'),
        pick('contact_name'),
        pick('phone'),
        pick('email'),
        pick('vin'),
        pick('test_type'),
        pickInt('vehicle_count'),
        submittedAt,
        pick('notes'),
      )
      .run();
  }

  if (env.FORM_SUBMISSIONS) {
    const key = `${domain}/${submittedAt}/${leadId}.json`;
    await env.FORM_SUBMISSIONS.put(
      key,
      JSON.stringify({ ...body, id: leadId, source_domain: domain, submitted_at: submittedAt }),
      { httpMetadata: { contentType: 'application/json' } },
    );
  }

  return new Response(JSON.stringify({ ok: true, id: leadId }), {
    headers: { 'content-type': 'application/json' },
  });
}

export async function handleSite(
  request: Request,
  env: SiteEnv,
  cfg: SiteConfig,
): Promise<Response> {
  const url = new URL(request.url);

  if (url.pathname === '/robots.txt') {
    return new Response(robotsTxt(cfg.domain), {
      headers: {
        'content-type': 'text/plain; charset=utf-8',
        'cache-control': 'public, max-age=3600',
      },
    });
  }

  if (url.pathname === '/sitemap.xml') {
    return new Response(sitemapXml(cfg.domain), {
      headers: {
        'content-type': 'application/xml; charset=utf-8',
        'cache-control': 'public, max-age=3600',
      },
    });
  }

  if (url.pathname === '/api/book') {
    return handleBooking(request, env, cfg.domain);
  }

  const key = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\//, '');
  const html = await cfg.htmlStore.get(key);
  if (html !== null) {
    return new Response(html, {
      headers: { 'content-type': 'text/html; charset=utf-8' },
    });
  }

  const notFound = await cfg.htmlStore.get('404.html');
  return new Response(notFound ?? 'Not Found', {
    status: 404,
    headers: { 'content-type': 'text/html; charset=utf-8' },
  });
}
