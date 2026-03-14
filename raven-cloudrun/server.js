const express = require('express');
const Anthropic = require('@anthropic-ai/sdk');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 8080;

// ── ENV CHECK ──
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('FATAL: ANTHROPIC_API_KEY not set');
  process.exit(1);
}
if (!process.env.TELEGRAM_BOT_TOKEN) {
  console.error('WARN: TELEGRAM_BOT_TOKEN not set — Telegram webhook disabled');
}

const anthropic = new Anthropic.default();
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const OWNER_EMAIL = process.env.OWNER_EMAIL || '';

// ── EMAIL TRANSPORT ──
let emailTransport = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  emailTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  console.log(`Email configured: ${process.env.SMTP_USER}`);
} else {
  console.log('WARN: SMTP not configured — email tasks will be queued but not sent');
}

// ── RAVEN SYSTEM PROMPT ──
const RAVEN_SYSTEM = `You are Raven, a personal task assistant bot for the BelichickGillisMusk team.

You receive tasks via Telegram from your owner. Your job is to:
1. Understand what they want done
2. Execute it if you can (send emails, draft messages, organize info)
3. Confirm what you did
4. If you can't do it, say exactly what's needed to get it done

## What You Can Do
- **Send emails**: If the user says "email [person] about [topic]", draft and send it
- **Draft messages**: Write professional emails, Slack messages, texts
- **Organize tasks**: Track what needs to be done, mark things complete
- **Answer questions**: Use your knowledge to help with business decisions
- **CARB compliance**: You know Clean Truck Check rules if asked
- **Summarize**: Condense long info into bullet points

## How You Respond
- Short, direct, no fluff
- If you sent an email, confirm: "Sent to [email] — subject: [subject]"
- If you need more info, ask ONE specific question
- If a task is queued (can't do right now), say: "Queued: [task]. Need [what's missing] to execute."
- Use plain text, no markdown (this is Telegram)

## Email Rules
- Always show the draft before sending unless the user says "just send it"
- Professional tone unless told otherwise
- CC the owner (${OWNER_EMAIL}) on business emails if configured
- Never send emails with sensitive data (passwords, SSNs, payment info)

## Task Format
When tracking tasks, use:
[STATUS] Task description
Status: DONE, PENDING, BLOCKED, SENT

## Guardrails
- Never share API keys, tokens, or internal config
- Never impersonate a real person in emails without clear instruction
- Never send bulk/spam emails
- Always disclose you are an AI bot when asked
- If something feels off, ask for confirmation before acting`;

// ── IN-MEMORY STORES ──
const sessions = new Map();
const tasks = [];
const emailLog = [];

// Session cleanup — evict after 30 min idle
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, session] of sessions) {
    if (session.lastActive < cutoff) sessions.delete(id);
  }
}, 5 * 60 * 1000);

// ── MIDDLEWARE ──
app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Slow down.' },
});
app.use(limiter);

// ── HELPERS ──

function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { messages: [], lastActive: Date.now() });
  }
  const session = sessions.get(sessionId);
  session.lastActive = Date.now();
  return session;
}

async function chat(message, sessionId) {
  const session = getSession(sessionId);
  session.messages.push({ role: 'user', content: message });

  // Keep last 20 messages for context
  if (session.messages.length > 20) {
    session.messages = session.messages.slice(-20);
  }

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    system: RAVEN_SYSTEM,
    messages: session.messages,
  });

  const reply = response.content[0].text;
  session.messages.push({ role: 'assistant', content: reply });

  return reply;
}

async function sendEmail(to, subject, body) {
  if (!emailTransport) {
    emailLog.push({ to, subject, body, status: 'QUEUED', date: new Date().toISOString() });
    return { sent: false, reason: 'SMTP not configured. Email queued.' };
  }

  try {
    const mailOptions = {
      from: process.env.SMTP_USER,
      to,
      subject,
      text: body,
    };
    if (OWNER_EMAIL && to !== OWNER_EMAIL) {
      mailOptions.cc = OWNER_EMAIL;
    }

    await emailTransport.sendMail(mailOptions);
    emailLog.push({ to, subject, status: 'SENT', date: new Date().toISOString() });
    return { sent: true };
  } catch (err) {
    console.error('Email send error:', err.message);
    emailLog.push({ to, subject, status: 'FAILED', error: err.message, date: new Date().toISOString() });
    return { sent: false, reason: err.message };
  }
}

