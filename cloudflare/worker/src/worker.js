const DEFAULT_BOOKING_URL = 'https://cleantruckcheckvin.app';

function normalizePathname(pathname) {
  if (!pathname || pathname === '/') return '/index.html';
  if (!pathname.startsWith('/')) return `/${pathname}`;
  return pathname;
}

function rawPathnameFromUrlString(urlString) {
  const match = urlString.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^/]+(\/[^?#]*)/);
  return match?.[1] ?? null;
}

function isSafePath(pathname) {
  // Prevent KV key traversal / ambiguity.
  if (pathname.includes('..') || pathname.includes('\\')) return false;

  const lower = pathname.toLowerCase();
  if (lower.includes('%2e') || lower.includes('%2f') || lower.includes('%5c')) return false;

  try {
    const decoded = decodeURIComponent(pathname);
    return !decoded.includes('..') && !decoded.includes('\\');
  } catch {
    return false;
  }
}

function kvKeyFromPathname(pathname) {
  return pathname.replace(/^\/+/, '');
}

function contentTypeForKey(key) {
  if (key.endsWith('.html')) return 'text/html; charset=utf-8';
  if (key.endsWith('.txt')) return 'text/plain; charset=utf-8';
  if (key.endsWith('.xml')) return 'application/xml; charset=utf-8';
  if (key.endsWith('.json')) return 'application/json; charset=utf-8';
  if (key.endsWith('.css')) return 'text/css; charset=utf-8';
  if (key.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (key.endsWith('.svg')) return 'image/svg+xml';
  if (key.endsWith('.png')) return 'image/png';
  if (key.endsWith('.jpg') || key.endsWith('.jpeg')) return 'image/jpeg';
  if (key.endsWith('.webp')) return 'image/webp';
  return 'application/octet-stream';
}

function withCommonHeaders(response, { contentType, cacheControl } = {}) {
  const headers = new Headers(response.headers);
  if (contentType) headers.set('Content-Type', contentType);
  if (cacheControl) headers.set('Cache-Control', cacheControl);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-Frame-Options', 'DENY');
  headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  return new Response(response.body, { status: response.status, headers });
}

function buildRobotsTxt(url) {
  const host = url.host;
  return [
    'User-agent: *',
    'Allow: /',
    `Sitemap: https://${host}/sitemap.xml`,
    '',
  ].join('\n');
}

function buildSitemapXml(url) {
  const host = url.host;
  const base = `https://${host}`;
  const lastmod = new Date().toISOString();
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    '  <url>',
    `    <loc>${base}/</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    '    <changefreq>weekly</changefreq>',
    '    <priority>1.0</priority>',
    '  </url>',
    '</urlset>',
    '',
  ].join('\n');
}

function buildBookingUrl(baseUrl, { host, siteId }) {
  const url = new URL(baseUrl || DEFAULT_BOOKING_URL);
  url.searchParams.set('utm_source', 'cloudflare');
  url.searchParams.set('utm_medium', 'worker');
  url.searchParams.set('utm_campaign', host);
  if (siteId) url.searchParams.set('site', siteId);
  return url.toString();
}

async function handleApiBook(request, env, url) {
  const bookingUrl = buildBookingUrl(env?.BOOKING_URL, {
    host: url.host,
    siteId: env?.SITE_ID,
  });

  if (request.method === 'GET' || request.method === 'HEAD') {
    return new Response(null, {
      status: 302,
      headers: {
        Location: bookingUrl,
        'Cache-Control': 'no-store',
      },
    });
  }

  const acceptsJson = (request.headers.get('accept') || '').includes('application/json');
  if (acceptsJson) {
    return new Response(JSON.stringify({ bookingUrl }), {
      status: 200,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  }

  return new Response(null, {
    status: 303,
    headers: {
      Location: bookingUrl,
      'Cache-Control': 'no-store',
    },
  });
}

export async function handleRequest(request, env) {
  const urlString = request.url;
  const url = new URL(urlString);
  const rawPathname = rawPathnameFromUrlString(urlString) ?? url.pathname;
  const pathname = normalizePathname(rawPathname);

  if (pathname === '/api/book') {
    return handleApiBook(request, env, url);
  }

  if (!isSafePath(pathname)) {
    return withCommonHeaders(new Response('Bad Request', { status: 400 }), {
      contentType: 'text/plain; charset=utf-8',
      cacheControl: 'no-store',
    });
  }

  const key = kvKeyFromPathname(pathname);

  if (!env?.SITE_KV?.get) {
    return withCommonHeaders(new Response('Worker misconfigured: missing SITE_KV binding.', { status: 500 }), {
      contentType: 'text/plain; charset=utf-8',
      cacheControl: 'no-store',
    });
  }

  if (key === 'robots.txt') {
    const content = buildRobotsTxt(url);
    return withCommonHeaders(new Response(content, { status: 200 }), {
      contentType: 'text/plain; charset=utf-8',
      cacheControl: 'public, max-age=3600',
    });
  }

  if (key === 'sitemap.xml') {
    const content = buildSitemapXml(url);
    return withCommonHeaders(new Response(content, { status: 200 }), {
      contentType: 'application/xml; charset=utf-8',
      cacheControl: 'public, max-age=3600',
    });
  }

  const cachedText = await env.SITE_KV.get(key, { type: 'text' });
  if (cachedText != null) {
    return withCommonHeaders(new Response(cachedText, { status: 200 }), {
      contentType: contentTypeForKey(key),
      cacheControl: key.endsWith('.html') ? 'public, max-age=300' : 'public, max-age=86400',
    });
  }

  const notFoundHtml = await env.SITE_KV.get('404.html', { type: 'text' });
  if (notFoundHtml != null) {
    return withCommonHeaders(new Response(notFoundHtml, { status: 404 }), {
      contentType: 'text/html; charset=utf-8',
      cacheControl: 'public, max-age=300',
    });
  }

  return withCommonHeaders(new Response('Not Found', { status: 404 }), {
    contentType: 'text/plain; charset=utf-8',
    cacheControl: 'public, max-age=300',
  });
}

export default {
  fetch: handleRequest,
};
