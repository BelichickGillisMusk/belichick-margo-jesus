import 'dotenv/config';
import { timingSafeEqual } from 'node:crypto';
import express from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { AnthropicVertex } from '@anthropic-ai/vertex-sdk';
import { MILA_CONFIG } from './config.js';
import { loadKnowledgeBase, buildSystemPrompt } from './knowledge-base.js';
import { createSessionStore } from './session-store.js';

const DEFAULT_ALLOWED_ORIGINS = new Set([
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
]);

function createCorsOptions(allowedOrigins) {
  const allowed = new Set(allowedOrigins.length > 0 ? allowedOrigins : DEFAULT_ALLOWED_ORIGINS);

  return {
    origin(origin, callback) {
      if (!origin || allowed.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error('Origin not allowed by Mila CORS policy.'));
    },
  };
}

function tokensMatch(provided, expected) {
  if (typeof provided !== 'string' || typeof expected !== 'string') return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function isValidEmail(email) {
  if (typeof email !== 'string' || email.length > 254 || email.includes(' ')) {
    return false;
  }

  const pieces = email.split('@');
  if (pieces.length !== 2 || !pieces[0] || !pieces[1]) {
    return false;
  }

  if (pieces[0].startsWith('.') || pieces[0].endsWith('.')) {
    return false;
  }

  if (!pieces[1].includes('.') || pieces[1].startsWith('.') || pieces[1].endsWith('.')) {
    return false;
  }

  return true;
}

function validateSessionId(sessionId) {
  return typeof sessionId === 'string' && sessionId.trim().length > 0 && sessionId.length <= 120;
}

function validateLead(lead) {
  if (!lead) {
    return { valid: true };
  }

  const { name, email, need } = lead;
  if (!name?.trim() || name.length > 80) {
    return { valid: false, message: 'Lead name is required and must be 80 characters or fewer.' };
  }

  if (!isValidEmail(email || '')) {
    return { valid: false, message: 'Lead email must be a valid email address.' };
  }

  if (!need?.trim() || need.length > 500) {
    return { valid: false, message: 'Lead need is required and must be 500 characters or fewer.' };
  }

  return { valid: true };
}

// On Cloud Run, AnthropicVertex picks up Google Application Default
// Credentials from the runtime service account — no key file required.
function buildVertexClient(config) {
  return new AnthropicVertex({
    region: config.vertexRegion,
    projectId: config.vertexProjectId,
  });
}

export function createMilaApp({
  config = MILA_CONFIG,
  anthropic = buildVertexClient(config),
  knowledgeBase = loadKnowledgeBase(),
  sessionStore = createSessionStore({
    ttlMs: config.sessionTtlMs,
    historyLimit: config.sessionHistoryLimit,
    maxActiveSessions: config.maxActiveSessions,
    leadRetentionLimit: config.leadRetentionLimit,
  }),
} = {}) {
  const app = express();
  const systemPrompt = buildSystemPrompt(knowledgeBase.content);

  app.use(cors(createCorsOptions(config.allowedOrigins)));
  app.use(express.json({ limit: '200kb' }));

  const chatLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests. Please try again later.' },
  });

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      agent: 'Mila-CARB',
      backend: 'vertex-ai',
      sessions: sessionStore.getStats().activeSessions,
      knowledgeBasePath: knowledgeBase.path,
      knowledgeBaseCharacters: knowledgeBase.characters,
    });
  });

  app.get('/tps', (req, res) => {
    const expected = process.env.MILA_STATUS_TOKEN;
    const provided = req.get('x-mila-token');
    const authorized = Boolean(expected) && tokensMatch(provided, expected);

    if (!authorized) {
      return res.json({
        status: 'ONLINE',
        agent: 'Mila-CARB',
        timestamp: new Date().toISOString(),
      });
    }

    res.json({
      status: 'ONLINE',
      agent: 'Mila-CARB',
      knowledgeBaseLoadedAt: knowledgeBase.loadedAt,
      sessions: sessionStore.getStats(),
      leads: sessionStore.listLeads(10),
    });
  });

  app.post('/chat', chatLimiter, async (req, res) => {
    const { message, sessionId = 'default', lead } = req.body || {};

    if (!validateSessionId(sessionId)) {
      return res.status(400).json({ error: 'A valid sessionId is required.' });
    }

    if (typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({ error: 'Message is required.' });
    }

    if (message.length > config.maxMessageChars) {
      return res.status(400).json({ error: `Message must be ${config.maxMessageChars} characters or fewer.` });
    }

    const leadValidation = validateLead(lead);
    if (!leadValidation.valid) {
      return res.status(400).json({ error: leadValidation.message });
    }

    const userHistory = sessionStore.addMessage(sessionId, { role: 'user', content: message.trim() });

    try {
      const response = await anthropic.messages.create({
        model: config.model,
        max_tokens: config.maxTokens,
        system: systemPrompt,
        messages: userHistory,
      });

      const reply = response.content
        .filter(block => block.type === 'text')
        .map(block => block.text)
        .join('\n')
        .trim() || 'Sorry, I could not generate a response.';

      sessionStore.addMessage(sessionId, { role: 'assistant', content: reply });
      const capturedLead = lead ? sessionStore.captureLead(sessionId, {
        name: lead.name.trim(),
        email: lead.email.trim(),
        need: lead.need.trim(),
      }) : null;

      return res.json({
        reply,
        sessionId,
        leadCaptured: Boolean(capturedLead),
        tokens: response.usage.input_tokens + response.usage.output_tokens,
      });
    } catch (error) {
      console.error('Mila error:', error.message);
      return res.status(500).json({
        error: 'Mila is temporarily unavailable. Please try again or email hdim@arb.ca.gov',
      });
    }
  });

  app.delete('/session/:id', (req, res) => {
    res.json({ cleared: sessionStore.clearSession(req.params.id) });
  });

  app.get('/widget', (_req, res) => {
    res.send(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Mila - Clean Truck Check Assistant</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; background: #f5f5f5; height: 100vh; display: flex; flex-direction: column; }
    .header { background: #1a1a2e; color: white; padding: 16px; text-align: center; }
    .header h1 { font-size: 18px; }
    .header p { font-size: 12px; opacity: 0.7; margin-top: 4px; }
    .messages { flex: 1; overflow-y: auto; padding: 16px; }
    .msg { margin-bottom: 12px; max-width: 85%; }
    .msg.user { margin-left: auto; background: #1a1a2e; color: white; padding: 10px 14px; border-radius: 16px 16px 4px 16px; }
    .msg.bot { background: white; padding: 10px 14px; border-radius: 16px 16px 16px 4px; border: 1px solid #e0e0e0; }
    .input-row { display: flex; padding: 12px; background: white; border-top: 1px solid #e0e0e0; }
    .input-row input { flex: 1; padding: 10px 14px; border: 1px solid #ddd; border-radius: 20px; outline: none; font-size: 14px; }
    .input-row button { margin-left: 8px; padding: 10px 20px; background: #1a1a2e; color: white; border: none; border-radius: 20px; cursor: pointer; font-size: 14px; }
    .typing { opacity: 0.5; font-style: italic; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Mila - Compliance Assistant</h1>
    <p>Clean Truck Check | CARB HD I/M Expert</p>
  </div>
  <div class="messages" id="messages">
    <div class="msg bot">Hi! I'm Mila, your Clean Truck Check compliance assistant. I can help with testing requirements, deadlines, fees, and anything related to California's HD I/M program. If you want follow-up help, you can include your name and email in the chat.</div>
  </div>
  <div class="input-row">
    <input id="input" placeholder="Ask about compliance, testing, deadlines..." autofocus>
    <button onclick="send()">Send</button>
  </div>
  <script>
    const sid = 'web-' + Math.random().toString(36).slice(2);
    const msgs = document.getElementById('messages');
    const input = document.getElementById('input');

    input.addEventListener('keydown', e => { if (e.key === 'Enter') send(); });

    async function send() {
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      addMsg(text, 'user');
      const typing = addMsg('Mila is checking...', 'bot typing');
      try {
        const res = await fetch('/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, sessionId: sid }),
        });
        const data = await res.json();
        typing.remove();
        addMsg(data.reply || data.error, 'bot');
      } catch {
        typing.remove();
        addMsg('Connection error. Please try again.', 'bot');
      }
    }

    function addMsg(text, cls) {
      const div = document.createElement('div');
      div.className = 'msg ' + cls;
      div.textContent = text;
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
      return div;
    }
  </script>
</body>
</html>`);
  });

  return { app, knowledgeBase, sessionStore };
}
