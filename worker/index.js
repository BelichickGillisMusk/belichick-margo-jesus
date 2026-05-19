const SITES = {
  'carbteststockton.com': {
    name: 'CARB Test Stockton',
    canonical: 'https://carbteststockton.com',
    lastmod: '2026-02-20',
  },
  'cleantruckcheckroseville.com': {
    name: 'Clean Truck Check Roseville',
    canonical: 'https://cleantruckcheckroseville.com',
    lastmod: '2026-02-20',
  },
  'cleantruckcheckhayward.com': {
    name: 'Clean Truck Check Hayward',
    canonical: 'https://cleantruckcheckhayward.com',
    lastmod: '2026-02-25',
  },
};

// Strip port for local dev / preview URLs
function getHostname(request) {
  const host = request.headers.get('host') || '';
  return host.split(':')[0].replace(/^www\./, '');
}

function robotsTxt(site) {
  return `User-agent: *
Allow: /

Sitemap: ${site.canonical}/sitemap.xml
`;
}

function sitemapXml(site) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${site.canonical}/</loc>
    <lastmod>${site.lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;
}

export default {
  async fetch(request, env, ctx) {
    const hostname = getHostname(request);
    const site = SITES[hostname];

    // Unknown domain — pass through to origin
    if (!site) {
      return fetch(request);
    }

    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/robots.txt') {
      return new Response(robotsTxt(site), {
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    if (path === '/sitemap.xml') {
      return new Response(sitemapXml(site), {
        headers: {
          'Content-Type': 'application/xml; charset=utf-8',
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // All other requests pass through to Cloudflare Pages
    return fetch(request);
  },
};
