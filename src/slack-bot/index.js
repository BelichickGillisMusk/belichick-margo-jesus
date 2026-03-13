import 'dotenv/config';
import bolt from '@slack/bolt';
import { AGENTS, MISSIONS } from './agents.js';
import { runAgent, runMission } from './dispatch.js';

const { App } = bolt;

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  appToken: process.env.SLACK_APP_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
});

// Track active missions for /agent-status
const activeMissions = new Map();
const missionLog = [];

// ── /roster ──────────────────────────────────────────────────
app.command('/roster', async ({ ack, respond }) => {
  await ack();
  const roster = Object.entries(AGENTS)
    .map(([id, a]) => `*${a.name}* — ${a.systemPrompt.split('\n')[1]?.trim() || id}`)
    .join('\n');

  await respond({
    text: `*BELICHICKGILLISMUSK AGENT ROSTER*\n\n${roster}\n\n` +
      `*Commands:* /recon-leads, /recon-legal, /recon-market, /recon-compliance, /recon-prospect, /budget, /agent-status, /roster`,
  });
});

// ── /agent-status ────────────────────────────────────────────
app.command('/agent-status', async ({ ack, respond }) => {
  await ack();

  const lines = Object.entries(AGENTS).map(([id, a]) => {
    const active = activeMissions.get(id);
    const status = active ? ':large_orange_circle: BUSY' : ':large_green_circle: IDLE';
    const lastMission = missionLog.filter(m => m.agents.includes(id)).pop();
    const ago = lastMission ? timeSince(lastMission.time) : 'never';
    return `${status} *${a.name}* — last: ${lastMission?.task?.slice(0, 40) || 'none'}... (${ago})`;
  });

  const activeCount = activeMissions.size;
  const todayMissions = missionLog.filter(m => isToday(m.time));
  const todayTokens = todayMissions.reduce((s, m) => s + (m.tokens || 0), 0);

  await respond({
    text: `*AGENT STATUS PULSE* — ${new Date().toLocaleString()}\n\n` +
      lines.join('\n') +
      `\n\nActive: ${activeCount} | Today: ${todayMissions.length} missions | ${todayTokens} tokens`,
  });
});

// ── RECON Commands ───────────────────────────────────────────
// Register a handler for each mission type
for (const [command, mission] of Object.entries(MISSIONS)) {
  app.command(`/${command}`, async ({ ack, respond, command: cmd, say }) => {
    await ack();

    const task = cmd.text?.trim();
    if (!task) {
      await respond({ text: `Usage: /${command} [your query]` });
      return;
    }

    const names = mission.agents.map(id => AGENTS[id]?.name || id).join(' + ');

    // Mark agents busy
    for (const id of mission.agents) activeMissions.set(id, task);

    await respond({
      text: `${mission.emoji} *[DISPATCHED]* ${names} → /${command} "${task}"\nStand by...`,
    });

    try {
      const { combined, totalTokens } = await runMission(mission.agents, task);

      // Log the mission
      missionLog.push({
        time: Date.now(),
        command,
        task,
        agents: mission.agents,
        tokens: totalTokens,
      });

      // Truncate for Slack's 3000 char limit per block
      const output = combined.length > 2800
        ? combined.slice(0, 2800) + '\n\n_(truncated — full output available on request)_'
        : combined;

      await say({
        text: `${mission.emoji} *[${names}]* ${mission.type.toUpperCase()} COMPLETE: "${task}"\n\n${output}\n\n_${totalTokens} tokens used_`,
        channel: cmd.channel_id,
      });
    } catch (err) {
      await say({
        text: `:x: *[ERROR]* ${names} — /${command} failed: ${err.message}`,
        channel: cmd.channel_id,
      });
    } finally {
      for (const id of mission.agents) activeMissions.delete(id);
    }
  });
}

// ── /dispatch [agent] [task] ─────────────────────────────────
app.command('/dispatch', async ({ ack, respond, command: cmd, say }) => {
  await ack();

  const parts = cmd.text?.trim().split(/\s+/);
  if (!parts || parts.length < 2) {
    await respond({ text: 'Usage: /dispatch [agent-name] [task]\nAgents: ' + Object.keys(AGENTS).join(', ') });
    return;
  }

  const agentId = parts[0].toLowerCase();
  const task = parts.slice(1).join(' ');

  if (!AGENTS[agentId]) {
    await respond({
      text: `Unknown agent: "${agentId}"\nAvailable: ${Object.keys(AGENTS).join(', ')}`,
    });
    return;
  }

  activeMissions.set(agentId, task);
  await respond({ text: `:rocket: *[DISPATCHED]* ${AGENTS[agentId].name} → "${task}"` });

  try {
    const result = await runAgent(agentId, task);

    missionLog.push({
      time: Date.now(),
      command: 'dispatch',
      task,
      agents: [agentId],
      tokens: result.tokens,
    });

    const output = result.text.length > 2800
      ? result.text.slice(0, 2800) + '\n\n_(truncated)_'
      : result.text;

    await say({
      text: `:white_check_mark: *[${result.name}]* COMPLETE (${result.elapsed}s, ${result.tokens} tokens):\n\n${output}`,
      channel: cmd.channel_id,
    });
  } catch (err) {
    await say({
      text: `:x: *[ERROR]* ${AGENTS[agentId].name} — dispatch failed: ${err.message}`,
      channel: cmd.channel_id,
    });
  } finally {
    activeMissions.delete(agentId);
  }
});

// ── /kill [agent] ────────────────────────────────────────────
app.command('/kill', async ({ ack, respond, command: cmd }) => {
  await ack();
  const agentId = cmd.text?.trim().toLowerCase();

  if (!agentId) {
    await respond({ text: 'Usage: /kill [agent-name]' });
    return;
  }

  if (activeMissions.has(agentId)) {
    activeMissions.delete(agentId);
    await respond({ text: `:skull: *[KILL]* Belichick killed ${AGENTS[agentId]?.name || agentId}.` });
  } else {
    await respond({ text: `${AGENTS[agentId]?.name || agentId} is not currently running.` });
  }
});

// ── Helpers ──────────────────────────────────────────────────
function timeSince(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function isToday(timestamp) {
  return new Date(timestamp).toDateString() === new Date().toDateString();
}

// ── Start ────────────────────────────────────────────────────
(async () => {
  await app.start();
  console.log('⚡ Slack bot is running (Socket Mode)');
  console.log(`📋 ${Object.keys(AGENTS).length} agents loaded`);
  console.log(`🎯 ${Object.keys(MISSIONS).length} mission types ready`);
  console.log('Commands: /roster, /agent-status, /recon-leads, /recon-legal, /recon-market, /recon-compliance, /recon-prospect, /dispatch, /kill, /budget');
})();
