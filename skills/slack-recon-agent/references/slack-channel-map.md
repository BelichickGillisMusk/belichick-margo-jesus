# Slack Channel Map - RECON Operations

## Required Channels

Create these channels in your Slack workspace before enabling the integration.

### Command & Control
| Channel | Purpose | Who Posts | Who Reads |
|---------|---------|-----------|-----------|
| `#recon-command` | Dispatch missions, slash commands | Humans (you) | Belichick |
| `#agent-status` | Agent online/busy/done status | All agents | Everyone |
| `#alerts` | Budget warnings, kill switches, errors | Belichick, Cipher | Everyone |

### Intelligence Channels
| Channel | Purpose | Who Posts | Who Reads |
|---------|---------|-----------|-----------|
| `#recon-leads` | Prospect lists, business contacts | Lead Scraper | Jon Jones, You |
| `#recon-legal` | Regulation intel, compliance changes | Sentinel, Mila-Legal | Belichick, You |
| `#recon-market` | Market research, competitor analysis | Kesha, Musk | Belichick, You |
| `#recon-sales` | Prospect dossiers, pitch strategies | Jon Jones | You |
| `#recon-compliance` | Vehicle/fleet compliance status | Mila-CARB | You, Fleet Owners |

## Channel Naming Convention

All RECON channels use the `#recon-` prefix for easy filtering and organization.

## Channel Creation Script (Slack API)

```bash
# Create all RECON channels via Slack API
CHANNELS=("recon-command" "recon-leads" "recon-legal" "recon-market" "recon-sales" "recon-compliance" "agent-status" "alerts")

for CHANNEL in "${CHANNELS[@]}"; do
  curl -s -X POST "https://slack.com/api/conversations.create" \
    -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\": \"$CHANNEL\", \"is_private\": false}"
  echo "Created #$CHANNEL"
done
```

## Agent-to-Channel Routing

```
/recon-leads    → Lead Scraper → #recon-leads
/recon-legal    → Sentinel + Mila-Legal → #recon-legal
/recon-market   → Kesha + Musk → #recon-market
/recon-compliance → Mila-CARB → #recon-compliance
/recon-prospect → Jon Jones + Lead Scraper → #recon-sales
/agent-status   → Belichick → #agent-status
/budget         → Cipher → #alerts
/kill           → Belichick → #alerts
/dispatch       → Belichick (routes to target agent) → agent's channel
```

## Notification Rules

| Event | Channel | Urgency |
|-------|---------|---------|
| Mission complete | Target channel | Normal |
| High-value lead found (rating 4.5+, 100+ reviews) | #recon-leads + #alerts | High |
| New regulation detected | #recon-legal + #alerts | High |
| Agent timeout/failure | #alerts | Critical |
| Budget threshold hit (80%) | #alerts | Critical |
| Kill switch triggered | #alerts | Critical |
| Compliance deadline within 7 days | #recon-compliance + #alerts | High |
