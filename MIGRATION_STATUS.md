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

## Milestone 7: Royalty Management Restoration

**Status:** ✅ COMPLETE

### Database Parity

| Model | Desktop Columns | Cloud Columns | Status |
|---|---|---|---|
| `royalties` | id, royalty_id, artist_id, work_id, track_id, source, amount (Numeric 15,2), currency, statement_date, fees (Numeric 15,2), advances (Numeric 15,2), created_at, updated_at | id, royalty_id, artist_id, work_id, track_id, source, amount (Decimal 15,2), currency, statement_date, fees (Decimal 15,2), advances (Decimal 15,2), created_at, updated_at | ✅ COMPLETE |

The Prisma `royalties` model already had full column parity with the desktop model — no schema changes were required. Monetary values use `Decimal(15,2)` for financial precision.

### API Parity

| Endpoint | Status |
|---|---|
| `GET /api/royalties` — List with filters (artist_id, work_id, track_id, source, date range, search) | ✅ |
| `GET /api/royalties?id=N` — Single with artist/track/work relations | ✅ |
| `GET ?action=summary` — Aggregated totals (total_amount, total_fees, total_advances, net_amount, by_source, by_artist, count) | ✅ |
| `GET ?action=validate-splits&contract_id=N` — Contract split validation against royalty data | ✅ |
| `POST /api/royalties` — Create with auto-generated royalty_id | ✅ |
| `PUT /api/royalties?id=N` — Update any fields | ✅ |
| `DELETE /api/royalties?id=N` — Hard delete | ✅ |

### Frontend Parity

| Page | Status |
|---|---|
| Royalty Dashboard (`/royalties`) — Summary cards (Total/Fees/Net), source/artist/work/track filters, sortable table, create/edit modal with EntityForm, Split Validation section with contract ID lookup, delete with confirmation | ✅ |
| Royalty Detail (`/royalties/[id]`) — Back navigation, Card grid with all fields + linked artist/work/track, inline edit modal, delete with confirmation, 404 handling | ✅ |
| AI Royalty Simulation (`/ai/royalties`) — Release search/dropdown, simulation params form, result table with integrity checks/warnings, manual split entry fallback, graceful 404 handling | ✅ |

### Business Rules

| Rule | Status |
|---|---|
| Split Validation — Loads contract split_groups + splits, compares percentages against matching royalty amounts, reports discrepancies | ✅ |
| By-Entity Aggregation — Royalties groupable by source/artist for reporting | ✅ |
| Financial Precision — Decimal(15,2) for monetary values, no floating point | ✅ |
| Referential Integrity — FK relations to artists/works/tracks preserved | ✅ |

---

## Milestone 8: AI Platform Restoration

**Status:** ✅ COMPLETE

### Database Parity

All 16 AI models were already defined in Prisma schema — no schema changes required.

| Model | Desktop | Cloud | Status |
|---|---|---|---|
| `ai_sessions` | organization_id, user_id, messages, timestamps | Same | ✅ COMPLETE |
| `ai_messages` | session_id, role, content, timestamps | Same | ✅ COMPLETE |
| `ai_audit_log` | action, tool, request_hash, org_id, user_id, timestamps | Same | ✅ COMPLETE |
| `ai_contract_resolution_runs` | org_id, user_id, contract_hash, versions, links, timestamps | Same | ✅ COMPLETE |
| `ai_contract_resolution_links` | run_id, entity_type, entity_id, action, confidence, rationale | Same | ✅ COMPLETE |
| `ai_contract_attach_runs` | org_id, user_id, contract_id, release_id, request_hash, links | Same | ✅ COMPLETE |
| `ai_contract_attach_links` | run_id, action_type, target_name, entity_id, confidence, details | Same | ✅ COMPLETE |
| `ai_contract_documents` | org_id, release_id, file_path, file_hash, uploaded_by, work_links | Same | ✅ COMPLETE |
| `ai_contract_drafts` | org_id, created_by, file metadata, extraction/suggested JSON | Same | ✅ COMPLETE |
| `ai_contract_work_links` | contract_document_id, work_id, confidence, match_strategy | Same | ✅ COMPLETE |
| `ai_core_write_proposal_runs` | org_id, user_id, contract_id, release_id, versions, items, events | Same | ✅ COMPLETE |
| `ai_core_write_proposal_items` | run_id, entity_type, entity_id, operation, patch, requires_review | Same | ✅ COMPLETE |
| `ai_core_write_apply_events` | run_id, user_id, status, applied/created/conflict counts, details | Same | ✅ COMPLETE |
| `ai_release_integration_runs` | org_id, user_id, release_id, contract_id, planner_version, links | Same | ✅ COMPLETE |
| `ai_release_integration_links` | run_id, entity_type, entity_id, display_name, action, confidence, rationale | Same | ✅ COMPLETE |
| `ai_royalty_simulation_runs` | org_id, user_id, release_id, integrity flags, splits_total, version | Same | ✅ COMPLETE |

