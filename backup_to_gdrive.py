#!/usr/bin/env python3
"""
Winter Cleaning Backup Script
Backs up entire macOS hard drive to Google Drive folder "Winter cleaning 26.21.02"
Excludes system files, applications, and critical utilities.

Usage:
    1. pip install -r requirements.txt
    2. Set up Google OAuth credentials (see README)
    3. python backup_to_gdrive.py
"""

import os
import sys
import json
import time
import hashlib
import logging
import argparse
from pathlib import Path
from datetime import datetime

from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from google.auth.transport.requests import Request
from googleapiclient.discovery import build
from googleapiclient.http import MediaFileUpload
from googleapiclient.errors import HttpError

# Google Drive API scope - full access to manage files
SCOPES = ["https://www.googleapis.com/auth/drive"]

# Target folder name on Google Drive
GDRIVE_FOLDER_NAME = "Winter cleaning 26.21.02"

# Token and credentials file paths
TOKEN_FILE = "token.json"
CREDENTIALS_FILE = "credentials.json"

# Progress tracking file (allows resume)
PROGRESS_FILE = "backup_progress.json"

# Chunk size for uploads (10 MB)
CHUNK_SIZE = 10 * 1024 * 1024

# Max retries for failed uploads
MAX_RETRIES = 5

# --------------------------------------------------------------------------
# macOS System Exclusions - directories and patterns to skip
# --------------------------------------------------------------------------
EXCLUDED_DIRS = {
    # macOS System directories
    "/System",
    "/Library",
    "/usr",
    "/bin",
    "/sbin",
    "/dev",
    "/proc",
    "/sys",
    "/private/var/vm",
    "/private/var/db",
    "/private/var/folders",
    "/private/var/run",
    "/private/tmp",
    "/cores",
    "/etc",
    "/tmp",
    "/var",
    # Applications (system + user installed)
    "/Applications",
    # Volumes and mounts
    "/Volumes",
    "/Network",
    "/net",
    # macOS hidden system directories
    "/.Spotlight-V100",
    "/.fseventsd",
    "/.vol",
    "/.DocumentRevisions-V100",
    "/.Trashes",
    "/.MobileBackups",
    "/.MobileBackups.trash",
    # Package manager caches
    "/opt/homebrew",
    "/usr/local",
    "/opt/local",
}

# Directories within home folder to exclude
HOME_EXCLUDED_DIRS = {
    ".Trash",
    ".cache",
    ".local/share/Trash",
    ".npm",
    ".nvm",
    ".pyenv",
    ".rbenv",
    ".cargo",
    ".rustup",
    ".gradle",
    ".m2",
    ".cocoapods",
    ".docker",
    ".vagrant.d",
    "Library/Caches",
    "Library/Logs",
    "Library/Developer",
    "Library/Application Support/CrashReporter",
    "Library/Application Support/MobileSync",
    "Library/Containers",
    "Library/Group Containers",
    "node_modules",
    ".git",
    "__pycache__",
    ".venv",
    "venv",
    ".conda",
    "anaconda3",
    "miniconda3",
}

# File patterns to always exclude
EXCLUDED_PATTERNS = {
    ".DS_Store",
    ".localized",
    "Thumbs.db",
    ".swp",
    ".swo",
    ".tmp",
    ".dmg",
    ".iso",
    ".pkg",
    ".app",
}

# Maximum file size to upload (5 GB - Google Drive limit for single files)
MAX_FILE_SIZE = 5 * 1024 * 1024 * 1024

# --------------------------------------------------------------------------
# Logging setup
# --------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("backup.log"),
        logging.StreamHandler(sys.stdout),
    ],
)
logger = logging.getLogger(__name__)


