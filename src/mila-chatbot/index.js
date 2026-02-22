import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.MILA_PORT || 3001;

// Load the full CARB knowledge base as context
const knowledgeBase = readFileSync(
  join(__dirname, '../../skills/mila-carb-cs/references/clean-truck-check-complete.md'),
  'utf-8'
);

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are Mila, the customer service expert for Clean Truck Check compliance.
You know EVERY rule about California's Heavy-Duty Vehicle Inspection and Maintenance (HD I/M) program.

KNOWLEDGE BASE (this is your source of truth — cite it):
${knowledgeBase}

RULES:
- Be professional but approachable. Truckers are busy.
- Be urgent when deadlines are close.
- For every answer, provide: direct answer, specific rule, deadline if applicable, next steps, penalty for non-compliance.
- ALWAYS disclose you are an AI assistant when asked.
- NEVER give legal advice — recommend consulting an attorney for legal interpretations.
- NEVER process payments — direct to cleantruckcheck.arb.ca.gov
- If unsure about a specific detail, say so and direct to hdim@arb.ca.gov
- Keep responses focused and actionable.
- Collect lead info (name, email, what they need) when appropriate.`;

// Store conversations per session
const sessions = new Map();

const app = express();
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', agent: 'Mila-CARB', sessions: sessions.size });
});

// Chat endpoint
app.post('/chat', async (req, res) => {
  const { message, sessionId = 'default' } = req.body;

  if (!message?.trim()) {
    return res.status(400).json({ error: 'Message is required' });
  }

  // Get or create session history
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, []);
  }
  const history = sessions.get(sessionId);

  // Add user message
  history.push({ role: 'user', content: message });

  // Keep last 20 messages to stay within context limits
  const recentHistory = history.slice(-20);

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: recentHistory,
    });

    const reply = response.content[0]?.text || 'Sorry, I could not generate a response.';

    // Add assistant response to history
    history.push({ role: 'assistant', content: reply });

    res.json({
      reply,
      sessionId,
      tokens: response.usage.input_tokens + response.usage.output_tokens,
    });
  } catch (err) {
    console.error('Mila error:', err.message);
    res.status(500).json({
      error: 'Mila is temporarily unavailable. Please try again or email hdim@arb.ca.gov',
    });
  }
});

// Clear session
app.delete('/session/:id', (req, res) => {
  sessions.delete(req.params.id);
  res.json({ cleared: true });
});

// Serve a minimal chat widget for embedding
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
    <div class="msg bot">Hi! I'm Mila, your Clean Truck Check compliance assistant. I can help with testing requirements, deadlines, fees, and anything related to California's HD I/M program. What can I help you with?</div>
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

app.listen(PORT, () => {
  console.log(`🤖 Mila CARB chatbot running on http://localhost:${PORT}`);
  console.log(`💬 Chat API: POST http://localhost:${PORT}/chat`);
  console.log(`🖥️  Widget: http://localhost:${PORT}/widget`);
  console.log(`📋 Knowledge base loaded (${knowledgeBase.length} chars)`);
});
