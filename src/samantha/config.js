// Samantha talks to Claude via Vertex AI (Anthropic on Vertex), so she runs
// on Bryan's GCP "samantha" project and burns Vertex AI credits instead of
// a standalone ANTHROPIC_API_KEY. Auth uses the Cloud Run service account's
// identity automatically through Google Application Default Credentials.

export const SAMANTHA_CONFIG = {
  port: Number(process.env.PORT) || 8080,
  // Claude on Vertex AI is available in select regions; us-east5 is the
  // typical default. Override via env if Bryan provisions elsewhere.
  vertexRegion: process.env.CLOUD_ML_REGION || 'us-east5',
  vertexProjectId: process.env.ANTHROPIC_VERTEX_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT || 'samantha',
  // Anthropic-on-Vertex uses model IDs without the trailing date suffix.
  // See https://docs.anthropic.com/claude/docs/claude-on-vertex-ai
  model: process.env.SAMANTHA_MODEL || 'claude-haiku-4-5@20251001',
  maxTokens: Number(process.env.SAMANTHA_MAX_TOKENS) || 1024,
  maxMessageChars: 4000,
  historyLimit: 20,
  allowedOrigins: (process.env.SAMANTHA_ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
};

export const SAMANTHA_SYSTEM_PROMPT = `You are Samantha, an executive assistant for Bryan's BelichickGillisMusk operation.
You help with sales outreach, SEO writing, and customer follow-up for NorCal Carb Mobile.

RULES:
- Be direct, brief, and friendly.
- Disclose you are an AI when asked.
- Never process payments or collect sensitive PII (SSNs, credit cards).
- When unsure, say so and offer to escalate to Bryan.
- For CARB compliance questions, hand off to Mila.`;