def authenticate():
    """Authenticate with Google Drive using OAuth2."""
    creds = None

    if os.path.exists(TOKEN_FILE):
        creds = Credentials.from_authorized_user_file(TOKEN_FILE, SCOPES)

    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            logger.info("Refreshing expired token...")
            creds.refresh(Request())
        else:
            if not os.path.exists(CREDENTIALS_FILE):
                logger.error(
                    f"Missing {CREDENTIALS_FILE}. Download it from Google Cloud Console.\n"
                    "See setup instructions in the README."
                )
                sys.exit(1)
            logger.info("Opening browser for Google sign-in...")
            flow = InstalledAppFlow.from_client_secrets_file(CREDENTIALS_FILE, SCOPES)
            creds = flow.run_local_server(port=0)

        with open(TOKEN_FILE, "w") as token:
            token.write(creds.to_json())
        logger.info("Authentication successful.")

    return creds


def get_or_create_folder(service, folder_name, parent_id=None):
    """Find or create a folder on Google Drive. Returns folder ID."""
    query = f"name='{folder_name}' and mimeType='application/vnd.google-apps.folder' and trashed=false"
    if parent_id:
        query += f" and '{parent_id}' in parents"

    results = service.files().list(q=query, spaces="drive", fields="files(id, name)").execute()
    folders = results.get("files", [])

    if folders:
        logger.info(f"Found existing folder: {folder_name} ({folders[0]['id']})")
        return folders[0]["id"]

    file_metadata = {
        "name": folder_name,
        "mimeType": "application/vnd.google-apps.folder",
    }
    if parent_id:
        file_metadata["parents"] = [parent_id]

    folder = service.files().create(body=file_metadata, fields="id").execute()
    logger.info(f"Created folder: {folder_name} ({folder['id']})")
    return folder["id"]


def should_exclude(filepath):
    """Check if a file or directory should be excluded from backup."""
    filepath_str = str(filepath)

    # Check absolute path exclusions
    for excluded in EXCLUDED_DIRS:
        if filepath_str == excluded or filepath_str.startswith(excluded + "/"):
            return True

    # Check home directory exclusions
    home = str(Path.home())
    if filepath_str.startswith(home):
        relative = filepath_str[len(home) + 1 :]
        for excluded in HOME_EXCLUDED_DIRS:
            if relative == excluded or relative.startswith(excluded + "/"):
                return True

    # Check filename patterns
    basename = os.path.basename(filepath_str)
    for pattern in EXCLUDED_PATTERNS:
        if basename == pattern or basename.endswith(pattern):
            return True

    return False


