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
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
const GITHUB_ORG = process.env.GITHUB_ORG || 'BelichickGillisMusk';
const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || '';

// ── COST TRACKING ──
// Haiku 4.5: $0.80/MTok input, $4/MTok output
// Sonnet 4: $3/MTok input, $15/MTok output
const COST_PER_MTOK = {
  'claude-haiku-4-5-20251001': { input: 0.80, output: 4.00 },
  'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
};
const DAILY_COST_CAP = parseFloat(process.env.DAILY_COST_CAP || '2.00');  // $2/day default
const MONTHLY_COST_CAP = parseFloat(process.env.MONTHLY_COST_CAP || '30.00'); // $30/mo default

const costTracker = {
  daily: { date: new Date().toISOString().split('T')[0], inputTokens: 0, outputTokens: 0, cost: 0, requests: 0 },
  monthly: { month: new Date().toISOString().slice(0, 7), inputTokens: 0, outputTokens: 0, cost: 0, requests: 0 },
  allTime: { inputTokens: 0, outputTokens: 0, cost: 0, requests: 0 },
};

function trackCost(model, inputTokens, outputTokens) {
  const rates = COST_PER_MTOK[model] || COST_PER_MTOK['claude-haiku-4-5-20251001'];
  const cost = (inputTokens / 1_000_000) * rates.input + (outputTokens / 1_000_000) * rates.output;

  // Reset daily if new day
  const today = new Date().toISOString().split('T')[0];
  if (costTracker.daily.date !== today) {
    costTracker.daily = { date: today, inputTokens: 0, outputTokens: 0, cost: 0, requests: 0 };
  }
  // Reset monthly if new month
  const thisMonth = new Date().toISOString().slice(0, 7);
  if (costTracker.monthly.month !== thisMonth) {
    costTracker.monthly = { month: thisMonth, inputTokens: 0, outputTokens: 0, cost: 0, requests: 0 };
  }

  for (const bucket of [costTracker.daily, costTracker.monthly, costTracker.allTime]) {
    bucket.inputTokens += inputTokens;
    bucket.outputTokens += outputTokens;
    bucket.cost += cost;
    bucket.requests += 1;
  }

  return cost;
}

function isBudgetBlown() {
  const today = new Date().toISOString().split('T')[0];
  if (costTracker.daily.date !== today) return false; // new day, fresh budget
  if (costTracker.daily.cost >= DAILY_COST_CAP) return 'daily';
  const thisMonth = new Date().toISOString().slice(0, 7);
  if (costTracker.monthly.month === thisMonth && costTracker.monthly.cost >= MONTHLY_COST_CAP) return 'monthly';
  return false;
}

// ── EMAIL TRANSPORT ──
let emailTransport = null;
if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
  emailTransport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  console.log(`Email configured: ${process.env.SMTP_USER}`);
} else {
  console.log('WARN: SMTP not configured — email tasks will be queued');
}

// ── GCP AUTH HELPER ──
async function getGCPAccessToken() {
  const tokenRes = await fetch(
    'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
    { headers: { 'Metadata-Flavor': 'Google' } }
  );
  if (!tokenRes.ok) throw new Error('Cannot get GCP credentials from metadata server');
  const { access_token } = await tokenRes.json();
  return access_token;
}

// ── TOOLS THAT RAVEN CAN USE ──
// Claude tool_use lets Raven decide WHEN to call these based on the conversation

