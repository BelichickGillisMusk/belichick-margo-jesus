import test from 'node:test';
import assert from 'node:assert/strict';

import { handleRequest } from '../cloudflare/worker/src/worker.js';

function createKv(initial = {}) {
  const store = new Map(Object.entries(initial));
  return {
    async get(key, options) {
      if (!store.has(key)) return null;
      const value = store.get(key);
      if (options?.type === 'text') return String(value);
      return value;
    },
  };
}

test('serves / from KV index.html', async () => {
  const env = {
    SITE_ID: 'cleantruckcheckhayward',
    BOOKING_URL: 'https://cleantruckcheckvin.app',
    SITE_KV: createKv({ 'index.html': '<!DOCTYPE html><html><title>x</title></html>' }),
  };

  const res = await handleRequest(new Request('https://cleantruckcheckhayward.com/'), env);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /text\/html/i);
  assert.match(res.headers.get('cache-control') || '', /max-age=300/);
  assert.ok((await res.text()).includes('<!DOCTYPE html>'));
});

test('generates robots.txt with sitemap URL', async () => {
  const env = { SITE_KV: createKv({}) };
  const res = await handleRequest(new Request('https://example.com/robots.txt'), env);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /text\/plain/i);
  const body = await res.text();
  assert.ok(body.includes('User-agent: *'));
  assert.ok(body.includes('Sitemap: https://example.com/sitemap.xml'));
});

test('generates sitemap.xml with host root URL', async () => {
  const env = { SITE_KV: createKv({}) };
  const res = await handleRequest(new Request('https://example.com/sitemap.xml'), env);
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') || '', /application\/xml/i);
  const body = await res.text();
  assert.ok(body.includes('<loc>https://example.com/</loc>'));
});

test('/api/book redirects with UTM + site', async () => {
  const env = {
    SITE_ID: 'cleantruckcheckhayward',
    BOOKING_URL: 'https://cleantruckcheckvin.app',
    SITE_KV: createKv({}),
  };
  const res = await handleRequest(new Request('https://cleantruckcheckhayward.com/api/book'), env);
  assert.equal(res.status, 302);
  const location = res.headers.get('location');
  assert.ok(location);
  assert.ok(location.startsWith('https://cleantruckcheckvin.app/'));
  const url = new URL(location);
  assert.equal(url.searchParams.get('utm_source'), 'cloudflare');
  assert.equal(url.searchParams.get('site'), 'cleantruckcheckhayward');
});

test('returns 404.html when KV key missing', async () => {
  const env = { SITE_KV: createKv({ '404.html': '<!DOCTYPE html><html><title>404</title></html>' }) };
  const res = await handleRequest(new Request('https://example.com/missing'), env);
  assert.equal(res.status, 404);
  assert.match(res.headers.get('content-type') || '', /text\/html/i);
});

test('rejects unsafe paths', async () => {
  const env = { SITE_KV: createKv({}) };
  const res = await handleRequest(new Request('https://example.com/%5c%5csecrets'), env);
  assert.equal(res.status, 400);
});