### API Parity

| Endpoint | Status |
|---|---|
| `GET/POST /api/ai` — Health, sessions list, chat (create/continue session), archive | ✅ |
| `GET/POST /api/ai/analytics` — Overview summary, contract analytics (by status/type), catalog analytics | ✅ |
| `GET/POST /api/ai/contracts` — Extract runs, resolve links (create/attach), link suggestions, track map plan, intake wizard | ✅ |
| `GET/POST /api/ai/core-write` — Health, propose runs with items, apply proposals with events | ✅ |
| `GET/POST /api/ai/release-integration` — Health, plan runs (auto-detect artists/tracks), attach links, ingest | ✅ |
| `GET/POST /api/ai/royalty` — Health, simulate with integrity checks, persist runs idempotently | ✅ |

### Frontend Parity

| Page | Status |
|---|---|
| AI Dashboard (`/ai`) — Health bar, chat interface (create/resume sessions), tool cards grid, quick actions | ✅ |
| AI Analytics (`/ai/analytics`) — Summary KPI cards (contracts/artists/releases/tracks/works/sessions/runs), contract status breakdown, by-status/by-type tables, catalog analytics, refresh | ✅ |
| AI Royalty Simulation (`/ai/royalties`) — Release search/dropdown, simulation params, result table with integrity/warnings, manual split fallback | ✅ |
| AI Contract Extraction (`/ai/contracts`) — Extract form (contract hash + versions), runs list table, resolve links with entity detail, link suggestions | ✅ |
| AI Core Write (`/ai/core-write`) — Health/version, propose form (contract/release/doc IDs), proposals list, proposal detail with items/events, apply action | ✅ |
| AI Release Integration (`/ai/release-integration`) — Health, plan form (release/contract/planner), runs list table, attach entities form | ✅ |

### Business Rules

| Rule | Status |
|---|---|
| Proposal → Review → Apply → Audit workflow | ✅ |
| AI assists, does not modify production data silently | ✅ |
| Apply events record all changes with status/applied/conflict counts | ✅ |
| Royalty simulation includes integrity checks (over/under 100%) | ✅ |
| Idempotent persistence for royalty simulation runs | ✅ |
| Chat sessions are organized, auditable, and isolated per org | ✅ |
| All AI operations are traceable via ai_audit_log structure | ✅ |

### Integration

| Entity | Status |
|---|---|
| Artists — Lookup in link suggestions, analytics counts, release integration | ✅ |
| Works — AI contract work links, analytics, catalog queries | ✅ |
| Tracks — Release integration auto-detect, analytics | ✅ |
| Releases — Royalty simulation, release integration planner, analytics | ✅ |
| Contracts — Core write proposals, contract extraction runs, analytics | ✅ |
| Royalties — Simulation results, integrity validation against splits | ✅ |

---

## Overall Progress

| Metric | Value |
|---|---|
| Database Parity | ~100% (all core + AI entity models verified) |
| API Parity | ~75% (contracts + network CRM + office suite + royalties + AI platform restored) |
| Frontend Parity | ~95% (49 of ~50 pages real; all 6 AI pages built) |
| Detail Page Parity | 7/7 completed |

## Outstanding Gaps (Critical Path)

1. ~1 remaining placeholder page needs real implementation
2. `individuals.organization_id` — Prisma field is Int but desktop uses SafeUuid (UUID); non-blocking for current workflow
3. Actual LLM/ML service integration (AI endpoints exist but use deterministic logic — real AI extraction requires external AI service)

## Next Milestone

TBD — Final cleanup, remaining placeholder, or Vercel deployment readiness

### Royalty Restoration Report

| Component | Status |
|---|---|
| Royalty Model | ✅ COMPLETE — Full column parity, no schema changes needed |
| Royalty APIs | ✅ COMPLETE — CRUD + summary + split validation + per-entity queries |
| Royalty UI | ✅ COMPLETE — Dashboard list, detail view, AI simulation page |
| Split Validation | ✅ COMPLETE — Contract split vs royalty amount comparison |
| Reporting Hooks | ✅ COMPLETE — Summary aggregation (by source, by artist) with cumulative totals |

### AI Restoration Report

| Component | Status |
|---|---|
| AI Sessions | ✅ COMPLETE — Create, resume, list, archive, chat message storage |
| AI Messages | ✅ COMPLETE — Role-based messages with session association |
| Contract AI | ✅ COMPLETE — Extraction runs, resolution links, link suggestions, intake wizard, track map plan |
| Core Write | ✅ COMPLETE — Proposal generation with items, apply with events, health |
| Release Integration | ✅ COMPLETE — Integration plan with auto-detected entities, attach links, ingest |
| Track Mapping | ✅ COMPLETE — Track map plan endpoint via contract AI routes |
| Royalty Simulation | ✅ COMPLETE — Simulation with integrity checks, idempotent persistence, health |
