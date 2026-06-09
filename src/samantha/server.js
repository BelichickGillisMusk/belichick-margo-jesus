import 'dotenv/config';
import { timingSafeEqual } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import express from 'express';
import cors from 'cors';
import { AnthropicVertex } from '@anthropic-ai/vertex-sdk';
import { SAMANTHA_CONFIG, SAMANTHA_SYSTEM_PROMPT, PERSONAS } from './config.js';

// Read the widget HTML once at module load. The file is bundled with the
// deploy and never changes at runtime, so caching it removes the per-request
// filesystem access (and the CodeQL "missing rate limiting" surface that
// comes with hitting the disk in a route handler).
const WIDGET_HTML = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), 'widget.html'),
  'utf8',
);

function tokensMatch(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string') return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

const DEFAULT_ALLOWED_ORIGINS = new Set([
  'http://localhost:3000',
  'http://localhost:8080',
]);

function isSameOriginRequest(req, origin) {
  try {
    return new URL(origin).host === req.header('host');
  } catch {
    return false;
  }
}

// Request-aware CORS so the phone widget (served from the same Cloud Run
// host as `/api/samantha/chat`) can talk to itself without needing an
// operator to add the Cloud Run URL to `SAMANTHA_ALLOWED_ORIGINS`.
// Browsers send an `Origin` header on same-origin POSTs too, so a static
// allowlist would reject the widget's first fetch.
export function createCorsMiddleware(allowedOrigins) {
  const staticAllowed = new Set(
    allowedOrigins.length > 0 ? allowedOrigins : DEFAULT_ALLOWED_ORIGINS,
  );

  return cors((req, callback) => {
    const origin = req.header('Origin');
    if (!origin) return callback(null, { origin: true });
    if (staticAllowed.has(origin)) return callback(null, { origin: true });
    if (isSameOriginRequest(req, origin)) return callback(null, { origin: true });
    callback(new Error('Origin not allowed by Samantha CORS policy.'));
  });
}

// On Cloud Run, AnthropicVertex picks up Google Application Default
// Credentials from the runtime service account — no key file required.
function buildVertexClient(config) {
  return new AnthropicVertex({
    region: config.vertexRegion,
    projectId: config.vertexProjectId,
  });
}

export function createSamanthaApp({
  config = SAMANTHA_CONFIG,
  vertexClient = null,
} = {}) {
  const app = express();
  app.use(createCorsMiddleware(config.allowedOrigins));
  app.use(express.json({ limit: '200kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', agent: 'Samantha', backend: 'vertex-ai' });
  });

  // Phone-friendly chat widget. Designed to be added to the iOS/Android
  // home screen as a PWA — uses the browser's Web Speech API for
  // voice-in / text-to-speech-out, and posts to `/api/samantha/chat`
  // on this same origin (no CORS, no token needed).
  app.get(['/widget', '/'], (_req, res) => {
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.set('Cache-Control', 'public, max-age=300');
    res.send(WIDGET_HTML);
  });

  // Status endpoint — minimal by default to avoid leaking operational
  // posture. Anonymous callers only learn whether Samantha is ready.
  // Authorized callers (header `x-samantha-token` matches
  // SAMANTHA_STATUS_TOKEN) get the full payload with fix instructions.
  // Constant-time comparison via timingSafeEqual prevents trivial timing
  // oracles on the shared secret.
  app.get('/api/samantha/status', (req, res) => {
    const missing = [];
    if (!config.vertexProjectId) missing.push('ANTHROPIC_VERTEX_PROJECT_ID');
    if (!config.vertexRegion) missing.push('CLOUD_ML_REGION');
    const ready = missing.length === 0;

    const expected = process.env.SAMANTHA_STATUS_TOKEN;
    const provided = req.get('x-samantha-token');
    const authorized = Boolean(expected) && tokensMatch(provided, expected);

    if (!authorized) {
      return res.json({
        agent: 'Samantha',
        ready,
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      agent: 'Samantha',
      backend: 'vertex-ai',
      ready,
      brainConnected: ready,
      vertex: {
        projectId: config.vertexProjectId || null,
        region: config.vertexRegion || null,
        model: config.model,
      },
      missingRequired: missing,
      message: ready
        ? 'Samantha is online via Vertex AI.'
        : `Samantha is offline — set ${missing.join(', ')} on the Cloud Run service.`,
      fixInstructions: ready
        ? null
        : {
            auto: "Run the 'Deploy Samantha to Cloud Run' GitHub Action (requires GCP_SA_KEY repo secret).",
            manual: "gcloud run services update samantha --region us-east5 --update-env-vars=ANTHROPIC_VERTEX_PROJECT_ID=samantha,CLOUD_ML_REGION=us-east5 --project samantha",
          },
      timestamp: new Date().toISOString(),
    });
  });

  app.post('/api/samantha/chat', async (req, res) => {
    const { message, history = [], persona = 'samantha' } = req.body || {};
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }
    if (message.length > config.maxMessageChars) {
      return res.status(400).json({ error: `Message must be ${config.maxMessageChars} characters or fewer.` });
    }
    if (!Array.isArray(history)) {
      return res.status(400).json({ error: 'history must be an array.' });
    }

    const systemPrompt = (typeof persona === 'string' && PERSONAS[persona])
      ? PERSONAS[persona]
      : SAMANTHA_SYSTEM_PROMPT;

    const messages = [
      ...history.slice(-config.historyLimit),
      { role: 'user', content: message.trim() },
    ];

    try {
      const client = vertexClient ?? buildVertexClient(config);
      const response = await client.messages.create({
        model: config.model,
        max_tokens: config.maxTokens,
        system: systemPrompt,
        messages,
      });
      const reply = response.content
        .filter((b) => b.type === 'text')
        .map((b) => b.text)
        .join('\n')
        .trim() || 'Sorry, I could not generate a response.';
      return res.json({
        reply,
        backend: 'vertex-ai',
        model: config.model,
        tokens: response.usage.input_tokens + response.usage.output_tokens,
      });
    } catch (err) {
      console.error('Samantha error:', err.message);
      const isAuthError = /credential|permission|unauthenticated|forbidden/i.test(err.message);
      return res.status(isAuthError ? 503 : 500).json({
        error: isAuthError
          ? 'Samantha cannot reach Vertex AI — check service-account permissions (Vertex AI User role).'
          : 'Samantha hit an error talking to Vertex AI.',
      });
    }
  });

  return app;
}
