# OTTO Cloud Migration — Operational Dashboard

Last updated: 2026-06-11

---

## Milestone 1: Architecture & Parity Audit

**Status:** ✅ COMPLETE
**Report:** `MIGRATION_REPORT.md`

| Deliverable | Status |
|---|---|
| Desktop Module Inventory | ✅ |
| Cloud Module Inventory | ✅ |
| Feature Parity Matrix | ✅ |
| Database Parity Matrix | ✅ |
| API Parity Matrix | ✅ |
| Minimum Restoration Path | ✅ |

---

## Milestone 2: Core Foundation (API Foundation Restoration)

**Status:** ✅ COMPLETE

| Task | Status |
|---|---|
| Prisma: artists.streaming_link | ✅ |
| Prisma: releases.streaming_link | ✅ |
| Prisma: artists.name unique constraint | ✅ |
| Prisma migration applied (Neon) | ✅ |
| Publishers API: POST/PUT/DELETE + sub-endpoints | ✅ |
| PROs API: POST/PUT/DELETE + sub-endpoints | ✅ |
| Labels API: sub-endpoints (already existed) | ✅ |
| Users API: admin list (`?all=true`) | ✅ |
| Build verification | ✅ |

**Commits:** `e1d7f85b`, `fc4e8f9b`, `95b853d1`, `387cb321`

---

## Milestone 3: Entity Attribute Parity

**Status:** 🔴 IN PROGRESS

### Entity Parity

| Entity | Database | API | Frontend |
|---|---|---|---|
| Artist | ✅ COMPLETE | ✅ COMPLETE | ✅ COMPLETE |
| Work | ✅ COMPLETE | ✅ COMPLETE | ✅ COMPLETE |
| Track | ✅ COMPLETE | ✅ COMPLETE | ✅ COMPLETE |
| Release | ✅ COMPLETE | ✅ COMPLETE | ✅ COMPLETE |

### UI Parity

| Page | Status |
|---|---|
| Artist Detail | ✅ COMPLETE (tabs: overview, releases, works, documents; social, banking, streaming, group members) |
| Work Detail | ✅ COMPLETE (composers, arrangers, publisher, PRO, linked tracks) |
| Track Detail | ✅ COMPLETE (ISRC, duration, artists, work, release, secondary releases, credits) |
| Release Detail | ✅ COMPLETE (cover art, tracklist, artists, metadata grid, credits, streaming) |
| GroupMembersManager | ✅ COMPLETE (search, add, create, remove members) |

---

## Milestone 4: Contract System Restoration

**Status:** ✅ COMPLETE

### Phase 1 — Database Parity

| Model | Desktop Columns | Cloud Columns | Status |
|---|---|---|---|
| `contracts` | All columns | All columns (contract_number, title, status, type, territory, exclusivity, dates, signed_date, royalty_description, advances, recoupment_notes, status_quo_override, notes, created_by, timestamps) | ✅ COMPLETE |
| `contract_parties` | All columns | All columns (entity_type, entity_id, external_name, role, split_percent, notes) | ✅ COMPLETE |
| `contract_assets` | All columns | All columns (asset_type, asset_id, scope_type, notes) | ✅ COMPLETE |
| `contract_documents` | All columns | All columns (file_path, file_name, version, uploaded_by, uploaded_at, checksum, mime_type, size_bytes) | ✅ COMPLETE |
| `contract_split_groups` | All columns | All columns (group_name, group_type, notes, timestamps) | ✅ COMPLETE |
| `contract_splits` | All columns | All columns (party_id, external_party_name, percent, notes) | ✅ COMPLETE |
| `contract_track_links` | All columns | All columns (contract_id, track_id, timestamps) | ✅ COMPLETE |

### Phase 2 — API Parity

| Endpoint | Status |
|---|---|
| GET `/api/contracts` — List with completeness badges, counts | ✅ |
| GET `/api/contracts?id=N` — Single with all relations + completeness | ✅ |
| GET `?action=completeness&id=N` — Computed completeness score | ✅ |
| GET `?action=party_lookup` — Search artists, labels, publishers, PROs | ✅ |
| POST `/api/contracts` — Create | ✅ |
| POST `?action=add_party` / `?action=update_party` | ✅ |
| POST `?action=add_asset` | ✅ |
| POST `?action=add_split_group` / `?action=add_split` | ✅ |
| POST `?action=link_track` — Link track to contract | ✅ |
| POST `?action=upload_document&id=N` — File upload with versioning | ✅ |
| POST `?action=create_artist_inline` — Inline artist creation | ✅ |
| PUT `?action=N` — Update contract fields | ✅ |
| DELETE `?id=N` — Cascading delete | ✅ |
| DELETE `?id=N&partyId=N` / `?assetId=N` / `?docId=N` / `?trackId=N` / `?splitGroupId=N` | ✅ |

### Phase 3 — Frontend Parity

