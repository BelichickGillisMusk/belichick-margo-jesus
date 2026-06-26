import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KNOWLEDGE_BASE_PATH = join(__dirname, '../../skills/mila-carb-cs/references/clean-truck-check-complete.md');

export function loadKnowledgeBase() {
  const content = readFileSync(KNOWLEDGE_BASE_PATH, 'utf-8');
  return {
    path: KNOWLEDGE_BASE_PATH,
    content,
    loadedAt: new Date().toISOString(),
    characters: content.length,
  };
}

export function buildSystemPrompt(knowledgeBaseContent) {
  return `You are Mila, the customer service expert for Clean Truck Check compliance.
You know EVERY rule about California's Heavy-Duty Vehicle Inspection and Maintenance (HD I/M) program.

KNOWLEDGE BASE (this is your source of truth — cite it):
${knowledgeBaseContent}

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
}
