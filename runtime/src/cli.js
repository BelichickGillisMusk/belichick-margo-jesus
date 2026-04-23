#!/usr/bin/env node
import { runProject } from './orchestrator.js';
import { getApiKey, getAllAgents, getAgent, generateDeployKey, verifyDeployKey, hasDeployKey, getDeployKeyInfo } from './config.js';
import { runAgent } from './agent.js';
import { logActivity } from './activity.js';

const BOLD = '\x1b[1m';
const DIM = '\x1b[2m';
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const NC = '\x1b[0m';

function banner() {
  console.log(`
${BOLD}  ╔═══════════════════════════════════════╗
  ║  SilverbackAI — Agent Office          ║
  ║  ELITE DEPLOY ITERATE DOMINATE        ║
  ╚═══════════════════════════════════════╝${NC}
`);
}

function usage() {
  banner();
  console.log(`${BOLD}Usage:${NC}

  ${GREEN}node src/cli.js project${NC} ${DIM}"Build a landing page for Clean Truck Check"${NC}
    Give Belichick a project. He breaks it into tasks and delegates to sub-agents.

  ${GREEN}node src/cli.js task${NC} ${DIM}<agent-id> "Draft 5 cold emails for fleet managers"${NC}
    Send a task directly to a specific agent (bypasses Belichick).

  ${GREEN}node src/cli.js roster${NC}
    List all available agents and their roles.

  ${GREEN}node src/cli.js status${NC}
    Show current agent status from activity.json.

  ${GREEN}node src/cli.js keygen${NC}
    Generate a deploy key. Only 1 person gets this key — store it safely.

  ${GREEN}node src/cli.js keyinfo${NC}
    Show who owns the deploy key and when it was created.

${BOLD}Agents:${NC}`);

  getAllAgents().forEach(a => {
    console.log(`  ${BLUE}${a.id.padEnd(18)}${NC} ${a.name} — ${DIM}${a.role}${NC}`);
  });

  console.log(`
${BOLD}Environment:${NC}
  Set ${YELLOW}ANTHROPIC_API_KEY${NC} or configure ${DIM}~/.openclaw/openclaw.json${NC}
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === 'help' || command === '--help') {
    usage();
    process.exit(0);
  }

  if (command === 'roster') {
    banner();
    console.log(`${BOLD}  Agent Roster${NC}\n`);
    getAllAgents().forEach(a => {
      console.log(`  ${BLUE}${a.id.padEnd(18)}${NC} ${BOLD}${a.name}${NC}`);
      console.log(`  ${''.padEnd(18)} ${DIM}${a.role}${NC}\n`);
    });
    return;
  }

  if (command === 'status') {
    banner();
    const { readFileSync, existsSync } = await import('fs');
    const { join } = await import('path');
    const { getProjectRoot } = await import('./config.js');
    const actPath = join(getProjectRoot(), 'agents-site', 'activity.json');
    if (!existsSync(actPath)) {
      console.log(`  ${DIM}No activity data yet.${NC}`);
      return;
    }
    const data = JSON.parse(readFileSync(actPath, 'utf-8'));
    console.log(`${BOLD}  Agent Status${NC} ${DIM}(updated ${data.lastUpdated})${NC}\n`);
    data.agents.forEach(a => {
      const statusColor = a.status === 'working' ? GREEN : a.status === 'blocked' ? RED : DIM;
      console.log(`  ${statusColor}●${NC} ${BOLD}${a.name.padEnd(20)}${NC} ${statusColor}${a.status}${NC}`);
      if (a.currentTask) console.log(`    ${DIM}Now: ${a.currentTask}${NC}`);
      if (a.lastCompleted) console.log(`    ${DIM}Last: ${a.lastCompleted}${NC}`);
    });
    console.log('');
    if (data.feed.length > 0) {
      console.log(`${BOLD}  Recent Activity${NC}\n`);
      data.feed.slice(0, 10).forEach(f => {
        const time = new Date(f.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        console.log(`  ${DIM}${time}${NC} ${BLUE}${f.agent}${NC} ${f.action}`);
      });
      console.log('');
    }
    return;
  }

  if (command === 'keygen') {
    banner();
    if (hasDeployKey()) {
      const info = getDeployKeyInfo();
      console.error(`${RED}  Deploy key already exists.${NC}`);
      console.error(`  Owner: ${BOLD}${info.owner}${NC}`);
      console.error(`  Created: ${info.created}`);
      console.error(`  Machine: ${info.machine}`);
      console.error(`\n  ${DIM}To regenerate, delete ~/.openclaw/deploy.key first.${NC}\n`);
      process.exit(1);
    }
    const key = generateDeployKey();
    console.log(`${GREEN}  Deploy key generated.${NC}\n`);
    console.log(`  ${BOLD}YOUR KEY (save this — it won't be shown again):${NC}\n`);
    console.log(`  ${YELLOW}${key}${NC}\n`);
    console.log(`  ${DIM}Stored hash at ~/.openclaw/deploy.key (mode 600)${NC}`);
    console.log(`  ${DIM}Set OPENCLAW_DEPLOY_KEY=<key> to authenticate.${NC}\n`);
    console.log(`  ${RED}${BOLD}Only you have this key. No one else can run agents or deploy.${NC}\n`);
    return;
  }

  if (command === 'keyinfo') {
    banner();
    const info = getDeployKeyInfo();
    if (!info) {
      console.log(`  ${DIM}No deploy key registered. Run: node src/cli.js keygen${NC}\n`);
      return;
    }
    console.log(`${BOLD}  Deploy Key Info${NC}\n`);
    console.log(`  Owner:   ${BOLD}${info.owner}${NC}`);
    console.log(`  Created: ${info.created}`);
    console.log(`  Machine: ${info.machine}`);
    console.log(`  Hash:    ${DIM}${info.hash.slice(0, 12)}...${NC}\n`);
    return;
  }

  function requireDeployKey() {
    if (!hasDeployKey()) {
      console.error(`\n${RED}  No deploy key registered.${NC}`);
      console.error(`  Run: ${BOLD}node src/cli.js keygen${NC} to create one.\n`);
      process.exit(1);
    }
    const provided = process.env.OPENCLAW_DEPLOY_KEY;
    if (!provided) {
      console.error(`\n${RED}  Deploy key required.${NC}`);
      console.error(`  Set ${YELLOW}OPENCLAW_DEPLOY_KEY${NC} environment variable.\n`);
      console.error(`  ${DIM}Example: OPENCLAW_DEPLOY_KEY=<your-key> node src/cli.js project "..."${NC}\n`);
      process.exit(1);
    }
    const result = verifyDeployKey(provided);
    if (!result.valid) {
      console.error(`\n${RED}  ${result.reason}${NC}\n`);
      process.exit(1);
    }
  }

  function requireApiKey() {
    const key = getApiKey();
    if (!key) {
      console.error(`\n${RED}  No API key found.${NC}`);
      console.error(`  Set ANTHROPIC_API_KEY environment variable or configure ~/.openclaw/openclaw.json\n`);
      process.exit(1);
    }
  }

  if (command === 'project') {
    requireDeployKey();
    requireApiKey();
    const project = args.slice(1).join(' ');
    if (!project) {
      console.error(`\n${RED}  Provide a project description.${NC}`);
      console.error(`  Example: ${DIM}node src/cli.js project "Build a landing page for Clean Truck Check"${NC}\n`);
      process.exit(1);
    }
    banner();
    const start = Date.now();
    try {
      const result = await runProject(project);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`\n${GREEN}  Project complete in ${elapsed}s${NC}\n`);
      if (result) console.log(result);
    } catch (err) {
      console.error(`\n${RED}  Project failed: ${err.message}${NC}\n`);
      process.exit(1);
    }
    return;
  }

  if (command === 'task') {
    const agentId = args[1];
    const task = args.slice(2).join(' ');
    if (!agentId || !task) {
      console.error(`\n${RED}  Provide agent ID and task.${NC}`);
      console.error(`  Example: ${DIM}node src/cli.js task closer "Draft 5 cold emails for fleet managers"${NC}\n`);
      process.exit(1);
    }
    const agent = getAgent(agentId);
    if (!agent) {
      console.error(`\n${RED}  Agent not found: ${agentId}${NC}`);
      console.error(`  Available: ${getAllAgents().map(a => a.id).join(', ')}\n`);
      process.exit(1);
    }
    requireDeployKey();
    requireApiKey();
    banner();
    console.log(`  Sending task to ${BOLD}${agent.name}${NC}...\n`);
    const start = Date.now();
    try {
      const result = await runAgent(agent, task);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`\n${GREEN}  Done in ${elapsed}s${NC}\n`);
      console.log(result);
    } catch (err) {
      console.error(`\n${RED}  Task failed: ${err.message}${NC}\n`);
      process.exit(1);
    }
    return;
  }

  console.error(`\n${RED}  Unknown command: ${command}${NC}`);
  usage();
  process.exit(1);
}

main().catch(err => {
  console.error(`\n${RED}  Fatal: ${err.message}${NC}\n`);
  process.exit(1);
});
