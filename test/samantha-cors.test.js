import test from 'node:test';
import assert from 'node:assert/strict';
import { createCorsMiddleware } from '../src/samantha/server.js';

function runMiddleware(mw, { origin, host }) {
  return new Promise((resolve, reject) => {
    const headers = {};
    if (origin) headers.origin = origin;
    if (host) headers.host = host;

    const req = {
      method: 'GET',
      headers,
      header(name) { return this.headers[name.toLowerCase()]; },
      get(name) { return this.header(name); },
    };
    const res = {
      statusCode: 200,
      headers: {},
      _ended: false,
      setHeader(key, value) { this.headers[key.toLowerCase()] = value; },
      getHeader(key) { return this.headers[key.toLowerCase()]; },
      end(body) { this._ended = true; this._body = body; resolve({ req, res: this }); },
    };
    mw(req, res, (err) => {
      if (err) return reject(err);
      resolve({ req, res });
    });
  });
}

test('CORS allows same-origin POSTs from the widget on the Cloud Run host', async () => {
  const mw = createCorsMiddleware([]);
  const { res } = await runMiddleware(mw, {
    origin: 'https://samantha-x.run.app',
    host: 'samantha-x.run.app',
  });
  assert.equal(res.headers['access-control-allow-origin'], 'https://samantha-x.run.app');
});

test('CORS allows requests without an Origin header (curl, server-to-server)', async () => {
  const mw = createCorsMiddleware([]);
  const { res } = await runMiddleware(mw, { host: 'samantha-x.run.app' });
  // No origin header → no Access-Control-Allow-Origin needed, but middleware
  // must call next() without erroring.
  assert.equal(res.statusCode, 200);
});

test('CORS still honors explicitly allowed cross-origin embeds', async () => {
  const mw = createCorsMiddleware(['https://embed.example.com']);
  const { res } = await runMiddleware(mw, {
    origin: 'https://embed.example.com',
    host: 'samantha-x.run.app',
  });
  assert.equal(res.headers['access-control-allow-origin'], 'https://embed.example.com');
});

test('CORS rejects unknown cross-origin requests', async () => {
  const mw = createCorsMiddleware([]);
  await assert.rejects(
    () => runMiddleware(mw, {
      origin: 'https://evil.example.com',
      host: 'samantha-x.run.app',
    }),
    /Origin not allowed/,
  );
});
