#!/bin/bash
# backend/scripts/cleanup_recursive_backups.sh
# Governed cleanup script for recursive backups in STORAGE_ROOT.

# Load settings to find STORAGE_ROOT if not provided
if [ -z "$STORAGE_ROOT" ]; then
    # Default OTTO storage path
    STORAGE_ROOT="$HOME/.otto/data/storage"
fi

BACKUP_DIR="$STORAGE_ROOT/backups"

echo "--- OTTO Recursive Backup Cleanup Tool ---"
echo "Target: $BACKUP_DIR"

if [ ! -d "$BACKUP_DIR" ]; then
    echo "Result: Target directory does not exist. No action needed."
    exit 0
fi

SIZE_KB=$(du -sk "$BACKUP_DIR" | cut -f1)
SIZE_GB=$(echo "scale=2; $SIZE_KB / 1024 / 1024" | bc)

echo "Detected size: ${SIZE_GB}GB"

if (( $(echo "$SIZE_GB > 1" | bc -l) )); then
    echo "WARNING: $BACKUP_DIR is larger than 1GB. This likely contains recursive backups."
else
    echo "Note: $BACKUP_DIR is under 1GB. It may or may not be recursive."
fi

if [ "$CONFIRM_DELETE" = "true" ]; then
    echo "Action: Deleting $BACKUP_DIR..."
    rm -rf "$BACKUP_DIR"
    echo "Result: Deleted."
else
    echo "Action: Dry run only. No files were deleted."
    echo "Hint: Run with 'CONFIRM_DELETE=true bash $0' to perform deletion."
fi
