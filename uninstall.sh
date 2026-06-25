#!/usr/bin/env bash
set -euo pipefail

# ─────────────────────────────────────────────────────────
# BelichickGillisMusk — Uninstall
# Removes ~/.openclaw/ and the global openclaw npm package
# ─────────────────────────────────────────────────────────

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BOLD='\033[1m'
NC='\033[0m'

OPENCLAW_DIR="$HOME/.openclaw"

echo ""
echo -e "${BOLD}BelichickGillisMusk — Uninstall${NC}"
echo ""

# ── Check what exists ──
if [[ -d "$OPENCLAW_DIR" ]]; then
    echo "  Found: $OPENCLAW_DIR"
    echo ""
    echo "  This will remove:"
    echo "    - $OPENCLAW_DIR/openclaw.json (config with API keys)"
    echo "    - $OPENCLAW_DIR/logs/ (audit logs)"
    echo "    - $OPENCLAW_DIR/workspaces/ (agent workspaces)"
    echo "    - $OPENCLAW_DIR/vault/ (encrypted vault)"
    echo ""
    echo -e "  ${RED}${BOLD}This cannot be undone.${NC}"
    echo ""
    read -rp "  Delete $OPENCLAW_DIR and all contents? (type YES to confirm): " confirm
    if [[ "$confirm" == "YES" ]]; then
        rm -rf "$OPENCLAW_DIR"
        echo -e "  ${GREEN}Removed $OPENCLAW_DIR${NC}"
    else
        echo "  Cancelled."
    fi
else
    echo "  $OPENCLAW_DIR not found — nothing to remove."
fi

# ── Uninstall openclaw npm package ──
echo ""
if command -v openclaw &>/dev/null; then
    read -rp "  Uninstall openclaw npm package? (y/N): " uninstall_npm
    if [[ "$uninstall_npm" =~ ^[Yy]$ ]]; then
        npm uninstall -g openclaw 2>/dev/null && echo -e "  ${GREEN}Uninstalled openclaw${NC}" || echo -e "  ${YELLOW}Could not uninstall openclaw${NC}"
    else
        echo "  Skipped."
    fi
else
    echo "  openclaw not installed globally — nothing to uninstall."
fi

echo ""
echo "  Done. Homebrew packages (himalaya, gh, jq, etc.) were NOT removed."
echo "  To remove those: brew uninstall himalaya gh jq ollama"
echo ""