const RAVEN_TOOLS = [
  {
    name: 'send_email',
    description: 'Send an email. Use when the user asks you to email someone. Always confirm with the user first unless they say "just send it".',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Recipient email address' },
        subject: { type: 'string', description: 'Email subject line' },
        body: { type: 'string', description: 'Email body text' },
      },
      required: ['to', 'subject', 'body'],
    },
  },
  {
    name: 'create_github_issue',
    description: 'Create a GitHub issue to track work, bugs, or feature requests. Use when the user wants to log something on GitHub.',
    input_schema: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'Repository name (e.g. belichick-margo-jesus)' },
        title: { type: 'string', description: 'Issue title' },
        body: { type: 'string', description: 'Issue body/description in markdown' },
        labels: { type: 'array', items: { type: 'string' }, description: 'Labels to apply' },
      },
      required: ['repo', 'title', 'body'],
    },
  },
  {
    name: 'read_github_file',
    description: 'Read a file from a GitHub repository. Use to check code, configs, or docs.',
    input_schema: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'Repository name' },
        path: { type: 'string', description: 'File path in the repo (e.g. README.md)' },
        branch: { type: 'string', description: 'Branch name. Defaults to main.' },
      },
      required: ['repo', 'path'],
    },
  },
  {
    name: 'list_github_issues',
    description: 'List open issues from a GitHub repository. Use to check what work is pending.',
    input_schema: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'Repository name' },
        state: { type: 'string', enum: ['open', 'closed', 'all'], description: 'Filter by state' },
      },
      required: ['repo'],
    },
  },
  {
    name: 'create_github_file',
    description: 'Create or update a file in a GitHub repository. Use for deploying config changes, writing new files, or updating existing ones.',
    input_schema: {
      type: 'object',
      properties: {
        repo: { type: 'string', description: 'Repository name' },
        path: { type: 'string', description: 'File path in the repo' },
        content: { type: 'string', description: 'File content (plain text)' },
        message: { type: 'string', description: 'Commit message' },
        branch: { type: 'string', description: 'Branch to commit to. Defaults to main.' },
      },
      required: ['repo', 'path', 'content', 'message'],
    },
  },
  {
    name: 'trigger_cloud_build',
    description: 'Trigger a Google Cloud Build deployment. Use when the user wants to deploy a service. IMPORTANT: This costs money and takes time. Always confirm before triggering.',
    input_schema: {
      type: 'object',
      properties: {
        config: { type: 'string', description: 'Path to cloudbuild.yaml (e.g. raven-cloudrun/cloudbuild.yaml)' },
        substitutions: { type: 'object', description: 'Build substitution variables' },
      },
      required: ['config'],
    },
  },
  {
    name: 'add_task',
    description: 'Add a task to the task tracker. Use when the user gives you something to do or remember.',
    input_schema: {
      type: 'object',
      properties: {
        description: { type: 'string', description: 'What needs to be done' },
        priority: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Priority level' },
      },
      required: ['description'],
    },
  },
  {
    name: 'complete_task',
    description: 'Mark a task as done by its ID number.',
    input_schema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Task ID to mark as done' },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_tasks',
    description: 'List all tasks, optionally filtered by status.',
    input_schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['PENDING', 'DONE', 'BLOCKED', 'all'], description: 'Filter by status' },
      },
    },
  },
  {
    name: 'get_cost_report',
    description: 'Get the current cost/budget report. Shows how much has been spent today, this month, and remaining budget.',
    input_schema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_calendar_event',
    description: 'Create a Google Calendar event. Use when the user wants to schedule a test, appointment, or meeting. Always confirm details before creating.',
    input_schema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'Event title (e.g. "Valley Fleet — 3 truck tests")' },
        startTime: { type: 'string', description: 'Start time in ISO 8601 format (e.g. 2026-04-21T15:00:00-07:00)' },
        endTime: { type: 'string', description: 'End time in ISO 8601 format' },
        location: { type: 'string', description: 'Address or location (optional)' },
        description: { type: 'string', description: 'Event details — customer info, services, pricing (optional)' },
      },
      required: ['title', 'startTime', 'endTime'],
    },
  },
  {
    name: 'list_calendar_events',
    description: 'List upcoming Google Calendar events. Use when the user asks "what\'s on my calendar" or "what\'s scheduled today/tomorrow".',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date to check in YYYY-MM-DD format. Defaults to today.' },
        maxResults: { type: 'number', description: 'Max events to return. Defaults to 10.' },
      },
    },
  },
  {
    name: 'delete_calendar_event',
    description: 'Delete/cancel a Google Calendar event. Always confirm with user before deleting.',
    input_schema: {
      type: 'object',
      properties: {
        eventId: { type: 'string', description: 'The Google Calendar event ID to delete' },
      },
      required: ['eventId'],
    },
  },
];

