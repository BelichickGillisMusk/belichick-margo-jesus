import { getAgent, getAllAgents } from './config.js';
import { runAgent } from './agent.js';
import { reviewOutbound } from './guardian.js';
import { logActivity, updateAgentStatus } from './activity.js';

const DELEGATE_TOOL = {
  name: 'delegate',
  description: 'Delegate a task to a sub-agent. The sub-agent will execute the task and return results.',
  input_schema: {
    type: 'object',
    properties: {
      agent_id: {
        type: 'string',
        description: 'ID of the agent to delegate to. Available: mila-carb, mila-legal, atlas, closer, jon-jones, builder-deploy, lead-scraper',
        enum: ['mila-carb', 'mila-legal', 'atlas', 'closer', 'jon-jones', 'builder-deploy', 'lead-scraper'],
      },
      task: {
        type: 'string',
        description: 'Clear, specific task description for the sub-agent',
      },
      priority: {
        type: 'string',
        enum: ['high', 'medium', 'low'],
        description: 'Task priority level',
      },
    },
    required: ['agent_id', 'task'],
  },
};

const SEND_OUTBOUND_TOOL = {
  name: 'send_outbound',
  description: 'Send content to an external channel (email, Slack, etc.). Will be reviewed by Jon Jones before sending.',
  input_schema: {
    type: 'object',
    properties: {
      channel: {
        type: 'string',
        description: 'Target channel: email, slack, discord, telegram, github',
        enum: ['email', 'slack', 'discord', 'telegram', 'github'],
      },
      content: {
        type: 'string',
        description: 'Content to send',
      },
      recipient: {
        type: 'string',
        description: 'Who receives this (email address, channel name, etc.)',
      },
    },
    required: ['channel', 'content'],
  },
};

const REPORT_TOOL = {
  name: 'report',
  description: 'Report final results back to the human. Use when the project is complete.',
  input_schema: {
    type: 'object',
    properties: {
      summary: {
        type: 'string',
        description: 'Executive summary of what was accomplished',
      },
      deliverables: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of concrete deliverables produced',
      },
      next_steps: {
        type: 'array',
        items: { type: 'string' },
        description: 'Recommended next actions',
      },
    },
    required: ['summary'],
  },
};

const TOOLS = [DELEGATE_TOOL, SEND_OUTBOUND_TOOL, REPORT_TOOL];

async function handleToolCall(toolName, input, agentDef) {
  if (toolName === 'delegate') {
    return await handleDelegate(input);
  }
  if (toolName === 'send_outbound') {
    return await handleOutbound(input, agentDef);
  }
  if (toolName === 'report') {
    return handleReport(input);
  }
  return { error: `Unknown tool: ${toolName}` };
}

async function handleDelegate({ agent_id, task, priority }) {
  const target = getAgent(agent_id);
  if (!target) return { error: `Agent not found: ${agent_id}` };

  console.log(`\n  ┌─ DELEGATING TO ${target.name.toUpperCase()}`);
  console.log(`  │  Task: ${task.slice(0, 100)}`);
  console.log(`  │  Priority: ${priority || 'medium'}`);

  try {
    const result = await runAgent(target, task, { parentId: 'belichick' });
    console.log(`  └─ ${target.name} DONE ✓\n`);
    return { agent: target.name, status: 'completed', result };
  } catch (err) {
    console.log(`  └─ ${target.name} FAILED ✗ ${err.message}\n`);
    return { agent: target.name, status: 'failed', error: err.message };
  }
}

async function handleOutbound({ channel, content, recipient }, sourceAgent) {
  console.log(`\n  ┌─ OUTBOUND REVIEW (Jon Jones)`);
  console.log(`  │  From: ${sourceAgent.name} → ${channel}${recipient ? ` (${recipient})` : ''}`);

  const review = await reviewOutbound(content, channel, sourceAgent.id);
  console.log(`  │  Verdict: ${review.action}`);
  console.log(`  └─ ${review.approved ? 'APPROVED' : 'HELD'}\n`);

  if (!review.approved) {
    return { sent: false, action: review.action, reason: review.reason };
  }

  return {
    sent: false,
    action: review.action,
    note: 'Approved by Jon Jones. Actual sending requires integration setup (Slack bot token, Gmail SMTP, etc.)',
    content: review.rewritten || content,
  };
}

function handleReport({ summary, deliverables, next_steps }) {
  console.log('\n  ══════════════════════════════════════');
  console.log('  PROJECT REPORT');
  console.log('  ══════════════════════════════════════');
  console.log(`\n  ${summary}\n`);
  if (deliverables?.length) {
    console.log('  Deliverables:');
    deliverables.forEach(d => console.log(`    ✓ ${d}`));
  }
  if (next_steps?.length) {
    console.log('\n  Next Steps:');
    next_steps.forEach(s => console.log(`    → ${s}`));
  }
  console.log('\n  ══════════════════════════════════════\n');
  return { acknowledged: true };
}

export async function runProject(projectDescription) {
  const belichick = getAgent('belichick');
  if (!belichick) throw new Error('Belichick agent not found');

  const roster = getAllAgents()
    .filter(a => a.id !== 'belichick' && a.id !== 'jon-jones')
    .map(a => `- ${a.id}: ${a.name} — ${a.role}`)
    .join('\n');

  const projectPrompt = [
    `NEW PROJECT FROM HUMAN:`,
    '',
    projectDescription,
    '',
    '---',
    '',
    'Your available sub-agents:',
    roster,
    '',
    'Break this project into tasks and delegate to the right agents.',
    'Use the delegate tool to assign each task.',
    'Use send_outbound for any external communications (Jon Jones will review).',
    'When all tasks are done, use the report tool to summarize deliverables.',
    '',
    'Be strategic. Delegate in the right order — some tasks depend on others.',
    'You can delegate to multiple agents. Each will execute and return results.',
  ].join('\n');

  console.log('\n  ┌─────────────────────────────────────');
  console.log('  │ BELICHICK RECEIVING PROJECT');
  console.log('  │ ' + projectDescription.slice(0, 70));
  console.log('  └─────────────────────────────────────\n');

  await logActivity('belichick', `New project: ${projectDescription.slice(0, 80)}`, 'strategy');

  const result = await runAgent(belichick, projectPrompt, {
    tools: TOOLS,
    onToolCall: handleToolCall,
  });

  return result;
}
