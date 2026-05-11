import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { AnthropicVertex } from '@anthropic-ai/vertex-sdk';
import { SAMANTHA_CONFIG, SAMANTHA_SYSTEM_PROMPT } from './config.js';

const DEFAULT_ALLOWED_ORIGINS = new Set([
  'http://localhost:3000',
  'http://localhost:8080',
]);

function createCorsOptions(allowedOrigins) {
  const allowed = new Set(allowedOrigins.length > 0 ? allowedOrigins : DEFAULT_ALLOWED_ORIGINS);
  return {
    origin(origin, callback) {
      if (!origin || allowed.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Origin not allowed by Samantha CORS policy.'));
    },
  };
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
  app.use(cors(createCorsOptions(config.allowedOrigins)));
  app.use(express.json({ limit: '200kb' }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', agent: 'Samantha', backend: 'vertex-ai' });
  });

  // Status endpoint — minimal by design. Reports whether Vertex AI project
  // info is configured. Doesn't enumerate optional secrets to anonymous callers.
  app.get('/api/samantha/status', (_req, res) => {
    const missing = [];
    if (!config.vertexProjectId) missing.push('ANTHROPIC_VERTEX_PROJECT_ID');
    if (!config.vertexRegion) missing.push('CLOUD_ML_REGION');
    const ready = missing.length === 0;
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
    const { message, history = [] } = req.body || {};
    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }
    if (message.length > config.maxMessageChars) {
      return res.status(400).json({ error: `Message must be ${config.maxMessageChars} characters or fewer.` });
    }
    if (!Array.isArray(history)) {
      return res.status(400).json({ error: 'history must be an array.' });
    }

    const messages = [
      ...history.slice(-config.historyLimit),
      { role: 'user', content: message.trim() },
    ];

    try {
      const client = vertexClient ?? buildVertexClient(config);
      const response = await client.messages.create({
        model: config.model,
        max_tokens: config.maxTokens,
        system: SAMANTHA_SYSTEM_PROMPT,
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