// ── TOOL EXECUTION ──

const toolHandlers = {
  async send_email({ to, subject, body }) {
    if (!emailTransport) {
      emailLog.push({ to, subject, body, status: 'QUEUED', date: new Date().toISOString() });
      return `Email queued (SMTP not configured yet). Will send when email is set up.\nTo: ${to}\nSubject: ${subject}`;
    }
    try {
      const mailOptions = { from: process.env.SMTP_USER, to, subject, text: body };
      if (OWNER_EMAIL && to !== OWNER_EMAIL) mailOptions.cc = OWNER_EMAIL;
      await emailTransport.sendMail(mailOptions);
      emailLog.push({ to, subject, status: 'SENT', date: new Date().toISOString() });
      return `Email sent to ${to}. Subject: ${subject}`;
    } catch (err) {
      emailLog.push({ to, subject, status: 'FAILED', error: err.message, date: new Date().toISOString() });
      return `Email FAILED: ${err.message}`;
    }
  },

  async create_github_issue({ repo, title, body, labels }) {
    if (!GITHUB_TOKEN) return 'GitHub not configured. Set GITHUB_TOKEN env var to enable.';
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_ORG}/${repo}/issues`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json',
        },
        body: JSON.stringify({ title, body, labels: labels || [] }),
      });
      const data = await res.json();
      if (!res.ok) return `GitHub error: ${data.message || res.status}`;
      return `Issue created: #${data.number} — ${data.html_url}`;
    } catch (err) {
      return `GitHub error: ${err.message}`;
    }
  },

  async read_github_file({ repo, path, branch }) {
    if (!GITHUB_TOKEN) return 'GitHub not configured. Set GITHUB_TOKEN env var.';
    try {
      const ref = branch || 'main';
      const res = await fetch(`https://api.github.com/repos/${GITHUB_ORG}/${repo}/contents/${path}?ref=${ref}`, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      const data = await res.json();
      if (!res.ok) return `GitHub error: ${data.message || res.status}`;
      const content = Buffer.from(data.content, 'base64').toString('utf-8');
      // Truncate if huge (don't blow up Telegram)
      if (content.length > 3000) {
        return content.slice(0, 3000) + `\n\n... (truncated, ${content.length} chars total)`;
      }
      return content;
    } catch (err) {
      return `GitHub error: ${err.message}`;
    }
  },

  async list_github_issues({ repo, state }) {
    if (!GITHUB_TOKEN) return 'GitHub not configured. Set GITHUB_TOKEN env var.';
    try {
      const res = await fetch(`https://api.github.com/repos/${GITHUB_ORG}/${repo}/issues?state=${state || 'open'}&per_page=10`, {
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });
      const data = await res.json();
      if (!res.ok) return `GitHub error: ${data.message || res.status}`;
      if (data.length === 0) return 'No issues found.';
      return data.map(i => `#${i.number} [${i.state}] ${i.title}`).join('\n');
    } catch (err) {
      return `GitHub error: ${err.message}`;
    }
  },

  async create_github_file({ repo, path, content, message, branch }) {
    if (!GITHUB_TOKEN) return 'GitHub not configured. Set GITHUB_TOKEN env var.';
    try {
      const ref = branch || 'main';
      // Check if file exists (need sha to update)
      let sha;
      const check = await fetch(`https://api.github.com/repos/${GITHUB_ORG}/${repo}/contents/${path}?ref=${ref}`, {
        headers: { Authorization: `Bearer ${GITHUB_TOKEN}`, Accept: 'application/vnd.github.v3+json' },
      });
      if (check.ok) {
        const existing = await check.json();
        sha = existing.sha;
      }

      const payload = {
        message,
        content: Buffer.from(content).toString('base64'),
        branch: ref,
      };
      if (sha) payload.sha = sha;

      const res = await fetch(`https://api.github.com/repos/${GITHUB_ORG}/${repo}/contents/${path}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json',
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) return `GitHub error: ${data.message || res.status}`;
      return `File ${sha ? 'updated' : 'created'}: ${path} on ${ref}\nCommit: ${data.commit?.sha?.slice(0, 7)}`;
    } catch (err) {
      return `GitHub error: ${err.message}`;
    }
  },

  async trigger_cloud_build({ config, substitutions }) {
    const projectId = 'mila-claude-2426-487008';
    try {
      const access_token = await getGCPAccessToken();

      const buildRes = await fetch(`https://cloudbuild.googleapis.com/v1/projects/${projectId}/builds`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          source: {
            repoSource: {
              projectId,
              repoName: 'belichick-margo-jesus',
              branchName: 'main',
            },
          },
          steps: [{ name: 'gcr.io/cloud-builders/gcloud', args: ['builds', 'submit', `--config=${config}`] }],
          substitutions: substitutions || {},
        }),
      });
      const buildData = await buildRes.json();
      if (!buildRes.ok) return `Cloud Build error: ${JSON.stringify(buildData.error?.message || buildData.status)}`;
      return `Cloud Build triggered! Build ID: ${buildData.metadata?.build?.id || 'pending'}\nCheck: console.cloud.google.com/cloud-build/builds?project=${projectId}`;
    } catch (err) {
      return `Cloud Build error: ${err.message}. You may need to deploy manually with gcloud CLI.`;
    }
  },

  async add_task({ description, priority }) {
    const task = {
      id: tasks.length + 1,
      description,
      priority: priority || 'medium',
      status: 'PENDING',
      createdAt: new Date().toISOString(),
      completedAt: null,
    };
    tasks.push(task);
    return `Task #${task.id} added: ${description} [${task.priority}]`;
  },

  async complete_task({ id }) {
    const task = tasks.find(t => t.id === id);
    if (!task) return `Task #${id} not found.`;
    task.status = 'DONE';
    task.completedAt = new Date().toISOString();
    return `Task #${id} marked DONE: ${task.description}`;
  },

  async list_tasks({ status }) {
    const filtered = status && status !== 'all' ? tasks.filter(t => t.status === status) : tasks;
    if (filtered.length === 0) return 'No tasks.';
    return filtered.map(t => `#${t.id} [${t.status}] ${t.priority || '-'} — ${t.description}`).join('\n');
  },

  async get_cost_report() {
    const d = costTracker.daily;
    const m = costTracker.monthly;
    return [
      `COST REPORT`,
      ``,
      `Today (${d.date}):`,
      `  Requests: ${d.requests}`,
      `  Tokens: ${d.inputTokens} in / ${d.outputTokens} out`,
      `  Cost: $${d.cost.toFixed(4)} / $${DAILY_COST_CAP.toFixed(2)} cap`,
      `  Remaining: $${Math.max(0, DAILY_COST_CAP - d.cost).toFixed(4)}`,
      ``,
      `This month (${m.month}):`,
      `  Requests: ${m.requests}`,
      `  Cost: $${m.cost.toFixed(4)} / $${MONTHLY_COST_CAP.toFixed(2)} cap`,
      `  Remaining: $${Math.max(0, MONTHLY_COST_CAP - m.cost).toFixed(4)}`,
    ].join('\n');
  },

  async create_calendar_event({ title, startTime, endTime, location, description }) {
    if (!GOOGLE_CALENDAR_ID) return 'Google Calendar not configured. Set GOOGLE_CALENDAR_ID env var.';
    try {
      const accessToken = await getGCPAccessToken();
      const event = {
        summary: title,
        start: { dateTime: startTime, timeZone: 'America/Los_Angeles' },
        end: { dateTime: endTime, timeZone: 'America/Los_Angeles' },
        reminders: { useDefault: false, overrides: [{ method: 'popup', minutes: 30 }] },
      };
      if (location) event.location = location;
      if (description) event.description = description;

      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(event),
        }
      );
      const data = await res.json();
      if (!res.ok) return `Calendar error: ${data.error?.message || res.status}`;
      return `Event created: ${data.summary}\nTime: ${startTime} → ${endTime}\nLink: ${data.htmlLink}\nEvent ID: ${data.id}`;
    } catch (err) {
      return `Calendar error: ${err.message}`;
    }
  },

  async list_calendar_events({ date, maxResults }) {
    if (!GOOGLE_CALENDAR_ID) return 'Google Calendar not configured. Set GOOGLE_CALENDAR_ID env var.';
    try {
      const accessToken = await getGCPAccessToken();
      const targetDate = date || new Date().toISOString().split('T')[0];
      const timeMin = `${targetDate}T00:00:00-07:00`;
      const timeMax = `${targetDate}T23:59:59-07:00`;
      const max = maxResults || 10;

      const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&maxResults=${max}&singleEvents=true&orderBy=startTime`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!res.ok) return `Calendar error: ${data.error?.message || res.status}`;

      const events = data.items || [];
      if (events.length === 0) return `No events on ${targetDate}.`;

      const lines = events.map(e => {
        const start = e.start?.dateTime || e.start?.date || '?';
        const time = start.includes('T') ? start.split('T')[1].slice(0, 5) : 'all-day';
        const loc = e.location ? ` @ ${e.location}` : '';
        return `${time}  ${e.summary || '(no title)'}${loc}  [${e.id}]`;
      });
      return `Calendar — ${targetDate} (${events.length} events):\n${lines.join('\n')}`;
    } catch (err) {
      return `Calendar error: ${err.message}`;
    }
  },

  async delete_calendar_event({ eventId }) {
    if (!GOOGLE_CALENDAR_ID) return 'Google Calendar not configured. Set GOOGLE_CALENDAR_ID env var.';
    try {
      const accessToken = await getGCPAccessToken();
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(GOOGLE_CALENDAR_ID)}/events/${encodeURIComponent(eventId)}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        return `Calendar error: ${data.error?.message || res.status}`;
      }
      return `Event ${eventId} deleted.`;
    } catch (err) {
      return `Calendar error: ${err.message}`;
    }
  },
};

// ── RAVEN SYSTEM PROMPT ──
const RAVEN_SYSTEM = `You are Raven, a personal AI operator for the BelichickGillisMusk team. You're deployed on Google Cloud Run and accessible via Telegram (@norcalro_bot).

You are NOT just a chatbot. You are an executor. When given a task, you USE YOUR TOOLS to get it done — then report back what you did.

## Your Tools
You have real tools. USE THEM. Don't just describe what you would do — actually do it:
- send_email: Send real emails
- create_github_issue: Create issues on GitHub repos
- read_github_file: Read files from GitHub repos
- list_github_issues: See what's open/pending
- create_github_file: Write/update files in repos (deploy configs, update docs)
- trigger_cloud_build: Deploy services to Cloud Run
- add_task / complete_task / list_tasks: Track work
- get_cost_report: Check budget
- create_calendar_event: Schedule tests/appointments on Google Calendar
- list_calendar_events: See what's on the calendar today/tomorrow
- delete_calendar_event: Cancel a calendar event

## How You Operate
1. User sends a task via Telegram
2. You figure out what tools to use
3. You execute using tool calls
4. You report back: what you did, what happened, what's next

## Response Style
- Short. Direct. No fluff. This is Telegram, not an essay.
- After doing something, confirm: "Done. [what happened]"
- If you need info, ask ONE question
- If something failed, say what went wrong and what to try

## Cost Awareness — THIS IS CRITICAL
You have a daily budget of $${DAILY_COST_CAP} and monthly budget of $${MONTHLY_COST_CAP}.
- Keep responses concise to save tokens
- Don't repeat the user's message back to them
- If asked to do something expensive (like a big code review), warn about cost first
- Run get_cost_report if the user asks about spending

## GitHub
- Default org: ${GITHUB_ORG}
- Main repos: belichick-margo-jesus, github
- You can read files, create issues, commit files, list issues
- For code changes: create files on a branch, NOT directly to main unless told to

## Deploy
- You can trigger Cloud Build deployments
- ALWAYS confirm with the user before deploying anything
- Project: mila-claude-2426-487008

## Email
- ${emailTransport ? 'Email is configured and ready' : 'Email is NOT configured yet — emails will be queued'}
- Owner email: ${OWNER_EMAIL || 'not set'}
- Always draft first unless user says "just send it"
- Never send passwords, API keys, or sensitive data in emails

## What You Know
- CARB Clean Truck Check compliance (HD I/M regulations, deadlines, penalties)
- BelichickGillisMusk agent system (architecture, skills, configs)
- General business operations, drafting, research

## Guardrails
- NEVER expose API keys, tokens, or secrets in messages
- NEVER delete repos, branches, or data without explicit confirmation
- NEVER push to main without confirmation
- NEVER send bulk emails
- NEVER bypass cost limits
- If budget is blown, tell the user and STOP making API calls
- Always disclose you're AI when asked`;

// ── IN-MEMORY STORES ──
const sessions = new Map();
const tasks = [];
const emailLog = [];

// Session cleanup
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, session] of sessions) {
    if (session.lastActive < cutoff) sessions.delete(id);
  }
}, 5 * 60 * 1000);

