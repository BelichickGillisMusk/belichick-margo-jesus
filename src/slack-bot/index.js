import 'dotenv/config';
import bolt from '@slack/bolt';
import { AGENTS, AGENT_SOURCE_OF_TRUTH, MISSIONS } from './agents.js';
import { runAgent, runMission } from './dispatch.js';
import { createMissionStore } from './mission-store.js';
import {
  ENVIRONMENT_VARIABLES,
  parseCsvEnv,
  parseIntegerEnv,
  validateRequiredEnv,
  isMainModule,
} from '../shared/runtime-contract.js';

const { App } = bolt;
const DEFAULT_MAX_CONCURRENT_MISSIONS = parseIntegerEnv('SLACK_MAX_CONCURRENT_MISSIONS', 2, 1);
const DEFAULT_DAILY_TOKEN_BUDGET = parseIntegerEnv('SLACK_DAILY_TOKEN_BUDGET', 60000, 1000);
const DEFAULT_MISSION_TOKEN_WARN_THRESHOLD = parseIntegerEnv('SLACK_MISSION_TOKEN_WARN_THRESHOLD', 12000, 1000);
const QUICK_ACTIONS = {
  samantha_pulse: {
    label: 'Samantha pulse',
    commandName: 'dispatch',
    type: 'Road Ops Pulse',
    agents: ['samantha'],
    task: 'Act as Samantha. Review today’s priorities, choose the best next execution step, and return a completion-oriented action summary I can approve from the road.',
    emoji: ':brain:',
  },
  leads_pulse: {
    label: 'Lead pulse',
    commandName: 'recon-leads',
    type: 'Lead Hunt',
    agents: MISSIONS['recon-leads'].agents,
    task: 'Find high-value California fleet or trucking leads that are strong fits for Clean Truck Check help and summarize the best prospects.',
    emoji: ':dart:',
  },
  deploy_pulse: {
    label: 'Deploy pulse',
    commandName: 'recon-deploy',
    type: 'Deploy Assist',
    agents: MISSIONS['recon-deploy'].agents,
    task: 'Review the current web/deployment situation and produce the fastest GitHub-to-Cloudflare or Vercel path to shipping.',
    emoji: ':rocket:',
  },
  compliance_pulse: {
    label: 'Compliance pulse',
    commandName: 'recon-compliance',
    type: 'Compliance Check',
    agents: MISSIONS['recon-compliance'].agents,
    task: 'Summarize the most urgent Clean Truck Check follow-ups, deadlines, and next actions to keep customers compliant.',
    emoji: ':clipboard:',
  },
  budget_pulse: {
    label: 'Budget pulse',
    action: 'budget',
  },
};

function buildRosterResponse() {
  const roster = Object.entries(AGENTS)
    .map(([agentId, agent]) => `*${agent.name}* (${agentId}) — ${agent.role}`)
    .join('\n');

  return {
    text: `*BELICHICKGILLISMUSK AGENT ROSTER*\n\n${roster}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*BELICHICKGILLISMUSK AGENT ROSTER*\n\n${roster}`,
        },
      },
      {
        type: 'context',
        elements: [{
          type: 'mrkdwn',
          text: `Runtime source of truth: \`${AGENT_SOURCE_OF_TRUTH}\``,
        }],
      },
      {
        type: 'actions',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: 'Samantha pulse' }, action_id: 'samantha_pulse' },
          { type: 'button', text: { type: 'plain_text', text: 'Lead pulse' }, action_id: 'leads_pulse' },
          { type: 'button', text: { type: 'plain_text', text: 'Deploy pulse' }, action_id: 'deploy_pulse' },
          { type: 'button', text: { type: 'plain_text', text: 'Compliance pulse' }, action_id: 'compliance_pulse' },
          { type: 'button', text: { type: 'plain_text', text: 'Budget' }, action_id: 'budget_pulse' },
        ],
      },
    ],
  };
}

