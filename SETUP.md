# Winter Cleaning Backup to Google Drive

Backs up your entire macOS hard drive (or external drive) to a Google Drive folder called **"Winter cleaning 26.21.02"**, excluding system files, applications, and caches.

## Quick Start

### 1. Get Google Drive API Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or use an existing one)
3. Enable the **Google Drive API**:
   - Go to "APIs & Services" > "Library"
   - Search "Google Drive API" and click Enable
4. Create OAuth credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Desktop app" as application type
   - Download the JSON file and save it as `credentials.json` in this folder

### 2. Install Dependencies

```bash
pip3 install -r requirements.txt
```

### 3. Run the Backup

**Preview what will be backed up (dry run):**
```bash
python3 backup_to_gdrive.py --dry-run
```

**Back up entire drive:**
```bash
python3 backup_to_gdrive.py
```

**Back up only your home folder:**
```bash
python3 backup_to_gdrive.py --home-only
```

**Back up from an external/removable drive:**
```bash
# List available drives first
python3 backup_to_gdrive.py --list-drives

# Back up a specific external drive
python3 backup_to_gdrive.py --external "MyBackupDrive"
```

## What Gets Excluded

The script automatically skips:
- `/System`, `/Library`, `/usr`, `/bin`, `/sbin` (macOS system files)
- `/Applications` (installed apps)
- `.cache`, `node_modules`, `.git`, `__pycache__` (dev caches)
- `.DS_Store`, `.dmg`, `.iso`, `.pkg` files
- Files larger than 5 GB
- Symlinks
- Empty files

## Features

- **Resume support**: If interrupted, re-run the script and it picks up where it left off
- **Progress tracking**: See real-time upload progress
- **Chunked uploads**: Large files are uploaded in 10 MB chunks
- **Automatic retry**: Failed uploads retry up to 5 times with exponential backoff
- **Folder structure preserved**: Your directory hierarchy is recreated on Google Drive
- **External drive support**: Back up from USB drives, SD cards, etc.

## Files Created During Backup

- `token.json` - Your Google auth token (do not share)
- `backup_progress.json` - Tracks which files have been uploaded
- `backup.log` - Detailed log of the backup process