// ── MIDDLEWARE ──
app.use(express.json());
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests.' },
}));

// ── CORE: CHAT WITH TOOL USE ──

function pickModel(message) {
  // Use Sonnet for complex tasks, Haiku for everything else
  const complexPatterns = /deploy|refactor|architect|review code|write.*function|create.*service|analyze|debug|build/i;
  if (complexPatterns.test(message)) return 'claude-sonnet-4-20250514';
  return 'claude-haiku-4-5-20251001';
}

async function chat(message, sessionId) {
  // Budget check
  const budgetStatus = isBudgetBlown();
  if (budgetStatus) {
    return `Budget limit hit (${budgetStatus}). I can't make more API calls today. Check /cost for details. This resets ${budgetStatus === 'daily' ? 'tomorrow' : 'next month'}.`;
  }

  const session = getSession(sessionId);
  session.messages.push({ role: 'user', content: message });

  // Keep last 20 messages
  if (session.messages.length > 20) {
    session.messages = session.messages.slice(-20);
  }

  const model = pickModel(message);
  let fullReply = '';

  try {
    // Initial call with tools
    let response = await anthropic.messages.create({
      model,
      max_tokens: 2048,
      system: RAVEN_SYSTEM,
      tools: RAVEN_TOOLS,
      messages: session.messages,
    });

    trackCost(model, response.usage.input_tokens, response.usage.output_tokens);

    // Tool use loop — Raven can chain multiple tool calls
    let loopCount = 0;
    const MAX_LOOPS = 5; // Safety: max 5 tool calls per message

    while (response.stop_reason === 'tool_use' && loopCount < MAX_LOOPS) {
      loopCount++;

      // Check budget mid-loop
      if (isBudgetBlown()) {
        fullReply += '\n[Budget limit reached mid-task. Stopping.]';
        break;
      }

      // Collect text and tool calls
      const toolResults = [];
      for (const block of response.content) {
        if (block.type === 'text') {
          fullReply += block.text;
        } else if (block.type === 'tool_use') {
          console.log(`[Raven tool] ${block.name}(${JSON.stringify(block.input).slice(0, 200)})`);
          const handler = toolHandlers[block.name];
          let result;
          if (handler) {
            try {
              result = await handler(block.input);
            } catch (err) {
              result = `Tool error: ${err.message}`;
              console.error(`[Raven tool error] ${block.name}: ${err.message}`);
            }
          } else {
            result = `Unknown tool: ${block.name}`;
          }
          toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
        }
      }

      // Send tool results back to Claude
      session.messages.push({ role: 'assistant', content: response.content });
      session.messages.push({ role: 'user', content: toolResults });

      response = await anthropic.messages.create({
        model,
        max_tokens: 2048,
        system: RAVEN_SYSTEM,
        tools: RAVEN_TOOLS,
        messages: session.messages,
      });

      trackCost(model, response.usage.input_tokens, response.usage.output_tokens);
    }

    // Final text response
    for (const block of response.content) {
      if (block.type === 'text') {
        fullReply += block.text;
      }
    }

    session.messages.push({ role: 'assistant', content: response.content });
    return fullReply || '(No response generated)';

  } catch (err) {
    console.error('Chat error:', err.message);
    if (err.status === 429) return 'API rate limited. Try again in a minute.';
    if (err.status === 401) return 'API key issue. Check ANTHROPIC_API_KEY.';
    return `Error: ${err.message}`;
  }
}