def get_file_hash(filepath):
    """Calculate MD5 hash for a file (for dedup/change detection)."""
    hash_md5 = hashlib.md5()
    try:
        with open(filepath, "rb") as f:
            for chunk in iter(lambda: f.read(8192), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
    except (PermissionError, OSError):
        return None


def load_progress():
    """Load backup progress from file."""
    if os.path.exists(PROGRESS_FILE):
        with open(PROGRESS_FILE, "r") as f:
            return json.load(f)
    return {"uploaded_files": {}, "folder_ids": {}, "started_at": datetime.now().isoformat()}


def save_progress(progress):
    """Save backup progress to file."""
    with open(PROGRESS_FILE, "w") as f:
        json.dump(progress, f, indent=2)


def scan_files(root_path):
    """Walk the filesystem and yield files that should be backed up."""
    root = Path(root_path)
    logger.info(f"Scanning files from: {root}")

    for dirpath, dirnames, filenames in os.walk(root, followlinks=False):
        # Filter out excluded directories (modifying dirnames in-place skips them)
        dirnames[:] = [
            d for d in dirnames
            if not should_exclude(os.path.join(dirpath, d))
        ]

        for filename in filenames:
            filepath = os.path.join(dirpath, filename)

            if should_exclude(filepath):
                continue

            # Skip symlinks
            if os.path.islink(filepath):
                continue

            # Skip unreadable files
            if not os.access(filepath, os.R_OK):
                continue

            # Skip files over size limit
            try:
                size = os.path.getsize(filepath)
                if size > MAX_FILE_SIZE:
                    logger.warning(f"Skipping (too large: {size / 1e9:.1f}GB): {filepath}")
                    continue
                if size == 0:
                    continue
            except OSError:
                continue

            yield filepath


def upload_file(service, filepath, parent_folder_id, progress):
    """Upload a single file to Google Drive with retry logic."""
    filename = os.path.basename(filepath)
    file_size = os.path.getsize(filepath)

    # Check if already uploaded (resume support)
    file_hash = get_file_hash(filepath)
    if filepath in progress["uploaded_files"]:
        if progress["uploaded_files"][filepath].get("hash") == file_hash:
            return True  # Already uploaded, skip

    # Determine MIME type
    mime_type = "application/octet-stream"

    file_metadata = {
        "name": filename,
        "parents": [parent_folder_id],
    }

    media = MediaFileUpload(
        filepath,
        mimetype=mime_type,
        chunksize=CHUNK_SIZE,
        resumable=True,
    )

    for attempt in range(MAX_RETRIES):
        try:
            request = service.files().create(
                body=file_metadata,
                media_body=media,
                fields="id",
            )

            response = None
            while response is None:
                status, response = request.next_chunk()
                if status:
                    pct = int(status.progress() * 100)
                    print(f"\r  Uploading {filename}: {pct}%", end="", flush=True)

            print(f"\r  Uploaded: {filename} ({file_size / 1024:.1f} KB)")

            # Record in progress
            progress["uploaded_files"][filepath] = {
                "hash": file_hash,
                "drive_id": response.get("id"),
                "uploaded_at": datetime.now().isoformat(),
            }
            save_progress(progress)
            return True

        except HttpError as e:
            if e.resp.status in [403, 429, 500, 503]:
                wait = 2 ** (attempt + 1)
                logger.warning(f"Upload error (attempt {attempt + 1}): {e}. Retrying in {wait}s...")
                time.sleep(wait)
            else:
                logger.error(f"Failed to upload {filepath}: {e}")
                return False
        except Exception as e:
            logger.error(f"Unexpected error uploading {filepath}: {e}")
            if attempt < MAX_RETRIES - 1:
                time.sleep(2 ** (attempt + 1))
            else:
                return False

    return False


def ensure_drive_path(service, relative_path, root_folder_id, progress):
    """Create the folder hierarchy on Google Drive mirroring local path structure.
    Returns the ID of the deepest folder."""
    parts = Path(relative_path).parent.parts

    current_parent = root_folder_id
    current_path = ""

    for part in parts:
        current_path = os.path.join(current_path, part)

        # Check cache
        if current_path in progress.get("folder_ids", {}):
            current_parent = progress["folder_ids"][current_path]
            continue

        folder_id = get_or_create_folder(service, part, current_parent)
        progress.setdefault("folder_ids", {})[current_path] = folder_id
        save_progress(progress)
        current_parent = folder_id

    return current_parent


def run_backup(root_path="/", dry_run=False):
    """Main backup function."""
    logger.info("=" * 60)
    logger.info("Winter Cleaning Backup to Google Drive")
    logger.info(f"Target folder: {GDRIVE_FOLDER_NAME}")
    logger.info(f"Source: {root_path}")
    logger.info("=" * 60)

    # Authenticate
    if not dry_run:
        creds = authenticate()
        service = build("drive", "v3", credentials=creds)
    else:
        service = None

    # Load progress
    progress = load_progress()

    # Create/find root folder on Drive
    if not dry_run:
        root_folder_id = get_or_create_folder(service, GDRIVE_FOLDER_NAME)
    else:
        root_folder_id = "DRY_RUN"

    # Scan and upload files
    total_files = 0
    total_size = 0
    uploaded = 0
    skipped = 0
    failed = 0

    logger.info("Scanning filesystem for files to back up...")
    files_to_upload = list(scan_files(root_path))
    total_files = len(files_to_upload)
    total_size = sum(os.path.getsize(f) for f in files_to_upload if os.path.exists(f))

    logger.info(f"Found {total_files} files ({total_size / 1e9:.2f} GB) to back up")

    if dry_run:
        logger.info("DRY RUN - listing files that would be backed up:")
        for f in files_to_upload[:50]:
            size = os.path.getsize(f)
            logger.info(f"  {f} ({size / 1024:.1f} KB)")
        if total_files > 50:
            logger.info(f"  ... and {total_files - 50} more files")
        return

    for i, filepath in enumerate(files_to_upload, 1):
        try:
            relative_path = os.path.relpath(filepath, root_path)
            logger.info(f"[{i}/{total_files}] {relative_path}")

            # Ensure folder structure exists on Drive
            parent_id = ensure_drive_path(service, relative_path, root_folder_id, progress)

            # Upload the file
            if upload_file(service, filepath, parent_id, progress):
                uploaded += 1
            else:
                failed += 1

        except Exception as e:
            logger.error(f"Error processing {filepath}: {e}")
            failed += 1

        # Periodic progress summary
        if i % 100 == 0:
            logger.info(f"Progress: {i}/{total_files} processed, {uploaded} uploaded, {failed} failed")

    # Final summary
    logger.info("=" * 60)
    logger.info("BACKUP COMPLETE")
    logger.info(f"Total files found:  {total_files}")
    logger.info(f"Successfully uploaded: {uploaded}")
    logger.info(f"Skipped (already done): {skipped}")
    logger.info(f"Failed:               {failed}")
    logger.info(f"Total data:           {total_size / 1e9:.2f} GB")
    logger.info("=" * 60)


def list_removable_drives():
    """List available removable/external drives on macOS."""
    volumes_path = "/Volumes"
    if not os.path.exists(volumes_path):
        logger.info("No /Volumes directory found (not macOS?)")
        return []

    drives = []
    for name in os.listdir(volumes_path):
        vol_path = os.path.join(volumes_path, name)
        if os.path.ismount(vol_path) and name != "Macintosh HD":
            try:
                usage = os.statvfs(vol_path)
                total = usage.f_blocks * usage.f_frsize
                used = (usage.f_blocks - usage.f_bfree) * usage.f_frsize
                drives.append({
                    "name": name,
                    "path": vol_path,
                    "total_gb": total / 1e9,
                    "used_gb": used / 1e9,
                })
            except OSError:
                drives.append({"name": name, "path": vol_path, "total_gb": 0, "used_gb": 0})

    return drives


def main():
    parser = argparse.ArgumentParser(
        description="Back up files to Google Drive folder 'Winter cleaning 26.21.02'"
    )
    parser.add_argument(
        "--root",
        default="/",
        help="Root directory to back up (default: / entire drive)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Scan files without uploading (preview what would be backed up)",
    )
    parser.add_argument(
        "--home-only",
        action="store_true",
        help="Only back up home directory instead of entire drive",
    )
    parser.add_argument(
        "--external",
        metavar="DRIVE_NAME",
        help="Back up from an external/removable drive by name (e.g. 'MyBackupDrive')",
    )
    parser.add_argument(
        "--list-drives",
        action="store_true",
        help="List available removable/external drives and exit",
    )

    args = parser.parse_args()

    # List drives mode
    if args.list_drives:
        drives = list_removable_drives()
        if not drives:
            print("No removable drives found.")
        else:
            print("Available removable/external drives:")
            for d in drives:
                print(f"  {d['name']}: {d['path']} ({d['used_gb']:.1f} GB used / {d['total_gb']:.1f} GB total)")
        return

    # Determine root path
    if args.external:
        root = f"/Volumes/{args.external}"
        if not os.path.exists(root):
            logger.error(f"External drive not found at {root}")
            logger.info("Use --list-drives to see available drives")
            sys.exit(1)
        logger.info(f"Backing up from external drive: {root}")
    elif args.home_only:
        root = str(Path.home())
    else:
        root = args.root

    run_backup(root_path=root, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
