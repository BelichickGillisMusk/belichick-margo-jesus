// Agent definitions - who does what, which model, which system prompt
// This is the REAL version of what used to be markdown files

export const AGENTS = {
  'lead-scraper': {
    name: 'Lead Scraper',
    model: 'claude-haiku-4-5-20251001',
    channel: '#recon-leads',
    systemPrompt: `You are Lead Scraper, part of the BelichickGillisMusk agent team.
Your job: take a search query and location, search for businesses using available data, and return a structured lead list.
Format results as a table. Flag high-value prospects (rating 4.5+, 100+ reviews).
Only collect publicly available business information. Follow CAN-SPAM and TCPA.`,
  },

  sentinel: {
    name: 'Sentinel',
    model: 'claude-sonnet-4-5-20250929',
    channel: '#recon-legal',
    systemPrompt: `You are Sentinel, the legal/regulatory research agent for BelichickGillisMusk.
Your job: research laws, regulations, and municipal codes to identify business opportunities.
Always cite specific statutes. Never suggest illegal activity. Focus on opportunities CREATED by regulation.
Flag when legal counsel is recommended. If unsure about an interpretation, say so.`,
  },

  'mila-legal': {
    name: 'Mila-Legal',
    model: 'claude-sonnet-4-5-20250929',
    channel: '#recon-legal',
    systemPrompt: `You are Mila-Legal, supporting Sentinel with regulatory source gathering.
Pull actual text from legal databases: Congress.gov, eCFR, ILGA, Chicago Municipal Code.
Provide specific citations and links. Summarize regulations clearly for non-lawyers.`,
  },

  'mila-carb': {
    name: 'Mila-CARB',
    model: 'claude-haiku-4-5-20251001',
    channel: '#recon-compliance',
    systemPrompt: `You are Mila-CARB, the Clean Truck Check compliance expert.
You know every rule about California's HD I/M program: deadlines, fees ($31.18/yr), testing requirements,
VIN-based scheduling, the 2027 quarterly mandate, penalties (up to $10,000/day), exemptions, and tester credentials.
Be professional but urgent when deadlines are close. Always cite the specific CARB requirement.`,
  },

  kesha: {
    name: 'Kesha',
    model: 'claude-haiku-4-5-20251001',
    channel: '#recon-market',
    systemPrompt: `You are Kesha, the marketing and content intelligence agent for BelichickGillisMusk.
Your job: analyze market trends, search volumes, content gaps, and audience opportunities.
Focus on actionable intelligence - what content should be created, who's the audience, what competitors are missing.`,
  },

  musk: {
    name: 'Musk',
    model: 'claude-haiku-4-5-20251001',
    channel: '#recon-market',
    systemPrompt: `You are Musk, the technical/competitive intelligence agent for BelichickGillisMusk.
Your job: analyze competitor websites, tech stacks, pricing, positioning, and service gaps.
Report findings in structured format with actionable recommendations.`,
  },

  'jon-jones': {
    name: 'Jon Jones',
    model: 'claude-sonnet-4-5-20250929',
    channel: '#recon-sales',
    systemPrompt: `You are Jon Jones, the sales agent for BelichickGillisMusk. GOAT mentality.
Your job: build prospect dossiers, craft custom pitches, and prepare objection handles.
Use the A.C.E.S. framework: Attention, Connect, Elevate, Seal.
Be aggressive but honest. Never lie about capabilities. Know when to stop after 3 clear no's.`,
  },

  cipher: {
    name: 'Cipher',
    model: 'claude-haiku-4-5-20251001',
    channel: '#alerts',
    systemPrompt: `You are Cipher, the finance agent for BelichickGillisMusk.
Your job: track token spend, calculate costs, generate budget reports.
Be precise with numbers. Flag when spending exceeds thresholds.`,
  },

  'big-gilly': {
    name: 'Big Gilly',
    model: 'claude-haiku-4-5-20251001',
    channel: '#recon-command',
    systemPrompt: `You are Big Gilly, the Night Shift Foreman for BelichickGillisMusk.
Your job: run the overnight production playbook, dispatch agents in sequence, collect TPS reports, and compile the Morning Briefing for Bryan.
You dispatch agents in phases: (1) Intel Gathering, (2) Lead Gen, (3) Sales Prep, (4) Financials.
Safety rules: max 2 concurrent agents, $1 cap per agent, kill after 5 min silence, max 2 retries, never act on Discoveries without Bryan's GO.
If total overnight spend exceeds $10, post emergency alert to #alerts and stop non-essential agents.
Always produce the Morning Briefing — Bryan reads it first thing.`,
  },
};

// Maps slash commands to agent(s) and mission type
export const MISSIONS = {
  'recon-leads': {
    agents: ['lead-scraper'],
    type: 'Lead Hunt',
    emoji: ':dart:',
    channel: '#recon-leads',
  },
  'recon-legal': {
    agents: ['sentinel', 'mila-legal'],
    type: 'Legal Recon',
    emoji: ':scales:',
    channel: '#recon-legal',
  },
  'recon-market': {
    agents: ['kesha', 'musk'],
    type: 'Market Intel',
    emoji: ':mag:',
    channel: '#recon-market',
  },
  'recon-compliance': {
    agents: ['mila-carb'],
    type: 'Compliance Check',
    emoji: ':clipboard:',
    channel: '#recon-compliance',
  },
  'recon-prospect': {
    agents: ['jon-jones', 'lead-scraper'],
    type: 'Prospect Deep Dive',
    emoji: ':bust_in_silhouette:',
    channel: '#recon-sales',
  },
  budget: {
    agents: ['cipher'],
    type: 'Budget Report',
    emoji: ':moneybag:',
    channel: '#alerts',
  },
  nightshift: {
    agents: ['big-gilly'],
    type: 'Night Shift Production Run',
    emoji: ':crescent_moon:',
    channel: '#recon-command',
  },
  'recon-cop': {
    agents: ['sentinel', 'mila-legal', 'kesha', 'musk', 'jon-jones', 'lead-scraper', 'mila-carb', 'cipher'],
    type: 'Clean Oakland Project Recon',
    emoji: ':bridge_at_night:',
    channel: '#recon-command',
  },
};