function getSession(sessionId) {
  if (!sessions.has(sessionId)) {
    sessions.set(sessionId, { messages: [], lastActive: Date.now() });
  }
  const session = sessions.get(sessionId);
  session.lastActive = Date.now();
  return session;
}

// ── TELEGRAM HELPERS ──

async function sendTelegram(chatId, text) {
  if (!TELEGRAM_TOKEN) return;
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

// ── ROUTES ──

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    agent: 'raven',
    version: '2.0.0',
    uptime: Math.floor(process.uptime()),
    email: emailTransport ? 'ready' : 'not configured',
    telegram: TELEGRAM_TOKEN ? 'ready' : 'not configured',
    github: GITHUB_TOKEN ? 'ready' : 'not configured',
    calendar: GOOGLE_CALENDAR_ID ? 'ready' : 'not configured',
    tasks: tasks.length,
    sessions: sessions.size,
    cost: {
      today: `$${costTracker.daily.cost.toFixed(4)} / $${DAILY_COST_CAP}`,
      month: `$${costTracker.monthly.cost.toFixed(4)} / $${MONTHLY_COST_CAP}`,
    },
  });
});

app.post('/chat', async (req, res) => {
  try {
    const { message, sessionId = 'default' } = req.body;
    if (!message) return res.status(400).json({ error: 'message required' });
    const reply = await chat(message, sessionId);
    res.json({ response: reply, sessionId, cost: { today: costTracker.daily.cost.toFixed(4) } });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(502).json({ error: 'AI service temporarily unavailable' });
  }
});

