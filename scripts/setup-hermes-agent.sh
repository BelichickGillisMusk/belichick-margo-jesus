#!/usr/bin/env bash
set -euo pipefail

# Idempotent bootstrap for Cursor/Cloud agent startup environments.
# It prepares the user-level Hermes Agent install without storing secrets in repo.

HERMES_INSTALL_URL="${HERMES_INSTALL_URL:-https://hermes-agent.nousresearch.com/install.sh}"
HERMES_HOME="${HERMES_HOME:-$HOME/.hermes}"
LOCAL_BIN="$HOME/.local/bin"

log() {
  printf '[hermes-setup] %s\n' "$*"
}

append_path_to_shell_rc() {
  local rc_file="$1"
  local marker="# Added by BelichickGillisMusk Hermes startup bootstrap"

  if [[ -f "$rc_file" ]]; then
    local rc_contents
    rc_contents="$(<"$rc_file")"
    if [[ "$rc_contents" == *"$marker"* ]]; then
      return
    fi
  else
    touch "$rc_file"
  fi

  {
    printf '\n%s\n' "$marker"
    printf 'export PATH="$HOME/.local/bin:$PATH"\n'
  } >> "$rc_file"
}

ensure_local_bin_on_path() {
  mkdir -p "$LOCAL_BIN"

  if [[ ":$PATH:" != *":$LOCAL_BIN:"* ]]; then
    export PATH="$LOCAL_BIN:$PATH"
  fi

  append_path_to_shell_rc "$HOME/.bashrc"
  append_path_to_shell_rc "$HOME/.profile"
}

install_uv() {
  if command -v uv >/dev/null 2>&1; then
    log "uv already available: $(uv --version)"
    return
  fi

  log "Installing uv package manager"
  curl -LsSf https://astral.sh/uv/install.sh | sh
  export PATH="$LOCAL_BIN:$PATH"
}

install_python311() {
  if command -v python3.11 >/dev/null 2>&1; then
    log "Python 3.11 already available: $(python3.11 --version)"
    return
  fi

  log "Installing Python 3.11 through uv"
  uv python install 3.11
}

run_apt_get() {
  if [[ "$(id -u)" -eq 0 ]]; then
    apt-get "$@"
    return
  fi

  if command -v sudo >/dev/null 2>&1; then
    sudo apt-get "$@"
    return
  fi

  log "Skipping apt-get $*: sudo/root unavailable"
  return 0
}

install_playwright_system_dependencies() {
  if ! command -v apt-get >/dev/null 2>&1; then
    log "Skipping Playwright system dependencies: apt-get unavailable"
    return
  fi

  log "Installing Playwright Chromium system dependencies"
  run_apt_get update
  DEBIAN_FRONTEND=noninteractive run_apt_get install -y --no-install-recommends \
    libasound2t64 \
    libatk-bridge2.0-0t64 \
    libatk1.0-0t64 \
    libatspi2.0-0t64 \
    libcairo2 \
    libcups2t64 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0t64 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libxcb1 \
    libxcomposite1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xvfb \
    fonts-noto-color-emoji \
    fonts-freefont-ttf \
    fonts-ipafont-gothic \
    fonts-tlwg-loma-otf \
    fonts-unifont \
    fonts-wqy-zenhei \
    xfonts-cyrillic \
    xfonts-scalable
}

install_or_reuse_hermes() {
  if [[ "${FORCE_HERMES_INSTALL:-0}" != "1" ]] \
    && [[ -x "$LOCAL_BIN/hermes" ]] \
    && [[ -d "$HERMES_HOME/hermes-agent" ]]; then
    log "Reusing cached Hermes install at $HERMES_HOME"
    return
  fi

  log "Running Hermes Agent installer"
  curl -fsSL "$HERMES_INSTALL_URL" | bash
  export PATH="$LOCAL_BIN:$PATH"
}

verify_hermes() {
  if ! command -v hermes >/dev/null 2>&1; then
    log "Hermes launcher was not found on PATH after install"
    return 1
  fi

  hermes --help >/dev/null
  log "Hermes launcher verified: $(command -v hermes)"
}

main() {
  ensure_local_bin_on_path
  install_uv
  install_python311
  install_playwright_system_dependencies
  install_or_reuse_hermes
  verify_hermes
  log "Complete. Run 'hermes setup' to configure provider credentials."
}

main "$@"
