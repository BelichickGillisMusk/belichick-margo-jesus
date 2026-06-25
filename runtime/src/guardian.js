import { getAgent } from './config.js';
import { runAgent } from './agent.js';
import { logActivity } from './activity.js';

const CREDENTIAL_PATTERNS = [
  /sk-ant-/i,
  /AIzaSy/i,
  /xoxb-/i,
  /xapp-/i,
  /ghp_/i,
  /CF_/i,
  /AKIA[0-9A-Z]{16}/,
  /-----BEGIN (RSA |EC )?PRIVATE KEY-----/,
];

export async function reviewOutbound(content, channel, sourceAgent) {
  for (const pattern of CREDENTIAL_PATTERNS) {
    if (pattern.test(content)) {
      await logActivity('jon-jones', `BLOCKED credential leak from ${sourceAgent} to ${channel}`, 'security');
      return { approved: false, reason: 'Credential pattern detected — blocked immediately', action: 'BLOCK' };
    }
  }

  const jonJones = getAgent('jon-jones');
  if (!jonJones) {
    return { approved: true, reason: 'Guardian not configured — auto-approved', action: 'APPROVE' };
  }

  const reviewPrompt = [
    `Review this outbound action from agent "${sourceAgent}" going to channel "${channel}".`,
    '',
    'Content to review:',
    '---',
    content,
    '---',
    '',
    'Respond with EXACTLY one of:',
    'APPROVE — content is safe to send',
    'REWRITE — content needs minor fixes (provide corrected version)',
    'BLOCK — content should not be sent (explain why)',
    'ESCALATE — needs human review (explain why)',
  ].join('\n');

  try {
    const verdict = await runAgent(jonJones, reviewPrompt);
    const firstLine = verdict.trim().split('\n')[0].toUpperCase();

    let action = 'ESCALATE';
    if (firstLine.startsWith('APPROVE')) action = 'APPROVE';
    else if (firstLine.startsWith('REWRITE')) action = 'REWRITE';
    else if (firstLine.startsWith('BLOCK')) action = 'BLOCK';

    const approved = action === 'APPROVE' || action === 'REWRITE';
    await logActivity('jon-jones', `${action}: ${sourceAgent} → ${channel} (${content.slice(0, 60)}...)`, 'security');

    return { approved, reason: verdict, action, rewritten: action === 'REWRITE' ? verdict : null };
  } catch (err) {
    await logActivity('jon-jones', `Review failed for ${sourceAgent}: ${err.message}`, 'security');
    return { approved: false, reason: `Guardian error: ${err.message}`, action: 'ESCALATE' };
  }
}