async function sendTelegram(chatId, text) {
  if (!TELEGRAM_TOKEN) return;

  // Split long messages (Telegram max is 4096 chars)
  const chunks = [];
  for (let i = 0; i < text.length; i += 4000) {
    chunks.push(text.slice(i, i + 4000));
  }

  for (const chunk of chunks) {
    try {
      await fetch(`${TELEGRAM_API}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text: chunk }),
      });
    } catch (err) {
      console.error('Telegram send error:', err.message);
    }
  }
}

// ── EXTRACT EMAIL TASK ──
// If Raven's response contains email instructions, try to parse and send
async function processEmailAction(reply, sessionId) {
  // Look for pattern: SEND EMAIL\nTo: ...\nSubject: ...\nBody: ...
  const emailMatch = reply.match(/SEND EMAIL\nTo:\s*(.+)\nSubject:\s*(.+)\nBody:\s*([\s\S]+?)(?:\n\n|$)/i);
  if (emailMatch) {
    const [, to, subject, body] = emailMatch;
    const result = await sendEmail(to.trim(), subject.trim(), body.trim());
    if (result.sent) {
      return `\n\nEmail sent to ${to.trim()}.`;
    } else {
      return `\n\nEmail queued (${result.reason}). Will send when SMTP is configured.`;
    }
  }
  return '';
}

// ── ROUTES ──

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    agent: 'raven',
    uptime: Math.floor(process.uptime()),
    version: '1.0.0',
    email: emailTransport ? 'configured' : 'not configured',
    telegram: TELEGRAM_TOKEN ? 'configured' : 'not configured',
    tasks: tasks.length,
    sessions: sessions.size,
  });
});

// Chat endpoint
app.post('/chat', async (req, res) => {
  try {
    const { message, sessionId = 'default' } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });

    const reply = await chat(message, sessionId);
    const emailResult = await processEmailAction(reply, sessionId);

    res.json({ response: reply + emailResult, sessionId });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(502).json({ error: 'AI service temporarily unavailable' });
  }
});

// Task management
app.post('/task', (req, res) => {
  const { description } = req.body;
  if (!description) return res.status(400).json({ error: 'description required' });

  const task = {
    id: tasks.length + 1,
    description,
    status: 'PENDING',
    createdAt: new Date().toISOString(),
    completedAt: null,
  };
  tasks.push(task);
  res.json(task);
});

app.get('/task', (req, res) => {
  res.json({ tasks });
});

app.patch('/task/:id', (req, res) => {
  const task = tasks.find(t => t.id === parseInt(req.params.id));
  if (!task) return res.status(404).json({ error: 'task not found' });

  if (req.body.status) {
    task.status = req.body.status;
    if (task.status === 'DONE') task.completedAt = new Date().toISOString();
  }
  res.json(task);
});

// Email log
app.get('/emails', (req, res) => {
  res.json({ emails: emailLog });
});

// TPS report
app.get('/tps', (req, res) => {
  const pending = tasks.filter(t => t.status === 'PENDING').length;
  const done = tasks.filter(t => t.status === 'DONE').length;
  const emailsSent = emailLog.filter(e => e.status === 'SENT').length;
  const emailsQueued = emailLog.filter(e => e.status === 'QUEUED').length;

  const report = [
    '═══════════════════════════════════════════════',
    'TPS REPORT — RAVEN',
    `Date: ${new Date().toISOString()}`,
    '═══════════════════════════════════════════════',
    '',
    'STATUS: ONLINE',
    '',
    `UPTIME: ${Math.floor(process.uptime())}s`,
    `ACTIVE SESSIONS: ${sessions.size}`,
    `TASKS: ${pending} pending, ${done} done`,
    `EMAILS: ${emailsSent} sent, ${emailsQueued} queued`,
    `MEMORY: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB`,
    '',
    'RECENT TASKS:',
    ...tasks.slice(-5).map(t => `  [${t.status}] ${t.description}`),
    tasks.length === 0 ? '  (none yet)' : '',
    '',
    '═══════════════════════════════════════════════',
  ].join('\n');

  res.json({ report, stats: { pending, done, emailsSent, emailsQueued, sessions: sessions.size } });
});

// ── TELEGRAM WEBHOOK ──

const WELCOME = `Hey! I'm Raven, your task bot.

Send me things to do:
- "Email John at john@example.com about the meeting tomorrow"
- "Draft a follow-up message for the client"
- "What are the CARB compliance deadlines?"
- "Add task: call the supplier Friday"

Commands:
/start - This message
/help - What I can do
/status - My current status
/tasks - See pending tasks`;

app.post('/telegram/webhook', async (req, res) => {
  // Always respond 200 quickly so Telegram doesn't retry
  res.sendStatus(200);

  try {
    const update = req.body;
    if (!update.message || !update.message.text) return;

    const chatId = update.message.chat.id;
    const text = update.message.text.trim();
    const sessionId = `tg-${chatId}`;
    const username = update.message.from?.username || update.message.from?.first_name || 'unknown';

    console.log(`[Telegram] ${username}: ${text}`);

    // Handle commands
    if (text === '/start' || text === '/help') {
      await sendTelegram(chatId, WELCOME);
      return;
    }

    if (text === '/status') {
      const uptime = Math.floor(process.uptime());
      const pending = tasks.filter(t => t.status === 'PENDING').length;
      const done = tasks.filter(t => t.status === 'DONE').length;
      const status = [
        `Raven — ONLINE`,
        `Uptime: ${Math.floor(uptime / 60)}m`,
        `Tasks: ${pending} pending, ${done} done`,
        `Sessions: ${sessions.size}`,
        `Emails sent: ${emailLog.filter(e => e.status === 'SENT').length}`,
        emailTransport ? 'Email: ready' : 'Email: not configured (queuing)',
      ].join('\n');
      await sendTelegram(chatId, status);
      return;
    }

    if (text === '/tasks') {
      const pending = tasks.filter(t => t.status === 'PENDING');
      if (pending.length === 0) {
        await sendTelegram(chatId, 'No pending tasks.');
      } else {
        const list = pending.map((t, i) => `${i + 1}. ${t.description}`).join('\n');
        await sendTelegram(chatId, `Pending tasks:\n${list}`);
      }
      return;
    }

    // Regular message — send to Raven AI
    const reply = await chat(text, sessionId);
    const emailResult = await processEmailAction(reply, sessionId);
    await sendTelegram(chatId, reply + emailResult);

    // Auto-track as task if it looks like an instruction
    const taskWords = ['email', 'send', 'call', 'schedule', 'remind', 'draft', 'write', 'set up', 'create', 'add task', 'follow up'];
    if (taskWords.some(w => text.toLowerCase().includes(w))) {
      tasks.push({
        id: tasks.length + 1,
        description: text,
        status: 'PENDING',
        createdAt: new Date().toISOString(),
        completedAt: null,
        source: `telegram:${username}`,
      });
    }
  } catch (err) {
    console.error('Telegram webhook error:', err.message);
    // Try to notify user of error
    try {
      const chatId = req.body?.message?.chat?.id;
      if (chatId) {
        await sendTelegram(chatId, 'Something went wrong. Try again in a sec.');
      }
    } catch (_) {}
  }
});

// ── 404 ──
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── START ──
app.listen(PORT, () => {
  console.log(`Raven listening on port ${PORT}`);
  console.log(`Email: ${emailTransport ? 'configured' : 'not configured'}`);
  console.log(`Telegram: ${TELEGRAM_TOKEN ? 'configured' : 'not configured'}`);
});
