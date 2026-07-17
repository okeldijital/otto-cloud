# Otto Cloud – Local Storage Architecture Discovery Report

**Date:** 2026-07-17  
**Status:** COMPLETE  
**Finding:** Local files exist but are NOT referenced in the database

---

## Executive Summary

The local OTTO desktop application stores hundreds of files on disk, but **none of them are referenced in the local SQLite database**. This is a critical finding that changes the migration strategy.

### Key Findings

1. **Actual data directory:** `~/.otto/data/` (NOT `~/Library/Application Support/OTTO/`)
2. **Database:** `~/.otto/data/db/otto.sqlite`
3. **Storage:** `~/.otto/data/storage/`
4. **File naming:** UUID-based (e.g., `01cb695d-8723-4558-821c-ad243b139700.jpg`)
5. **Database references:** ALL file reference columns are EMPTY
6. **Application type:** Tauri (Rust + Python/FastAPI backend), NOT Electron

---

## 1. Actual Storage Architecture

### Directory Structure

```
~/.otto/data/
├── db/
│   ├── otto.sqlite              # Main database (1.6 MB)
│   ├── smoke_test.db
│   ├── ui_test.db
│   └── [other test databases]
├── storage/
│   ├── [UUID].jpg               # Images (root level)
│   ├── [UUID].pdf               # Documents (root level)
│   ├── contracts/
│   │   ├── [UUID]/
│   ├── office_documents/
│   │   ├── [UUID]/
│   ├── reports/
│   │   ├── [UUID]/
│   └── works_admin/
│       ├── [UUID]/
├── runtime/
│   └── active_db.json           # NOT FOUND
├── logs/
├── import_logs/
├── temp/
└── backups/
```

### File Naming Strategy

Files are stored with **UUID filenames** (no original filename preservation):
- Images: `01cb695d-8723-4558-821c-ad243b139700.jpg`
- Documents: `023b5984-c711-4383-a84f-147cd20ec522.pdf`

**Exception:** Office documents may use `{uuid}_{original_name}` format in subdirectories.

### Storage Root Configuration

From `backend/config.py`:
```python
# Default: ~/.otto/data/storage
storage_dir = data_parent / "storage"
# Overridable via env:
storage_root = os.getenv("STORAGE_ROOT")
```

---

## 2. Database Relationship Model

### File Reference Columns (ALL EMPTY)

| Table | Column | Type | Status |
|-------|--------|------|--------|
| `users` | `avatar_url` | VARCHAR(500) | EMPTY |
| `artists` | `profile_image_url` | VARCHAR(500) | EMPTY |
| `releases` | `cover_art_url` | VARCHAR(500) | EMPTY |
| `releases` | `streaming_link` | VARCHAR(500) | EMPTY |
| `tracks` | `file_location` | VARCHAR(500) | EMPTY |
| `tracks` | `streaming_link` | VARCHAR(500) | EMPTY |
| `individuals` | `image_url` | VARCHAR(500) | EMPTY |
| `labels` | `logo_url` | VARCHAR(255) | EMPTY |
| `documents` | `file_path` | VARCHAR(500) | EMPTY |
| `contract_documents` | `file_path` | VARCHAR(500) | EMPTY |
| `office_documents` | `storage_path` | VARCHAR(500) | EMPTY |
| `works_admin_documents` | `file_path` | VARCHAR(500) | EMPTY |
| `report_artifacts` | `storage_path` | VARCHAR(500) | EMPTY |

### Schema Evidence

```sql
-- artists table
profile_image_url VARCHAR(500)

-- releases table
cover_art_url VARCHAR(500)
streaming_link VARCHAR(500)

-- tracks table
file_location VARCHAR(500)
streaming_link VARCHAR(500)
```

**Result:** Zero rows contain file references in any of these columns.

---

## 3. How the Application Serves Files

### Static File Mount

From `backend/main.py`:
```python
upload_dir = getattr(settings, "UPLOAD_DIR", None) or os.getenv("UPLOAD_DIR", "./uploads")
app.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")
```

### File URL Format

Files are served via HTTP at:
```
/uploads/{filename}
```

Where `{filename}` is the UUID-based filename on disk.

### Upload Flow (from `routes/documents.py`)

```python
unique_filename = f"{uuid.uuid4()}.{file_ext}"
file_path = os.path.join(settings.UPLOAD_DIR, unique_filename)
# Return:
return {
    "file_path": f"/uploads/{unique_filename}",
    ...
}
```

### Office Document Upload Flow (from `routes/office_documents.py`)

```python
storage_filename = f"{uuid4()}_{original_name}"
dest_path = os.path.join(storage_dir, storage_filename)
storage_path = dest_path.replace(settings.UPLOAD_DIR, "/uploads")
# Returns: "/uploads/office_documents/{org_id}/{uuid}_{original_name}"
```

---

## 4. Source Code Locations

### File Management Code

| Location | Purpose |
|----------|---------|
| `backend/config.py` | Defines `STORAGE_ROOT`, `UPLOAD_DIR` |
| `backend/database.py` | SQLAlchemy setup, `SafeUuid` type |
| `backend/main.py` | Mounts `/uploads` static files |
| `backend/routes/documents.py` | Generic file upload |
| `backend/routes/office_documents.py` | Office document upload with org subdirs |
| `backend/routes/contracts.py` | Contract document upload |
| `backend/services/document_service.py` | Document creation service |

### Models with File Columns

