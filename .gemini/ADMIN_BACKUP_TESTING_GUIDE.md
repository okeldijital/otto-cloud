# Admin Module - Backup & Import Testing Guide

## Overview
The Admin module provides comprehensive database backup, restore, and import functionality. This guide will help you test all features.

## Access Requirements
- **Role Required**: Admin user
- **URL**: http://localhost:5173/admin
- **Navigation**: Click "Admin" in the sidebar

## Features Available

### 1. **Data Backups Tab**
Located at: Admin → Data Backups tab

#### A. Create Manual Backup
**Button**: "Run System Backup" (top right)

**What it does**:
- Creates a timestamped ZIP file of the entire database
- Includes all tables: artists, releases, tracks, works, contracts, users, etc.
- Stores in: `backend/otto_data/backups/` (dev) or `~/Library/Application Support/OTTO/backups/` (desktop)
- Logs the action in audit logs

**Test Steps**:
1. Click "Run System Backup" button
2. Wait for success alert: "Backup created successfully"
3. Check the backups table - new backup should appear at the top
4. Verify filename format: `backup_YYYYMMDD_HHMMSS.zip`

**Expected Result**: ✅ New backup appears in the list with timestamp and file size

---

#### B. Download Backup
**Button**: "Download" button in each backup row

**What it does**:
- Downloads the selected backup ZIP file to your computer
- File can be stored externally for safekeeping

**Test Steps**:
1. Click "Download" on any backup in the list
2. Browser should prompt to save the ZIP file
3. Save the file to your Downloads folder
4. Verify the ZIP file exists and has a reasonable size (> 0 bytes)

**Expected Result**: ✅ ZIP file downloads successfully

---

#### C. Import/Upload Backup
**Button**: "Import Backup" (top right)

**What it does**:
- Uploads a backup ZIP file from your computer to the server
- Makes it available for restoration
- Useful for importing backups from other systems or external storage

**Test Steps**:
1. First, download a backup (see step B above)
2. Click "Import Backup" button
3. Select the downloaded ZIP file
4. Wait for success alert: "Backup uploaded successfully"
5. Verify the backup appears in the list (may be duplicate if same file)

**Expected Result**: ✅ Backup file uploads and appears in the list

**Validation**:
- Only `.zip` files are accepted
- If you try to upload a non-ZIP file, you'll get an error: "Please upload a valid .zip backup file"

---

#### D. Restore from Backup
**Button**: "Restore" button in each backup row

**What it does**:
- **⚠️ DESTRUCTIVE OPERATION**
- Overwrites the current database with data from the selected backup
- Restores all tables to the state they were in when the backup was created

**Test Steps** (⚠️ Use with caution):
1. Create a test backup first (so you can restore if needed)
2. Make a small change (e.g., create a test artist or note)
3. Click "Restore" on an older backup
4. Confirm the warning dialog: "RESTORE SYSTEM from {filename}? This will overwrite current data."
5. Wait for success message: "System restored successfully"
6. Verify your test change is gone (database rolled back)

**Expected Result**: ✅ Database restored to backup state

**⚠️ Important Notes**:
- Always create a current backup before restoring
- The server may need to be restarted after restore
- All data created after the backup will be lost

---

#### E. Auto-Backup Schedule
**Dropdown**: "Auto-Backup Settings" section

**What it does**:
- Configures automatic backup frequency
- Options: Daily (Midnight), Weekly (Sunday), Monthly (1st)
- Backups run automatically in the background

**Test Steps**:
1. Note the current schedule setting
2. Change to a different frequency (e.g., from "Weekly" to "Daily")
3. Wait for success alert: "Backup schedule updated to: daily"
4. Refresh the page
5. Verify the schedule dropdown shows your new selection

**Expected Result**: ✅ Schedule updates and persists

---

### 2. **User Management Tab**
Located at: Admin → User Management tab

**Features**:
- View all users
- Add new users
- Edit existing users
- Delete users
- Change user roles (member/admin)
- Enable/disable accounts

**Test Steps**:
1. Click "Add User" button
2. Fill in: Full Name, Email, Password, Role
3. Submit the form
4. Verify new user appears in the table
5. Click "Edit" on a user
6. Change their role or status
7. Verify changes are saved

---

### 3. **System Health Tab**
Located at: Admin → System Health tab

