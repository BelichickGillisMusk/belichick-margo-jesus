#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────
# BelichickGillisMusk — Post-Install Validation
# Checks that everything is configured and ready to run
# ─────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

PASS=0
FAIL=0
WARN=0

check_pass() { echo -e "  ${GREEN}✓${NC} $1"; ((PASS++)); }
check_fail() { echo -e "  ${RED}✗${NC} $1"; ((FAIL++)); }
check_warn() { echo -e "  ${YELLOW}!${NC} $1"; ((WARN++)); }

OPENCLAW_DIR="$HOME/.openclaw"
CONFIG="$OPENCLAW_DIR/openclaw.json"

echo ""
echo -e "${BOLD}BelichickGillisMusk — System Validation${NC}"
echo -e "${BOLD}────────────────────────────────────────${NC}"

# ── CLI Tools ──
echo ""
echo -e "${BOLD}CLI Tools${NC}"
for tool in node npm himalaya gh jq ollama gcloud; do
    if command -v "$tool" &>/dev/null; then
        check_pass "$tool"
    else
        check_fail "$tool — not found in PATH"
    fi
done

if command -v openclaw &>/dev/null; then
    check_pass "openclaw"
else
    check_fail "openclaw — not installed (npm install -g openclaw@latest)"
fi

# ── Directory Structure ──
echo ""
echo -e "${BOLD}Directory Structure${NC}"
for dir in "$OPENCLAW_DIR" "$OPENCLAW_DIR/logs" "$OPENCLAW_DIR/workspaces" "$OPENCLAW_DIR/vault"; do
    if [[ -d "$dir" ]]; then
        check_pass "$dir"
    else
        check_fail "$dir — missing"
    fi
done

# Vault permissions
if [[ -d "$OPENCLAW_DIR/vault" ]]; then
    PERMS=$(stat -f "%Lp" "$OPENCLAW_DIR/vault" 2>/dev/null || stat -c "%a" "$OPENCLAW_DIR/vault" 2>/dev/null)
    if [[ "$PERMS" == "700" ]]; then
        check_pass "vault permissions (700)"
    else
        check_warn "vault permissions are $PERMS — should be 700"
    fi
fi

# ── Config File ──
echo ""
echo -e "${BOLD}Configuration${NC}"
if [[ -f "$CONFIG" ]]; then
    check_pass "Config file exists"

    # Check it's valid JSON
    if jq empty "$CONFIG" 2>/dev/null; then
        check_pass "Config is valid JSON"
    else
        check_fail "Config is NOT valid JSON — check for syntax errors"
    fi

    # Check config permissions
    CONF_PERMS=$(stat -f "%Lp" "$CONFIG" 2>/dev/null || stat -c "%a" "$CONFIG" 2>/dev/null)
    if [[ "$CONF_PERMS" == "600" ]]; then
        check_pass "Config permissions (600)"
    else
        check_warn "Config permissions are $CONF_PERMS — should be 600"
    fi

    # Check gateway token
    TOKEN=$(jq -r '.gateway.auth.token // empty' "$CONFIG" 2>/dev/null)
    if [[ -n "$TOKEN" && "$TOKEN" != *"GENERATE"* ]]; then
        check_pass "Gateway token configured"
    else
        check_fail "Gateway token not set"
    fi

    # Check Anthropic API key
    ANTHROPIC_KEY=$(jq -r '.apiKeys.anthropic // empty' "$CONFIG" 2>/dev/null)
    if [[ -n "$ANTHROPIC_KEY" && "$ANTHROPIC_KEY" != *"CONFIGURE"* ]]; then
        check_pass "Anthropic API key present"
    else
        check_fail "Anthropic API key missing"
    fi

    # Check Gemini API key
    GEMINI_KEY=$(jq -r '.apiKeys.google // empty' "$CONFIG" 2>/dev/null)
    if [[ -n "$GEMINI_KEY" && "$GEMINI_KEY" != *"CONFIGURE"* ]]; then
        check_pass "Gemini API key present"
    else
        check_warn "Gemini API key not configured (optional)"
    fi

    # Check email
    EMAIL_USER=$(jq -r '.email.smtp.auth.user // empty' "$CONFIG" 2>/dev/null)
    if [[ -n "$EMAIL_USER" && "$EMAIL_USER" != *"CONFIGURE"* ]]; then
        check_pass "Email configured ($EMAIL_USER)"
    else
        check_warn "Email not configured — set up later in $CONFIG"
    fi

    # Check Slack
    SLACK_TOKEN=$(jq -r '.slack.auth.botToken // empty' "$CONFIG" 2>/dev/null)
    if [[ -n "$SLACK_TOKEN" && "$SLACK_TOKEN" != *"CONFIGURE"* ]]; then
        check_pass "Slack bot token configured"
    else
        check_warn "Slack not configured — set up later in $CONFIG"
    fi

    # Check guardian enabled
    GUARDIAN=$(jq -r '.guardian.enabled // false' "$CONFIG" 2>/dev/null)
    if [[ "$GUARDIAN" == "true" ]]; then
        check_pass "Jon Jones guardian enabled"
    else
        check_fail "Jon Jones guardian is DISABLED — security risk"
    fi

else
    check_fail "Config file not found at $CONFIG"
    check_fail "Run setup.sh first"
fi

# ── Summary ──
echo ""
echo -e "${BOLD}────────────────────────────────────────${NC}"
TOTAL=$((PASS + FAIL + WARN))
echo -e "  ${GREEN}$PASS passed${NC}  ${RED}$FAIL failed${NC}  ${YELLOW}$WARN warnings${NC}  (${TOTAL} total)"
echo ""

if [[ $FAIL -eq 0 ]]; then
    echo -e "  ${GREEN}${BOLD}Ready to launch!${NC}  Run: openclaw start"
else
    echo -e "  ${RED}${BOLD}Fix the failures above before launching.${NC}"
fi
echo ""

exit "$FAIL"