function formatMissionTime(timestamp) {
  if (!timestamp) {
    return 'never';
  }

  const diffMinutes = Math.floor((Date.now() - timestamp) / 60000);
  if (diffMinutes < 60) {
    return `${diffMinutes}m ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }

  return `${Math.floor(diffHours / 24)}d ago`;
}

function buildStatusText(missionStore) {
  const lines = Object.entries(AGENTS).map(([agentId, agent]) => {
    const snapshot = missionStore.getAgentSnapshot(agentId);
    const indicator = snapshot.activeMissionId ? ':large_orange_circle:' : ':large_green_circle:';
    const current = snapshot.task ? `current: ${snapshot.task.slice(0, 40)}` : `last: ${snapshot.lastStatus}`;
    return `${indicator} *${agent.name}* — ${current} (${formatMissionTime(snapshot.lastUpdatedAt)})`;
  });

  const usage = missionStore.getTodayUsage();
  return `*AGENT STATUS PULSE* — ${new Date().toLocaleString()}\n\n${lines.join('\n')}\n\nActive missions: ${missionStore.getActiveMissionCount()} | Today: ${usage.missions} missions | ${usage.tokens} tokens | ${usage.failures} failed | ${usage.cancelled} cancelled`;
}

function buildBudgetText(missionStore, dailyTokenBudget) {
  const usage = missionStore.getTodayUsage();
  const remaining = Math.max(dailyTokenBudget - usage.tokens, 0);
  return `*BUDGET STATUS*\n\nDaily token budget: ${dailyTokenBudget}\nUsed today: ${usage.tokens}\nRemaining: ${remaining}\nCompleted missions: ${usage.missions}\nFailed missions: ${usage.failures}\nCancelled missions: ${usage.cancelled}`;
}

function getDispatchBlocker(missionStore, { maxConcurrentMissions, dailyTokenBudget }) {
  if (missionStore.getActiveMissionCount() >= maxConcurrentMissions) {
    return `:warning: Max concurrent mission limit reached (${maxConcurrentMissions}). Wait for an active mission to finish or cancel one.`;
  }

  const usage = missionStore.getTodayUsage();
  if (usage.tokens >= dailyTokenBudget) {
    return `:warning: Daily token budget reached (${usage.tokens}/${dailyTokenBudget}). Use /budget for details before dispatching more work.`;
  }

  return null;
}

function createGuard(allowedUserIds, getUserId) {
  return async function guard(payload, next) {
    const userId = getUserId(payload);
    if (allowedUserIds.length > 0 && !allowedUserIds.includes(userId)) {
      const responder = payload.respond || (async () => {});
      await responder({ text: ':no_entry: Unauthorized. Contact the workspace admin to be added to the allowlist.' });
      return;
    }

    await next();
  };
}

async function runTrackedMission({
  missionStore,
  commandName,
  task,
  agents,
  type,
  requestedBy,
  execute,
}) {
  const mission = missionStore.queueMission({
    command: commandName,
    task,
    agents,
    type,
    requestedBy,
  });

  missionStore.markRunning(mission.id);

  try {
    const outcome = await execute();
    if (missionStore.isCancelled(mission.id)) {
      return { mission, cancelled: true, outcome: null };
    }

    missionStore.completeMission(mission.id, {
      tokens: outcome.totalTokens ?? outcome.tokens ?? 0,
      results: outcome.results ? outcome.results.map(result => result.name) : [outcome.name],
      failures: outcome.failures || [],
    });

    return { mission, cancelled: false, outcome };
  } catch (error) {
    if (missionStore.isCancelled(mission.id)) {
      return { mission, cancelled: true, outcome: null };
    }

    missionStore.failMission(mission.id, { error: error.message });
    throw error;
  }
}

function formatMissionCompletion({ outcome, type, task, emoji, agentNames, missionTokenWarnThreshold }) {
  const warnings = [];
  if (outcome.failures?.length) {
    warnings.push(`Partial failure: ${outcome.failures.length} agent(s) failed.`);
  }
  const tokens = outcome.totalTokens ?? outcome.tokens ?? 0;
  if (tokens >= missionTokenWarnThreshold) {
    warnings.push(`Mission used ${tokens} tokens, which crosses the warn threshold of ${missionTokenWarnThreshold}.`);
  }

  if (outcome.combined) {
    const output = outcome.combined.length > 2800
      ? `${outcome.combined.slice(0, 2800)}\n\n_(truncated — full output available on request)_`
      : outcome.combined;
    return `${emoji} *[${agentNames}]* ${type.toUpperCase()} COMPLETE: "${task}"\n\n${output}\n\n_${tokens} tokens used_${warnings.length ? `\n:warning: ${warnings.join(' ')}` : ''}`;
  }

  const output = outcome.text.length > 2800 ? `${outcome.text.slice(0, 2800)}\n\n_(truncated)_` : outcome.text;
  return `${emoji} *[${outcome.name}]* COMPLETE (${outcome.elapsed}s, ${tokens} tokens):\n\n${output}${warnings.length ? `\n:warning: ${warnings.join(' ')}` : ''}`;
}

export function createSlackApp({
  allowedUserIds = parseCsvEnv('ALLOWED_USER_IDS'),
  maxConcurrentMissions = DEFAULT_MAX_CONCURRENT_MISSIONS,
  dailyTokenBudget = DEFAULT_DAILY_TOKEN_BUDGET,
  missionTokenWarnThreshold = DEFAULT_MISSION_TOKEN_WARN_THRESHOLD,
} = {}) {
  const missing = validateRequiredEnv([
    'SLACK_BOT_TOKEN',
    'SLACK_APP_TOKEN',
    'SLACK_SIGNING_SECRET',
    'ANTHROPIC_API_KEY',
  ]);

  if (missing.length > 0) {
    throw new Error(`Missing required Slack bot environment variables: ${missing.join(', ')}`);
  }

  const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
  });

  const missionStore = createMissionStore(Object.keys(AGENTS));
  const guardCommand = createGuard(allowedUserIds, payload => payload.command.user_id);
  const guardAction = createGuard(allowedUserIds, payload => payload.body.user.id);

  app.command('/roster', guardCommand, async ({ ack, respond }) => {
    await ack();
    await respond(buildRosterResponse());
  });

  app.command('/agent-status', guardCommand, async ({ ack, respond }) => {
    await ack();
    await respond({ text: buildStatusText(missionStore) });
  });

  app.command('/budget', guardCommand, async ({ ack, respond }) => {
    await ack();
    await respond({ text: buildBudgetText(missionStore, dailyTokenBudget) });
  });

  for (const [actionId, action] of Object.entries(QUICK_ACTIONS)) {
    app.action(actionId, guardAction, async ({ ack, body, respond, client }) => {
      await ack();

      if (action.action === 'budget') {
        await respond({ text: buildBudgetText(missionStore, dailyTokenBudget), response_type: 'ephemeral' });
        return;
      }

      const blocker = getDispatchBlocker(missionStore, { maxConcurrentMissions, dailyTokenBudget });
      if (blocker) {
        await respond({ text: blocker, response_type: 'ephemeral' });
        return;
      }

      const agentNames = action.agents.map(agentId => AGENTS[agentId]?.name || agentId).join(' + ');
      const channelId = body.channel?.id || body.container?.channel_id;
      await respond({ text: `${action.emoji} Starting ${action.label}...`, response_type: 'ephemeral' });

      try {
        const { cancelled, outcome } = await runTrackedMission({
          missionStore,
          commandName: action.commandName,
          task: action.task,
          agents: action.agents,
          type: action.type,
          requestedBy: body.user.id,
          execute: () => action.agents.length > 1 ? runMission(action.agents, action.task) : runAgent(action.agents[0], action.task),
        });

        if (!channelId) {
          return;
        }

        const text = cancelled
          ? `:warning: *[CANCELLED]* ${agentNames} — ${action.label} was cancelled before posting results.`
          : formatMissionCompletion({
              outcome,
              type: action.type,
              task: action.task,
              emoji: action.emoji,
              agentNames,
              missionTokenWarnThreshold,
            });

        await client.chat.postMessage({ channel: channelId, text });
      } catch (error) {
        if (channelId) {
          await client.chat.postMessage({
            channel: channelId,
            text: `:x: *[ERROR]* ${agentNames} — ${action.label} failed: ${error.message}`,
          });
        }
      }
    });
  }

  for (const [commandName, missionConfig] of Object.entries(MISSIONS)) {
    app.command(`/${commandName}`, guardCommand, async ({ ack, respond, command, say }) => {
      await ack();

      const task = command.text?.trim();
      if (!task) {
        await respond({ text: `Usage: /${commandName} [your query]` });
        return;
      }

      const blocker = getDispatchBlocker(missionStore, { maxConcurrentMissions, dailyTokenBudget });
      if (blocker) {
        await respond({ text: blocker });
        return;
      }

      const agentNames = missionConfig.agents.map(agentId => AGENTS[agentId]?.name || agentId).join(' + ');
      await respond({ text: `${missionConfig.emoji} *[DISPATCHED]* ${agentNames} → /${commandName} "${task}"\nStand by...` });

      try {
        const { cancelled, outcome } = await runTrackedMission({
          missionStore,
          commandName,
          task,
          agents: missionConfig.agents,
          type: missionConfig.type,
          requestedBy: command.user_id,
          execute: () => runMission(missionConfig.agents, task),
        });

        const text = cancelled
          ? `:warning: *[CANCELLED]* ${agentNames} — /${commandName} "${task}" was cancelled before posting results.`
          : formatMissionCompletion({
              outcome,
              type: missionConfig.type,
              task,
              emoji: missionConfig.emoji,
              agentNames,
              missionTokenWarnThreshold,
            });

        await say({ text, channel: command.channel_id });
      } catch (error) {
        await say({
          text: `:x: *[ERROR]* ${agentNames} — /${commandName} failed: ${error.message}`,
          channel: command.channel_id,
        });
      }
    });
  }

  app.command('/dispatch', guardCommand, async ({ ack, respond, command, say }) => {
    await ack();

    const parts = command.text?.trim().split(/\s+/);
    if (!parts || parts.length < 2) {
      await respond({ text: `Usage: /dispatch [agent-name] [task]\nAgents: ${Object.keys(AGENTS).join(', ')}` });
      return;
    }

    const blocker = getDispatchBlocker(missionStore, { maxConcurrentMissions, dailyTokenBudget });
    if (blocker) {
      await respond({ text: blocker });
      return;
    }

    const agentId = parts[0].toLowerCase();
    const task = parts.slice(1).join(' ');
    const agent = AGENTS[agentId];

    if (!agent) {
      await respond({ text: `Unknown agent: "${agentId}"\nAvailable: ${Object.keys(AGENTS).join(', ')}` });
      return;
    }

    await respond({ text: `:rocket: *[DISPATCHED]* ${agent.name} → "${task}"` });

    try {
      const { cancelled, outcome } = await runTrackedMission({
        missionStore,
        commandName: 'dispatch',
        task,
        agents: [agentId],
        type: 'Direct Dispatch',
        requestedBy: command.user_id,
        execute: () => runAgent(agentId, task),
      });

      const text = cancelled
        ? `:warning: *[CANCELLED]* ${agent.name} → "${task}" was cancelled before posting results.`
        : formatMissionCompletion({
            outcome,
            type: 'Direct Dispatch',
            task,
            emoji: ':white_check_mark:',
            agentNames: agent.name,
            missionTokenWarnThreshold,
          });

      await say({ text, channel: command.channel_id });
    } catch (error) {
      await say({
        text: `:x: *[ERROR]* ${agent.name} — dispatch failed: ${error.message}`,
        channel: command.channel_id,
      });
    }
  });

  app.command('/kill', guardCommand, async ({ ack, respond, command }) => {
    await ack();
    const agentId = command.text?.trim().toLowerCase();

    if (!agentId) {
      await respond({ text: 'Usage: /kill [agent-name]' });
      return;
    }

    const cancelledMission = missionStore.cancelAgent(agentId, `Cancelled by ${command.user_name || command.user_id}.`);
    if (!cancelledMission) {
      await respond({ text: `${AGENTS[agentId]?.name || agentId} is not currently running.` });
      return;
    }

    await respond({ text: `:skull: *[KILL]* ${AGENTS[agentId]?.name || agentId} marked as cancelled for mission ${cancelledMission.id}.` });
  });

  return { app, missionStore };
}

export async function startSlackBot() {
  const { app } = createSlackApp();
  await app.start();
  console.log('⚡ Slack bot is running (Socket Mode)');
  console.log(`📋 ${Object.keys(AGENTS).length} agents loaded`);
  console.log(`🎯 ${Object.keys(MISSIONS).length} mission types ready`);
}

if (isMainModule(import.meta)) {
  startSlackBot().catch(error => {
    console.error('💀 Slack bot failed to start:', error.message);
    process.exit(1);
  });
}