**Features**:
- Database statistics (counts of all entities)
- Security audit logs (recent user actions)

**Test Steps**:
1. View the statistics cards showing counts
2. Scroll through the audit logs
3. Verify your recent actions appear (e.g., "created backup")

---

## Complete Backup/Restore Workflow Test

### Scenario: Backup, Modify, Restore

1. **Create Initial Backup**
   - Go to Admin → Data Backups
   - Click "Run System Backup"
   - Note the backup filename (e.g., `backup_20260204_194500.zip`)

2. **Make Changes**
   - Go to Catalog → Artists
   - Create a new test artist: "Test Artist for Restore"
   - Note the artist ID

3. **Create Second Backup**
   - Return to Admin → Data Backups
   - Click "Run System Backup" again
   - You should now have 2 backups

4. **Download Both Backups**
   - Download the first backup (before changes)
   - Download the second backup (after changes)
   - Store them in a safe location

5. **Restore to First Backup**
   - Click "Restore" on the first backup
   - Confirm the warning
   - Wait for success message

6. **Verify Restoration**
   - Go to Catalog → Artists
   - The "Test Artist for Restore" should be gone
   - Database is back to the state before you created it

7. **Restore to Second Backup** (Optional)
   - Return to Admin → Data Backups
   - Click "Restore" on the second backup
   - Verify the test artist reappears

---

## Import External Backup Test

### Scenario: Import backup from another system

1. **Prepare External Backup**
   - Download a backup from the current system
   - Rename it to simulate an external backup (e.g., `external_backup.zip`)

2. **Delete the Backup from List** (Optional)
   - This simulates it being from another system
   - Note: There's no delete function in UI, but you can test import anyway

3. **Import the Backup**
   - Click "Import Backup"
   - Select the renamed ZIP file
   - Wait for success message

4. **Verify Import**
   - The backup should appear in the list
   - You can now restore from it

---

## Backend File Locations

### Development Mode
- **Backups**: `/Users/m2krproduction/otto/backend/otto_data/backups/`
- **Database**: `/Users/m2krproduction/otto/backend/otto_data/db/app.db`

### Desktop Mode (macOS)
- **Backups**: `~/Library/Application Support/OTTO/backups/`
- **Database**: `~/Library/Application Support/OTTO/db/app.db`

---

## API Endpoints Reference

All endpoints require admin authentication:

- `POST /api/admin/backup` - Create backup
- `GET /api/admin/backups` - List backups
- `POST /api/admin/restore/{filename}` - Restore from backup
- `GET /api/admin/backup/download/{filename}` - Download backup
- `POST /api/admin/backup/upload` - Upload backup
- `GET /api/admin/backup/schedule` - Get schedule
- `POST /api/admin/backup/schedule` - Update schedule
- `GET /api/admin/stats` - Get database statistics
- `GET /api/admin/audit-logs` - Get audit logs

---

## Troubleshooting

### Backup Not Creating
- Check backend logs for errors
- Verify write permissions on backup directory
- Ensure sufficient disk space

### Restore Failing
- Verify backup file is not corrupted
- Check that backup file exists in the backups directory
- Ensure database is not locked by another process

### Upload Not Working
- Verify file is a valid ZIP file
- Check file size (should be reasonable, not 0 bytes)
- Ensure backend has write permissions

### Schedule Not Updating
- Check backend logs for scheduler errors
- Verify the frequency value is valid: 'daily', 'weekly', or 'monthly'

---

## Security Notes

1. **Admin Only**: All backup operations require admin role
2. **Audit Logging**: All backup/restore actions are logged
3. **File Validation**: Only ZIP files can be uploaded
4. **Destructive Operations**: Restore operations show confirmation dialogs

---

## Testing Checklist

- [ ] Create manual backup
- [ ] Download backup file
- [ ] Upload/import backup file
- [ ] Restore from backup
- [ ] Change auto-backup schedule
- [ ] Verify audit logs show backup actions
- [ ] Test with invalid file (non-ZIP)
- [ ] Test restore confirmation dialog
- [ ] Verify backup file sizes are reasonable
- [ ] Test complete backup → modify → restore workflow

---

## Next Steps

After testing, you can:
1. Set up a regular backup schedule (recommended: weekly)
2. Download important backups to external storage
3. Test disaster recovery by restoring to a different machine
4. Document your backup retention policy