app.post('/task', (req, res) => {
  const { description, priority } = req.body;
  if (!description) return res.status(400).json({ error: 'description required' });
  const task = { id: tasks.length + 1, description, priority: priority || 'medium', status: 'PENDING', createdAt: new Date().toISOString(), completedAt: null };
  tasks.push(task);
  res.json(task);
});

app.get('/task', (req, res) => res.json({ tasks }));

app.patch('/task/:id', (req, res) => {
  const task = tasks.find(t => t.id === parseInt(req.params.id));
  if (!task) return res.status(404).json({ error: 'task not found' });
  if (req.body.status) { task.status = req.body.status; if (task.status === 'DONE') task.completedAt = new Date().toISOString(); }
  res.json(task);
});

app.get('/emails', (req, res) => res.json({ emails: emailLog }));

app.get('/cost', (req, res) => res.json(costTracker));

app.get('/tps', (req, res) => {
  const pending = tasks.filter(t => t.status === 'PENDING').length;
  const done = tasks.filter(t => t.status === 'DONE').length;
  const report = [
    '═══════════════════════════════════════════════',
    'TPS REPORT — RAVEN v2',
    `Date: ${new Date().toISOString()}`,
    '═══════════════════════════════════════════════',
    '', 'STATUS: ONLINE', '',
    `Uptime: ${Math.floor(process.uptime())}s`,
    `Sessions: ${sessions.size}`,
    `Tasks: ${pending} pending, ${done} done`,
    `Emails: ${emailLog.filter(e => e.status === 'SENT').length} sent, ${emailLog.filter(e => e.status === 'QUEUED').length} queued`,
    `GitHub: ${GITHUB_TOKEN ? 'connected' : 'not configured'}`,
    `Email: ${emailTransport ? 'connected' : 'not configured'}`,
    '',
    `COST TODAY: $${costTracker.daily.cost.toFixed(4)} / $${DAILY_COST_CAP} (${costTracker.daily.requests} requests)`,
    `COST THIS MONTH: $${costTracker.monthly.cost.toFixed(4)} / $${MONTHLY_COST_CAP}`,
    '',
    'RECENT TASKS:',
    ...tasks.slice(-5).map(t => `  #${t.id} [${t.status}] ${t.description}`),
    tasks.length === 0 ? '  (none)' : '',
    '', '═══════════════════════════════════════════════',
  ].join('\n');
  res.json({ report, cost: costTracker });
});

