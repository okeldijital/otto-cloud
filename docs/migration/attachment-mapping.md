# Attachment Entity Mapping (Legacy → Otto Cloud)

**Date:** 2026-07-20  
**Milestone:** Attachment Entity Linking  
**Constraint:** Repair metadata/relationships only — no re-upload, no R2 rename, no deletes.

---

## 1. How the legacy app associated files

### Storage layout (`~/.otto/data/storage/`)

| Path pattern | Meaning |
|--------------|---------|
| `{uuid}.{ext}` at storage root | Primary uploads (covers, images, PDFs) served as `/uploads/{uuid}.{ext}` |
| `contracts/{folderId}/{hash}.pdf` | Contract document blobs |
| `office_documents/{folderId}/{uuid}_doc.pdf` | Office documents |
| `works_admin/{folderId}/audit.pdf` \| `proof.pdf` | Works-admin / smoke stubs |
| `reports/...` | Report artifacts |

Filenames on disk are **UUID-based**; the DB stored **URL/path strings**, not foreign keys to a central files table.

### Entity ↔ column map (legacy + cloud schema)

| Business asset | Source table | Source column | Path / filename shape | Legacy relationship |
|----------------|--------------|---------------|----------------------|---------------------|
| Release artwork | `releases` | `cover_art_url` | `/uploads/{uuid}.jpg\|jpeg\|png` | Column on release row → static file |
| Artist image | `artists` | `profile_image_url` | `/uploads/{uuid}.…` | Column on artist (often empty pre/post migrate) |
| Label logo | `labels` | `logo_url` | `/uploads/{uuid}.png` | Column on label |
| User avatar | `users` | `avatar_url` | URL/path | Column on user |
| Track audio | `tracks` | `file_location` | path | Column on track (empty in cloud) |
| Contract document | `contract_documents` | `file_path`, `file_name`, `checksum` | path or basename | FK `contract_id` → `contracts` |
| Office document | `office_documents` | `storage_path`, `original_filename` | `/uploads/…` or subfolder | Links via `office_document_links` |
| Works-admin docs | `works_admin_documents` | `file_path` | subfolder | FK to works_admin |
| Report artifact | `report_artifacts` | `storage_path` | reports/ | FK to report run |
| Network individual | `individuals` | `image_url` | path | Column |

### Cloud universal model

All R2 objects are rows in `attachments` (`Attachment`):

| Field | Role |
|-------|------|
| `storageKey` | R2 object key (never client-exposed) |
| `entityType` / `entityId` | Polymorphic link to business entity |
| `originalName` / `fileName` | Display + match surface (legacy basename preserved) |
| `checksum` | Content hash when available |
| `category` | `image` \| `document` \| … |
| `organizationId` | Org scope (asset migration wrote `"1"`; linking normalizes to catalog UUID) |

There is **no** `role` column. Cover vs profile is inferred from entity type + `category=image` (documented as logical role `cover` / `profile` / `logo` in reports only).

---

## 2. Migration state (pre-linking)

Asset migration (`scripts/migrate-assets`) discovered **558** local files, uploaded all as:

```text
entityType = "misc"
entityId   = "orphan"
storageKey = organizations/1/misc/{newUuid}-{originalBasename}
```

Report metrics: **558 missing DB references**, **558 orphaned**, **274 content duplicates**.

Cloud `attachments` count after re-runs: **1120** (≈ 2× inventory; same basenames/checksums repeated).  
All rows: `entityType=misc`, `entityId=orphan`.

### Live entity columns (Neon, after data migrate)

| Column | Non-empty rows | Linkable via basename? |
|--------|----------------|------------------------|
| `releases.cover_art_url` | **80** | **Yes** — 80/80 exact `originalName` match |
| `labels.logo_url` | **1** (M2KR) | **Yes** |
| `artists.profile_image_url` | 0 | No evidence |
| `contract_documents` | 0 rows | No cloud FK evidence |
| `office_documents` / `documents` / tracks files | 0 | Path-only classification |

### Contracts path evidence

Inventory paths like:

```text
contracts/00000000-0000-0000-0000-0000000026e9/{sha256}.pdf
```

decode folder tails to legacy integer ids (e.g. `0x26e9` → 9961). Those contract ids **do not exist** in current cloud `contracts` (post Hub Smoke cleanup only id `1` remains).  
→ **Do not invent links** to missing contracts; keep as orphans with skip reason.

---

## 3. Deterministic matching priority

Used by `scripts/migrate-data/link-attachments/engine.ts`:

1. Inventory `attachmentId` + path-derived entity (when entity exists in cloud)
2. Exact FK column basename ↔ `originalName` / `fileName`
3. `storageKey` contains legacy basename / UUID stem
4. Checksum match to a single non-orphan target entity (only if unique)
5. Path folder classification **without** entity id → skip (no guessing)

Never fuzzy title matching.

---

## 4. Logical roles (report-only)

| Entity | Logical role | Detection |
|--------|--------------|-----------|
| Release | `cover` | Linked from `cover_art_url` + image |
| Artist | `profile` | Linked from `profile_image_url` + image |
| Label / Publisher | `logo` | Linked from `logo_url` + image |
| Contract | `document` | Linked from contract path/FK + document |
| Work / office | `document` | Path/FK evidence |

---

## 5. Success definition

- Releases with `cover_art_url` have ≥1 attachment `entityType=release`, `entityId=<id>`
- Label logo linked when basename matches
- Remaining orphans listed with skip reasons
- No re-uploads, no R2 renames, no attachment deletes