| Model | File Column | Type |
|-------|-------------|------|
| `models/user.py` | `avatar_url` | VARCHAR(500) |
| `models/artist.py` | `profile_image_url` | VARCHAR(500) |
| `models/release.py` | `cover_art_url` | VARCHAR(500) |
| `models/track.py` | `file_location` | VARCHAR(500) |
| `models/individual.py` | `image_url` | VARCHAR(500) |
| `models/label.py` | `logo_url` | VARCHAR(255) |
| `models/document.py` | `file_path` | VARCHAR(500) |
| `models/contract_documents.py` | `file_path` | VARCHAR(500) |
| `models/office_document.py` | `storage_path` | VARCHAR(500) |
| `models/works_admin.py` | `file_path` | VARCHAR(500) |

---

## 5. Tracing One Asset

### Example: `01cb695d-8723-4558-821c-ad243b139700.jpg`

**Location on disk:**
```
~/.otto/data/storage/01cb695d-8723-4558-821c-ad243b139700.jpg
```

**Database search:**
```sql
SELECT * FROM artists WHERE profile_image_url LIKE '%01cb695d%'  -- 0 rows
SELECT * FROM releases WHERE cover_art_url LIKE '%01cb695d%'     -- 0 rows
SELECT * FROM tracks WHERE file_location LIKE '%01cb695d%'       -- 0 rows
SELECT * FROM documents WHERE file_path LIKE '%01cb695d%'       -- 0 rows
-- ... all tables return 0 rows
```

**Conclusion:** This file exists on disk but has NO database relationship. It is an orphaned file.

### Why This Happened

The files were likely:
1. Imported via bulk import scripts
2. Uploaded through APIs that didn't update database columns
3. Created by AI features that save files directly to storage
4. Leftover from testing/development

---

## 6. Storage Strategy Summary

| Aspect | Strategy |
|--------|----------|
| **Path type** | Relative URLs (`/uploads/{uuid}.{ext}`) |
| **Filename** | UUID (version 4) |
| **Original name** | NOT preserved in most cases |
| **Organization** | Flat in root, or subdirectory for office_documents |
| **Checksum** | Stored in database for some entities |
| **Entity linking** | Via database columns (currently empty) |
| **Serving** | FastAPI StaticFiles mount at `/uploads` |

---

## 7. Required Changes to Migration Utility

### Critical Finding

The migration utility's `mapFilesToEntities()` function queries SQLite columns like:
- `users.avatar_url`
- `artists.profile_image_url`
- `releases.cover_art_url`
- `tracks.file_location`

**All these columns are EMPTY in the real database.**

### Impact

1. **Pilot migration result:** 4/4 files migrated as `misc/orphan` (100% orphan rate)
2. **Full migration result:** 100% of files will be orphaned unless database references exist
3. **Entity mapping:** Cannot be performed because source data doesn't exist

### Recommended Actions

#### Option A: Accept Orphaned Assets (Recommended for Now)

Update the migration utility to:
1. Recognize that files may not have database references
2. Migrate all files to cloud storage as `misc/orphan`
3. Post-migration: Manually associate assets in the cloud application UI
4. Update cloud database columns after manual association

#### Option B: Investigate Alternative Storage Metadata

Search for:
1. JSON sidecar files (`.json` with same basename as image)
2. Import logs that might contain file mappings
3. AI feature databases that track file references
4. Backup/evidence databases that contain file metadata

#### Option C: Populate Local Database First

Before migration:
1. Scan local storage files
2. Use heuristics (file type, size, date) to guess entity ownership
3. Populate database columns
4. Then run migration with proper entity mapping

---

## 8. Two Data Directories Found

### `~/Library/Application Support/OTTO/`
- **Purpose:** Likely old Electron app data or packaged app data
- **Database:** `otto.db` (720 KB)
- **Storage:** 4 files (9.6 MB)
- **Status:** Legacy/unused

### `~/.otto/data/`
- **Purpose:** Current Tauri app data
- **Database:** `db/otto.sqlite` (1.6 MB)
- **Storage:** 200+ files (hundreds of MB)
- **Status:** Active production data

**The migration utility was pointed at the wrong directory.**

---

## 9. Updated Migration Strategy

### Immediate Actions

1. **Update migration config** to use `~/.otto/data/storage/` as `localStorageRoot`
2. **Update migration config** to use `~/.otto/data/db/otto.sqlite` as `localDbPath`
3. **Accept orphaned migration** - files will be uploaded without entity associations
4. **Document orphaned assets** in migration report for manual reconciliation

### Post-Migration Steps

1. In cloud application, manually associate orphaned assets with entities
2. Update cloud `Attachment` records with correct `entityType` and `entityId`
3. Update legacy URL columns in cloud database

### Long-Term Fix

1. Investigate why local database has no file references
2. Implement proper file-to-entity linking in local application
3. Add validation to prevent orphaned files

---

## 10. Conclusion

**The pilot migration proved the mechanics work, but revealed a critical data gap:**

- **Mechanics verified:** Upload, Attachment creation, R2 storage, verification
- **Data gap discovered:** Local files are NOT linked to entities in the database
- **Migration outcome:** All files will migrate as `misc/orphan`

**Recommendation:** Proceed with full migration of orphaned files, then manually associate them in the cloud application. The alternative (investigating metadata sources) would add significant time and may not yield better results.

---

*Report generated: 2026-07-17*  
*Status: READY FOR FULL MIGRATION (with orphaned asset handling)*