// ── TELEGRAM WEBHOOK ──

const WELCOME = `Raven v2 — your AI operator.

I don't just chat. I DO things:
- "Email john@example.com about Friday's meeting"
- "Create a GitHub issue for the deploy bug"
- "Schedule a test for Valley Fleet tomorrow at 2pm"
- "What's on my calendar today?"
- "Deploy raven to Cloud Run"
- "Draft a client follow-up email"

Commands:
/start - This message
/status - What I'm running, cost so far
/tasks - Pending tasks
/cost - Budget report
/help - This message`;

app.post('/telegram/webhook', async (req, res) => {
  res.sendStatus(200);

  try {
    const update = req.body;
    if (!update.message || !update.message.text) return;

    const chatId = update.message.chat.id;
    const text = update.message.text.trim();
    const sessionId = `tg-${chatId}`;
    const username = update.message.from?.username || update.message.from?.first_name || 'unknown';

    console.log(`[TG] ${username}: ${text}`);

    // Commands
    if (text === '/start' || text === '/help') {
      await sendTelegram(chatId, WELCOME);
      return;
    }

    if (text === '/status') {
      const d = costTracker.daily;
      const status = [
        `Raven v2 — ONLINE`,
        `Uptime: ${Math.floor(process.uptime() / 60)}m`,
        `Tasks: ${tasks.filter(t => t.status === 'PENDING').length} pending, ${tasks.filter(t => t.status === 'DONE').length} done`,
        `Cost today: $${d.cost.toFixed(4)} / $${DAILY_COST_CAP}`,
        `Requests today: ${d.requests}`,
        `GitHub: ${GITHUB_TOKEN ? 'connected' : 'off'}`,
        `Email: ${emailTransport ? 'ready' : 'queuing'}`,
      ].join('\n');
      await sendTelegram(chatId, status);
      return;
    }

    if (text === '/tasks') {
      const pending = tasks.filter(t => t.status === 'PENDING');
      if (pending.length === 0) { await sendTelegram(chatId, 'No pending tasks.'); return; }
      const list = pending.map((t, i) => `${i + 1}. [${t.priority || '-'}] ${t.description}`).join('\n');
      await sendTelegram(chatId, `Pending:\n${list}`);
      return;
    }

    if (text === '/cost') {
      const d = costTracker.daily;
      const m = costTracker.monthly;
      const report = [
        `Today (${d.date}): $${d.cost.toFixed(4)} / $${DAILY_COST_CAP} (${d.requests} req)`,
        `Month (${m.month}): $${m.cost.toFixed(4)} / $${MONTHLY_COST_CAP} (${m.requests} req)`,
        `Budget remaining today: $${Math.max(0, DAILY_COST_CAP - d.cost).toFixed(4)}`,
      ].join('\n');
      await sendTelegram(chatId, report);
      return;
    }

    // Send "typing" indicator
    try {
      await fetch(`${TELEGRAM_API}/sendChatAction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, action: 'typing' }),
      });
    } catch (_) {}

    // AI with tools
    const reply = await chat(text, sessionId);
    await sendTelegram(chatId, reply);

  } catch (err) {
    console.error('Telegram error:', err.message);
    try {
      const chatId = req.body?.message?.chat?.id;
      if (chatId) await sendTelegram(chatId, `Error: ${err.message}`);
    } catch (_) {}
  }
});

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.listen(PORT, () => {
  console.log(`Raven v2 listening on port ${PORT}`);
  console.log(`Daily cap: $${DAILY_COST_CAP} | Monthly cap: $${MONTHLY_COST_CAP}`);
  console.log(`Email: ${emailTransport ? 'ready' : 'not configured'}`);
  console.log(`GitHub: ${GITHUB_TOKEN ? 'ready' : 'not configured'}`);
  console.log(`Calendar: ${GOOGLE_CALENDAR_ID ? GOOGLE_CALENDAR_ID : 'not configured'}`);
  console.log(`Telegram: ${TELEGRAM_TOKEN ? 'ready' : 'not configured'}`);
});