| Page | Status |
|---|---|
| Contracts List (`/contracts`) — Completeness badges, search, filter (status/type/expiring), table with parties/assets/documents/term | ✅ |
| Contract Detail (`/contracts/[id]`) — Tabs: Documents (drag-and-drop upload, versioning, PDF preview), Overview (key terms, notes, edit metadata), Parties (add/remove with role), Assets (link tracks/works/releases), Financials (royalties, advances, recoupment), Splits (groups + items), Tracks (link/unlink) | ✅ |
| Contract Wizard — Multi-step: Basic Info → Upload PDF → Review → Create | ✅ |
| `contractService.js` — Rewritten to match actual API convention | ✅ |

### Notable Details

- **Completeness Engine**: 9 criteria (parties, documents, assets, tracks, dates, contract_number, title, type, territory) → score 0-100 → RED/AMBER/GREEN with optional `status_quo_override`
- **Document Versioning**: Each upload auto-increments version number; sorted descending in UI
- **Party Management**: System entities (artist/label/publisher/PRO) or external parties; inline search for all entity types
- **Track Linking**: Search tracks by title/ISRC, link/unlink with inline confirmation
- **Split Management**: Named groups (e.g., "Primary Splits"), each containing items with party + percent

---

## Milestone 5: Network CRM Restoration

**Status:** ✅ COMPLETE

### Database Parity

| Model | Desktop Columns | Cloud Columns | Status |
|---|---|---|---|
| `organizations` | All columns (id, organization_id/UUID, name, org_type, website, address, timestamps) | All columns (id, organization_id/Int, name, org_type, website, address, timestamps) | ✅ COMPLETE |
| `individuals` | All columns (id, organization_id/UUID, first_name, last_name, email, phone, role, relationship_strength, image_url, timestamps) | All columns (id, organization_id/Int, first_name, last_name, email, phone, role, relationship_strength, image_url, timestamps) | ✅ COMPLETE |
| `platforms` | All columns (id, name, platform_type, portal_url, account_reference, territory_coverage, timestamps) | All columns (id, name, platform_type, portal_url, account_reference, territory_coverage, timestamps) | ✅ COMPLETE |
| `network_relationships` | All columns (id, relationship_type, source_type, source_id, target_type, target_id, start_date, end_date, notes, timestamps) | All columns (id, relationship_type, source_type, source_id, target_type, target_id, start_date, end_date, notes, timestamps) | ✅ COMPLETE |
| `individual_organizations` | Junction table | Junction table | ✅ COMPLETE |

### API Parity

| Endpoint | Status |
|---|---|
| GET/POST `api/network/organizations` — List/Create | ✅ |
| GET/PUT/DELETE `api/network/organizations?id=N` — Get/Update/Delete | ✅ |
| GET/POST `api/network/individuals` — List/Create (with org affiliation) | ✅ |
| GET/PUT/DELETE `api/network/individuals?id=N` — Get/Update/Delete | ✅ |
| GET/POST `api/network/platforms` — List/Create | ✅ |
| GET/PUT/DELETE `api/network/platforms?id=N` — Get/Update/Delete | ✅ |
| GET/POST/DELETE `api/network/relationships` — List/Create/Delete | ✅ |
| GET `api/network/health` — Health snapshot (counts) | ✅ |
| GET `api/network/all` — Unified all contacts | ✅ |

### Frontend Parity

| Page | Status |
|---|---|
| Network Dashboard (`/network`) — Health stats, nav cards for all 5 sections | ✅ |
| Organizations List (`/network/organizations`) — Searchable table, add modal (name/type/website/address), delete | ✅ |
| Organization Detail (`/network/organizations/[id]`) — Profile, contacts, individuals, affiliated catalog, edit/delete | ✅ |
| Individuals List (`/network/individuals`) — Searchable table with avatar/name/role/email/org/relationship, add modal, delete | ✅ |
| Individual Detail (`/network/individuals/[id]`) — Profile, contact details, organizations, contribution catalog, edit/delete | ✅ |
| Platforms List (`/network/platforms`) — Card grid with type/portal/account/territory, add modal, delete | ✅ |
| Platform Detail (`/network/platforms/[id]`) — Technical config, execution log, validation | ✅ |
| All Contacts (`/network/contacts`) — Unified list across orgs/individuals/platforms, type filter, search, delete | ✅ |
| Relationships (`/network/relationships`) — Relationship cards showing source→target, type, notes, date | ✅ |

### Business Logic Preserved

- **Polymorphic entity references**: `network_relationships` uses `source_type`/`source_id` and `target_type`/`target_id` pattern
- **Multi-affiliation**: `individual_organizations` junction table for many-to-many individual↔org
- **Relationship strength**: Core/Regular/Ad-hoc on individuals
- **Inline creation**: API supports creating individuals with organization affiliations
- **Unified contact lookup**: `/api/network/all` returns all entities with `item_type` discriminator

---

## Milestone 6: Office Suite Restoration

**Status:** ✅ COMPLETE

### Database Parity

