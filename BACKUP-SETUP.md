# Google Drive Backup — Winter Cleaning 26.21.02

Backs up your personal Mac files to a Google Drive folder named **"Winter cleaning 26.21.02"**.

Critical system files, Applications, caches, and developer build folders are **automatically excluded** — only your personal data moves.

---

## What Gets Backed Up

| Folder | Description |
|--------|-------------|
| `~/Desktop` | Desktop files |
| `~/Documents` | All documents |
| `~/Downloads` | Downloaded files |
| `~/Movies` | Video files |
| `~/Music` | Music library |
| `~/Pictures` | Photos and images |
| `~/Public` | Public shared folder |

## What Is Skipped (Never Uploaded)

- **Applications** — stays where it is on your Mac
- **System Library** — macOS internals, not your data
- **Caches & temp files** — junk that rebuilds itself
- **`.git` folders** — code version history (large, regeneratable)
- **`node_modules`** — npm packages (regeneratable)
- **Virtual machine disks** (`.vmdk`, `.iso`, `.dmg`) — huge files
- **Log files** — system noise
- **`.DS_Store`** — Mac metadata noise

---

## One-Time Setup (do this once)

### 1. Install rclone

```bash
brew install rclone
```

> No Homebrew? Install it first: https://brew.sh

### 2. Connect rclone to your Google Drive

```bash
rclone config
```

When prompted:
1. Press `n` → New remote
2. Name it exactly: **`gdrive`**
3. Storage type: choose **Google Drive** (usually option 18 or search for it)
4. Leave Client ID and Secret blank (press Enter)
5. Scope: choose **1** (full access)
6. Follow the browser link to authorize with your Google account
7. Press `y` to confirm — done

### 3. Make the script executable (already done if cloned fresh)

```bash
chmod +x backup-to-gdrive.sh
```

---

## Running the Backup

### Preview first (no files moved)

```bash
./backup-to-gdrive.sh --dry-run
```

This shows exactly what *would* be uploaded without actually uploading anything. **Always do this first.**

### Run the real backup

```bash
./backup-to-gdrive.sh
```

Files are uploaded to your Google Drive inside:
```
My Drive / Winter cleaning 26.21.02 / Documents /
My Drive / Winter cleaning 26.21.02 / Pictures /
... etc
```

---

## Troubleshooting

**"rclone is not installed"** → Run `brew install rclone`

**"remote 'gdrive' not found"** → Run `rclone config` and create a remote named exactly `gdrive`

**Upload errors on a specific folder** → Check the log file shown in the output, e.g.:
```bash
cat /tmp/gdrive-backup-Documents.log
```

**Want to add more folders?** Edit `backup-to-gdrive.sh` and add to the `INCLUDE_DIRS` list.

---

## Safety Notes

- The script uses `rclone copy` — it only **adds** files, never deletes from Google Drive
- Your local files are never touched or deleted
- Nothing is auto-scheduled; you run it manually when you want
