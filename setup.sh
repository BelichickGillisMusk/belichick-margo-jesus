#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────
# BelichickGillisMusk — Mac Setup Script
# Installs deps, creates directories, configures OpenClaw
# ─────────────────────────────────────────────────────────

# ── Colors ──
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

info()  { echo -e "${BLUE}[INFO]${NC}  $1"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $1"; }
fail()  { echo -e "${RED}[FAIL]${NC}  $1"; }

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_TEMPLATE="$SCRIPT_DIR/openclaw-config.json5"
OPENCLAW_DIR="$HOME/.openclaw"
CONFIG_DEST="$OPENCLAW_DIR/openclaw.json"

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   BelichickGillisMusk — Mac Setup                ║${NC}"
echo -e "${BOLD}║   Local AI Agent Team Installer                  ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════╝${NC}"
echo ""

# ── Step 0: Check macOS ──
if [[ "$(uname)" != "Darwin" ]]; then
    warn "This script is designed for macOS. Detected: $(uname)"
    read -rp "Continue anyway? (y/N): " cont
    [[ "$cont" =~ ^[Yy]$ ]] || { info "Exiting."; exit 0; }
fi

# ── Step 1: Check Homebrew ──
info "Checking Homebrew..."
if command -v brew &>/dev/null; then
    ok "Homebrew installed"
else
    warn "Homebrew not found. Installing..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    ok "Homebrew installed"
fi

# ── Step 2: Install CLI dependencies ──
BREW_DEPS=("himalaya" "gh" "jq" "ollama")
for dep in "${BREW_DEPS[@]}"; do
    if command -v "$dep" &>/dev/null; then
        ok "$dep already installed"
    else
        info "Installing $dep..."
        brew install "$dep"
        ok "$dep installed"
    fi
done

# gcloud needs a cask
if command -v gcloud &>/dev/null; then
    ok "gcloud already installed"
else
    info "Installing Google Cloud SDK..."
    brew install --cask google-cloud-sdk
    ok "gcloud installed"
fi

# ── Step 3: Install Node.js (if missing) + OpenClaw ──
if command -v node &>/dev/null; then
    ok "Node.js installed ($(node --version))"
else
    info "Installing Node.js..."
    brew install node
    ok "Node.js installed"
fi

info "Installing OpenClaw..."
npm install -g openclaw@latest 2>/dev/null && ok "OpenClaw installed" || warn "OpenClaw install failed — check npm registry availability"

# ── Step 4: Create directory structure ──
info "Creating directory structure..."
mkdir -p "$OPENCLAW_DIR/logs"
mkdir -p "$OPENCLAW_DIR/workspaces"
mkdir -p "$OPENCLAW_DIR/vault"
chmod 700 "$OPENCLAW_DIR/vault"
ok "Created ~/.openclaw/ with logs/, workspaces/, vault/"

# ── Step 5: Check config template ──
if [[ ! -f "$CONFIG_TEMPLATE" ]]; then
    fail "Config template not found at $CONFIG_TEMPLATE"
    fail "Make sure you're running this from the repo root."
    exit 1
fi
ok "Config template found"

# ── Step 6: Generate gateway token ──
info "Generating gateway auth token..."
GATEWAY_TOKEN=$(openssl rand -hex 32)
ok "Token generated"

# ── Step 7: Strip JSON5 comments and build config ──
info "Building config from template..."

# Strip // comments (but not URLs like https://) and trailing commas before } or ]
CONFIG_JSON=$(sed \
    -e 's|^\s*//.*||' \
    -e 's|\s*//[^"]*$||' \
    "$CONFIG_TEMPLATE" | \
    tr '\n' '\f' | \
    sed -E 's/,(\f *[}\]])/\1/g' | \
    tr '\f' '\n' | \
    grep -v '^\s*$')

# ── Step 8: Inject gateway token ──
CONFIG_JSON=$(echo "$CONFIG_JSON" | sed "s|GENERATE-WITH: openssl rand -hex 32|$GATEWAY_TOKEN|")
ok "Gateway token injected"

# ── Step 9: Prompt for Gmail credentials ──
echo ""
echo -e "${BOLD}── Email Configuration ──${NC}"
echo "You need a Gmail address and an app-specific password."
echo "Get one at: https://myaccount.google.com/apppasswords"
echo ""
read -rp "Gmail address (or press Enter to skip): " GMAIL_ADDR

if [[ -n "$GMAIL_ADDR" ]]; then
    read -rsp "App-specific password: " GMAIL_PASS
    echo ""
    CONFIG_JSON=$(echo "$CONFIG_JSON" | sed "s|CONFIGURE: your-email@gmail.com|$GMAIL_ADDR|g")
    CONFIG_JSON=$(echo "$CONFIG_JSON" | sed "s|CONFIGURE: app-specific-password (NOT your real password)|$GMAIL_PASS|")
    CONFIG_JSON=$(echo "$CONFIG_JSON" | sed "s|CONFIGURE: BelichickGillisMusk <your-email@gmail.com>|BelichickGillisMusk <$GMAIL_ADDR>|")
    ok "Email configured"
else
    warn "Email skipped — configure manually in $CONFIG_DEST"
fi

# ── Step 10: Prompt for Slack credentials ──
echo ""
echo -e "${BOLD}── Slack Configuration ──${NC}"
echo "Create a Slack app at: https://api.slack.com/apps"
echo "Scopes needed: chat:write, channels:read, channels:history"
echo ""
read -rp "Slack Bot Token (xoxb-...) (or press Enter to skip): " SLACK_BOT

if [[ -n "$SLACK_BOT" ]]; then
    read -rp "Slack App Token (xapp-...): " SLACK_APP
    read -rp "Slack Signing Secret: " SLACK_SECRET
    read -rp "Default channel (e.g. #general): " SLACK_CHANNEL
    CONFIG_JSON=$(echo "$CONFIG_JSON" | sed "s|CONFIGURE: xoxb-your-slack-bot-token|$SLACK_BOT|")
    CONFIG_JSON=$(echo "$CONFIG_JSON" | sed "s|CONFIGURE: xapp-your-slack-app-token|$SLACK_APP|")
    CONFIG_JSON=$(echo "$CONFIG_JSON" | sed "s|CONFIGURE: your-signing-secret|$SLACK_SECRET|")
    CONFIG_JSON=$(echo "$CONFIG_JSON" | sed "s|CONFIGURE: #general or your-channel-id|$SLACK_CHANNEL|")
    ok "Slack configured"
else
    warn "Slack skipped — configure manually in $CONFIG_DEST"
fi

# ── Step 11: Write final config ──
echo "$CONFIG_JSON" > "$CONFIG_DEST"
chmod 600 "$CONFIG_DEST"
ok "Config written to $CONFIG_DEST (permissions: 600)"

# ── Step 12: Run validation ──
echo ""
if [[ -x "$SCRIPT_DIR/validate.sh" ]]; then
    info "Running validation..."
    "$SCRIPT_DIR/validate.sh"
else
    warn "validate.sh not found or not executable — skipping validation"
fi

# ── Done ──
echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║   Setup complete!                                ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════╝${NC}"
echo ""
echo "  Gateway token: ${GATEWAY_TOKEN:0:8}...${GATEWAY_TOKEN: -8}"
echo "  Config:        $CONFIG_DEST"
echo ""
echo "  Next: run 'openclaw start' to launch the agent team."
echo ""
