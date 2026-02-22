#!/usr/bin/env bash
# backup-to-gdrive.sh
# Backs up your personal Mac files to Google Drive
# Folder: "Winter cleaning 26.21.02"
# Skips Applications, system files, caches, and other critical OS components
#
# REQUIRES: rclone configured with a Google Drive remote named "gdrive"
# Setup:    brew install rclone && rclone config
# Docs:     https://rclone.org/drive/

set -euo pipefail

# ── Configuration ────────────────────────────────────────────────────────────

GDRIVE_REMOTE="gdrive"                        # rclone remote name (set during rclone config)
GDRIVE_FOLDER="Winter cleaning 26.21.02"      # destination folder on Google Drive
SOURCE_HOME="$HOME"                           # root of what to back up

# Directories INSIDE $HOME to include (everything else is skipped by default)
INCLUDE_DIRS=(
  "Desktop"
  "Documents"
  "Downloads"
  "Movies"
  "Music"
  "Pictures"
  "Public"
)

# ── Safety checks ────────────────────────────────────────────────────────────

if ! command -v rclone &>/dev/null; then
  echo "ERROR: rclone is not installed."
  echo "       Install it with:  brew install rclone"
  echo "       Then run:         rclone config"
  echo "       Choose 'Google Drive' and follow the prompts."
  exit 1
fi

if ! rclone listremotes | grep -q "^${GDRIVE_REMOTE}:"; then
  echo "ERROR: rclone remote '${GDRIVE_REMOTE}' not found."
  echo "       Run 'rclone config' to set up a Google Drive remote named '${GDRIVE_REMOTE}'."
  exit 1
fi

# ── Exclude filter file (written to a temp file) ─────────────────────────────

FILTER_FILE="$(mktemp /tmp/gdrive-backup-filter.XXXXXX)"

cat > "$FILTER_FILE" <<'FILTERS'
# ── System & OS ──────────────────────────────────────────────────────────────
- .DS_Store
- .localized
- .Spotlight-V100/**
- .fseventsd/**
- .TemporaryItems/**
- .Trashes/**
- .vol/**

# ── Applications (keep where they are) ───────────────────────────────────────
- Applications/**
- /Library/**
- ~/Library/**

# ── Caches & temporary data ───────────────────────────────────────────────────
- **/Cache/**
- **/Caches/**
- **/*.cache
- **/tmp/**
- **/Temp/**
- **/.Trash/**

# ── Developer / build artifacts (large, regeneratable) ───────────────────────
- **/node_modules/**
- **/.git/**
- **/dist/**
- **/build/**
- **/__pycache__/**
- **/*.pyc
- **/.venv/**
- **/venv/**
- **/*.o
- **/*.a
- **/*.so
- **/*.dylib

# ── Virtual machines & disk images (very large) ───────────────────────────────
- **/*.vmdk
- **/*.vdi
- **/*.ova
- **/*.ovf
- **/*.dmg
- **/*.iso

# ── Log files ─────────────────────────────────────────────────────────────────
- **/*.log
- **/Logs/**

# ── Include everything else ───────────────────────────────────────────────────
+ **
FILTERS

# ── Dry-run flag ─────────────────────────────────────────────────────────────

DRY_RUN=""
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN="--dry-run"
  echo "=== DRY RUN MODE - no files will be transferred ==="
fi

# ── Run backup for each included directory ────────────────────────────────────

echo ""
echo "Starting backup to Google Drive"
echo "  Remote : ${GDRIVE_REMOTE}:"
echo "  Folder : ${GDRIVE_FOLDER}"
echo "  Source : ${SOURCE_HOME}"
echo ""

FAILED_DIRS=()

for dir in "${INCLUDE_DIRS[@]}"; do
  src="${SOURCE_HOME}/${dir}"
  dst="${GDRIVE_REMOTE}:${GDRIVE_FOLDER}/${dir}"

  if [[ ! -d "$src" ]]; then
    echo "  [SKIP] ${dir}/ — directory does not exist"
    continue
  fi

  echo "  [SYNC] ${dir}/ → ${GDRIVE_FOLDER}/${dir}/"

  if ! rclone copy \
      $DRY_RUN \
      --filter-from "$FILTER_FILE" \
      --transfers 4 \
      --checkers 8 \
      --drive-chunk-size 128M \
      --progress \
      --stats-one-line \
      --log-level INFO \
      --log-file "/tmp/gdrive-backup-${dir}.log" \
      "$src" "$dst"; then
    echo "  [WARN] ${dir}/ had errors — check /tmp/gdrive-backup-${dir}.log"
    FAILED_DIRS+=("$dir")
  fi

  echo ""
done

# ── Cleanup ───────────────────────────────────────────────────────────────────

rm -f "$FILTER_FILE"

# ── Summary ───────────────────────────────────────────────────────────────────

echo "========================================"
if [[ ${#FAILED_DIRS[@]} -eq 0 ]]; then
  echo "Backup complete. All directories synced."
else
  echo "Backup finished with warnings in:"
  for d in "${FAILED_DIRS[@]}"; do
    echo "  - ${d}  (see /tmp/gdrive-backup-${d}.log)"
  done
fi
echo ""
echo "Google Drive folder: ${GDRIVE_FOLDER}"
echo "========================================"
