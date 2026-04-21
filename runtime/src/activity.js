import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getProjectRoot, getAllAgents } from './config.js';

const ACTIVITY_PATH = join(getProjectRoot(), 'agents-site', 'activity.json');

function loadActivity() {
  if (!existsSync(ACTIVITY_PATH)) {
    return {
      lastUpdated: new Date().toISOString(),
      agents: getAllAgents().map(a => ({
        id: a.id, name: a.name, role: a.role,
        status: 'idle', currentTask: null,
        lastCompleted: null, lastCompletedAt: null,
      })),
      feed: [],
    };
  }
  return JSON.parse(readFileSync(ACTIVITY_PATH, 'utf-8'));
}

function saveActivity(data) {
  data.lastUpdated = new Date().toISOString();
  writeFileSync(ACTIVITY_PATH, JSON.stringify(data, null, 2));
}

export async function updateAgentStatus(agentId, status, currentTask, lastCompleted) {
  const data = loadActivity();
  const agent = data.agents.find(a => a.id === agentId);
  if (agent) {
    agent.status = status;
    agent.currentTask = currentTask || null;
    if (lastCompleted) {
      agent.lastCompleted = lastCompleted;
      agent.lastCompletedAt = new Date().toISOString();
    }
  }
  saveActivity(data);
}

export async function logActivity(agentId, action, type = 'task') {
  const data = loadActivity();
  data.feed.unshift({
    agent: agentId,
    action,
    timestamp: new Date().toISOString(),
    type,
  });
  if (data.feed.length > 50) data.feed = data.feed.slice(0, 50);
  saveActivity(data);
}
