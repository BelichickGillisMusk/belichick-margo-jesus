addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

async function handleRequest(request) {
  const url = new URL(request.url)
  const domain = url.hostname

  // Handle robots.txt — dynamically points to correct domain sitemap
  if (url.pathname === '/robots.txt') {
    const robotsTxt = `User-agent: *
Disallow: /wp-admin/
Allow: /wp-admin/admin-ajax.php

Sitemap: https://${domain}/sitemap.xml`

    return new Response(robotsTxt, {
      headers: { 'content-type': 'text/plain;charset=UTF-8' }
    })
  }

  // Handle sitemap.xml — dynamically injects correct domain
  if (url.pathname === '/sitemap.xml') {
    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${domain}/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`

    return new Response(sitemapXml, {
      headers: { 'content-type': 'application/xml;charset=UTF-8' }
    })
  }

  // All other requests pass through normally
  return fetch(request)
}
