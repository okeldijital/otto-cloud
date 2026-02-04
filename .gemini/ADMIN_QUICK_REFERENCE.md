# Admin Module Quick Reference

## 🎯 Quick Access
**URL**: http://localhost:5173/admin
**Required Role**: Admin

## 📋 Three Main Tabs

### 1️⃣ User Management
- ➕ Add new users
- ✏️ Edit user details
- 🗑️ Delete users
- 👤 Change roles (member/admin)
- ✅ Enable/disable accounts

### 2️⃣ Data Backups
**Actions Available**:
- 💾 **Run System Backup** - Create new backup
- 📥 **Import Backup** - Upload external backup
- ⬇️ **Download** - Save backup to computer
- 🔄 **Restore** - Restore database from backup
- ⏰ **Auto-Backup Schedule** - Set frequency (daily/weekly/monthly)

**Backup Files**:
- Format: `backup_YYYYMMDD_HHMMSS.zip`
- Location (dev): `backend/otto_data/backups/`
- Location (desktop): `~/Library/Application Support/OTTO/backups/`

### 3️⃣ System Health
- 📊 Database statistics (entity counts)
- 📜 Security audit logs (recent actions)

## ⚠️ Important Warnings

### Before Restoring:
1. ✅ Create a current backup first
2. ⚠️ Restore will overwrite ALL current data
3. 💾 Download important backups externally
4. 🔄 Server may need restart after restore

## 🔒 Security Features
- All actions require admin authentication
- All operations are logged in audit trail
- Restore operations require confirmation
- Only .zip files accepted for upload

## 🚀 Recommended Workflow

### Daily Operations:
1. Check system health regularly
2. Review audit logs for suspicious activity
3. Ensure auto-backups are running

### Weekly Tasks:
1. Download latest backup to external storage
2. Verify backup file integrity
3. Review user accounts and permissions

### Before Major Changes:
1. Create manual backup
2. Download backup to safe location
3. Make changes
4. Test thoroughly
5. Keep backup for rollback if needed

## 📞 Quick Troubleshooting

**Backup fails?**
- Check disk space
- Verify write permissions
- Check backend logs

**Restore fails?**
- Verify backup file exists
- Check file is not corrupted
- Ensure database not locked

**Upload fails?**
- Must be .zip file
- Check file size
- Verify admin permissions

## 🎓 Testing Steps (First Time)

1. Navigate to http://localhost:5173/admin
2. Click "Data Backups" tab
3. Click "Run System Backup"
4. Wait for success message
5. Click "Download" on the new backup
6. Save the file
7. Click "Import Backup" and re-upload the file
8. Verify it appears in the list
9. ✅ Backup system is working!

---

**Need detailed testing?** See `ADMIN_BACKUP_TESTING_GUIDE.md`