All 7 Office models already had full column parity with desktop SQLAlchemy models — no Prisma schema changes were required.

| Model | Desktop Columns | Cloud Columns | Status |
|---|---|---|---|
| `documents` | filename, original_filename, file_path, file_type, mime_type, file_size, version, parent_document_id, organization_id, checksum, is_deleted, title, description, tags, category, related_entity_type, related_entity_id, uploaded_by, timestamps | Same columns (includes version, parent_document_id, checksum, is_deleted, title, description, tags, category) | ✅ COMPLETE |
| `notes` | title, content, content_markdown, organization_id, is_deleted, tags, category, color, pinned, attachments, related_entity_type, related_entity_id, created_by, timestamps | Same columns (includes is_deleted, category, attachments) | ✅ COMPLETE |
| `tasks` | title, description, status, priority, due_date, assigned_to_user_id, created_by_user_id, linked_entity_type, linked_entity_id, source_type, source_id, is_deleted, organization_id, timestamps | Same columns | ✅ COMPLETE |
| `events` | title, description, start_datetime, end_datetime, all_day, category, color, location, recurrence_rule, recurrence_end_date, reminder_minutes, related_entity_type, related_entity_id, created_by, is_deleted, organization_id, timestamps, event_type, status | Same columns (includes is_deleted, event_type, status) | ✅ COMPLETE |
| `activities` | user_id, action, entity_type, entity_id, entity_name, timestamp | Same columns | ✅ COMPLETE |
| `audit_logs` | action, entity_type, entity_id, entity_name, changes, user_id, ip_address, user_agent, created_at, entity_uuid, organization_id | Same columns (includes entity_uuid, organization_id) | ✅ COMPLETE |
| `status_quo_items` | organization_id, entity_type, entity_id, issue_type, severity, summary, details_json, created_at, resolved_at, resolved_by_user_id | Same columns | ✅ COMPLETE |

### API Parity

| Endpoint | Status |
|---|---|
| `GET/POST/PUT/DELETE /api/office/documents` — CRUD with search/filter by type/category/entity, file upload (FormData), soft delete | ✅ |
| `GET/POST/PUT/DELETE /api/office/notes` — CRUD with search/filter by category/pinned/entity, soft delete | ✅ |
| `GET/POST/PUT/DELETE /api/office/tasks` — CRUD with search/filter by status/priority/assigned/entity/source, soft delete | ✅ |
| `GET/POST/PUT/DELETE /api/office/events` — CRUD with search/filter by type/status/date range/entity, upcoming action, soft delete | ✅ |
| `GET /api/office/activities` — Read-only query with search/filter by action/entity/user/date range | ✅ |
| `GET /api/office/audit-logs` — Read-only query with search/filter by action/entity/user/date range | ✅ |
| `GET/POST/PUT/DELETE /api/office/status-quo` — CRUD with search/filter by entity/issue/severity, include_resolved, resolve action | ✅ |

### Frontend Parity

| Page | Status |
|---|---|
| Office Dashboard (`/office`) — Navigation cards linking to all 6 modules | ✅ |
| Documents (`/office/documents`) — Searchable/filterable table, upload modal with FormData, slide-over detail panel with PDF/image preview, download, soft delete with confirmation | ✅ |
| Notes (`/office/notes`) — Grid of note cards with preview, search/filter by category, create/edit modal with color/tags/pin, pin/unpin toggle, soft delete with confirmation | ✅ |
| Tasks (`/office/tasks`) — Searchable/filterable table (status/priority), status badges (todo/in_progress/blocked/done), priority badges, create/edit modal with full field set, quick status toggles, soft delete | ✅ |
| Events (`/office/events`) — Searchable/filterable table, compute Overdue detection, create/edit modal with datetime/all-day/location/recurrence, entity linking, soft delete | ✅ |
| Reports (`/office/reports`) — Dashboard with summary cards (total tasks/events/status-quo counts), report type grid, recent activity feed | ✅ |
| Status Quo (`/office/status-quo`) — RED/AMBER/GREEN summary counts, searchable/filterable table by severity/entity/issue, resolve action, slide-over detail panel with formatted details_json, delete | ✅ |

---

## Overall Progress

| Metric | Value |
|---|---|
| Database Parity | ~100% (all core entity models verified — Office Suite now confirmed complete) |
| API Parity | ~50% (contracts + network CRM + office suite restored) |
| Frontend Parity | ~80% (41 of ~50 pages real; all 6 office pages built) |
| Detail Page Parity | 6/6 completed (was 4/4, now +2: orgs + individuals) |

## Outstanding Gaps (Critical Path)

1. AI contract extraction pipeline (wizard step depends on AI services not yet migrated)
2. Remaining placeholders (~9 pages need real implementations)
3. `individuals.organization_id` — Prisma field is Int but desktop uses SafeUuid (UUID); non-blocking for current workflow

## Next Milestone

TBD — AI pipeline integration or remaining placeholder pages
