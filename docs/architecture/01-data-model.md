# 01 — Data Model

## Principle 1 — Everything is an Object

Every entity in Otto inherits from a common `BaseObject` pattern. This guarantees
consistent behavior across all modules.

### BaseObject Fields

```
id              : UUID or Auto-increment Int
organization_id : UUID (tenant scope)
tenant_id       : UUID? (optional multi-tenant)
created_at      : DateTime
updated_at      : DateTime
is_deleted      : Boolean (soft delete)
created_by      : User ID (nullable)
```

### Universal Features (via linked tables, not columns)

Every object is eligible for:

| Feature       | Mechanism                                    |
|---------------|----------------------------------------------|
| Activity      | `audit_logs` (action, entity_type, entity_id)|
| Comments      | `office_notes` + `office_note_links`         |
| Attachments   | `office_documents` + `office_document_links`  |
| Tasks         | `tasks` (linked_entity_type, linked_entity_id)|
| Events        | `events` (related_entity_type, related_entity_id)|
| Permissions   | Evaluated via IAM (per-module)               |
| AI Context    | Ad-hoc via `ai_sessions` + entity context    |
| Timeline      | `audit_logs` for lifecycle transitions       |

---

## Entity Catalog by Module

### Foundation — Identity

| Entity       | Status | Prisma Model | Key Fields |
|--------------|--------|-------------|------------|
| Organization | ✅ | `tenants` | id, name, display_name, logo_url, brand_color, ai_model, owner_id |
| User         | ✅ | `User` | id, email, name, role, is_superuser, avatar_url |
| Role         | ✅ | `roles` | id, name, is_system, organization_id |
| Permission   | ✅ | `permissions` | id, code, name, module |
| Role-Permission | ✅ | `role_permissions` | role_id, permission_id |
| User-Role    | ✅ | `user_roles` | user_id, role_id |
| Team         | ✅ | `teams` | id, name, organization_id |
| Team Member  | ✅ | `team_members` | team_id, user_id |
| Invitation   | ✅ | `invitations` | id, tenant_id, email, token, role_id |
| API Key      | ✅ | `api_keys` | id, prefix, key_hash, scopes, rate_limit |
| SSO Provider | ✅ | `sso_providers` | id, provider, client_id, issuer_url |

### Foundation — Billing

| Entity       | Status | Prisma Model | Key Fields |
|--------------|--------|-------------|------------|
| Plan         | ✅ | `plans` | id, name, price, job_limit, ai_enabled |
| Subscription | ✅ | `subscriptions` | id, plan_id, status, period_start, period_end |

### Foundation — Notifications

| Entity       | Status | Prisma Model | Key Fields |
|--------------|--------|-------------|------------|
| Workspace Notification | ✅ | `workspace_notifications` | workspace_id, user_id, type, title, is_read |

> **Gap:** No global notification table. Notifications are scoped to workspaces only.
> A `notifications` table should be added for cross-module, user-level notifications.

### Foundation — Activity

| Entity       | Status | Prisma Model | Key Fields |
|--------------|--------|-------------|------------|
| Audit Log    | ✅ | `audit_logs` | action, entity_type, entity_id, changes, user_id |
| Activity     | ✅ | `activities` | user_id, action, entity_type, entity_id |
| Usage        | ✅ | `usage` | organization_id, metric, value, period |
| Job          | ✅ | `jobs` | id, status, input, output, error |

### Foundation — AI

| Entity            | Status | Prisma Model | Key Fields |
|-------------------|--------|-------------|------------|
| AI Session        | ✅ | `ai_sessions` | organization_id, user_id |
| AI Message        | ✅ | `ai_messages` | session_id, role, content |
| AI Audit Log      | ✅ | `ai_audit_log` | organization_id, user_id, action, tool |
| AI Contract Draft | ✅ | `ai_contract_drafts` | file_path, extraction_json, suggested_defaults |
| AI Proposal Run   | ✅ | `ai_core_write_proposal_runs` | contract_id, release_id, request_hash |
| AI Proposal Item  | ✅ | `ai_core_write_proposal_items` | entity_type, entity_id, operation, patch_json |
| AI Apply Event    | ✅ | `ai_core_write_apply_events` | run_id, status, applied_count |
| AI Contract Attach Run | ✅ | `ai_contract_attach_runs` | contract_id, release_id |
| AI Contract Attach Link | ✅ | `ai_contract_attach_links` | action_type, target_name, confidence |
| AI Resolution Run | ✅ | `ai_contract_resolution_runs` | contract_hash, extractor_version |
| AI Resolution Link | ✅ | `ai_contract_resolution_links` | entity_type, entity_id, action, confidence |
| AI Release Integration Run | ✅ | `ai_release_integration_runs` | release_id, contract_id |
| AI Release Integration Link | ✅ | `ai_release_integration_links` | entity_type, entity_id, action, confidence |
| AI Royalty Simulation | ✅ | `ai_royalty_simulation_runs` | release_id, splits_total, integrity checks |
| AI Contract Work Link | ✅ | `ai_contract_work_links` | contract_document_id, work_id, confidence |

---

### Module — Music (Catalog)

| Entity          | Status | Prisma Model | Key Fields |
|-----------------|--------|-------------|------------|
| Artist          | ✅ | `artists` | name, legal_name, artist_kind (solo/group), ipi_number, streaming_links, social_media |
| Artist Membership| ✅ | `artist_memberships` | group_id, member_id, role |
| Track (Song)    | ✅ | `tracks` | title, isrc_code, duration, genre, artist_ids |
| Release         | ✅ | `releases` | title, upc_code, release_type, release_date, catalog_number |
| Release-Track   | ✅ | `track_releases` | track_id, release_id |
| Work            | ✅ | `works` | title, iswc_code, composers, arrangers |
| Work Admin      | ✅ | `works_admin` | registration_status, registered_with, registration_date |
| Work Admin Doc  | ✅ | `works_admin_documents` | doc_type, file_path |
| Label           | ✅ | `labels` | name, address, contact_email |
| Publisher       | ✅ | `publishers` | name, rights_type, contact_email |
| PRO (Performance Rights Org) | ✅ | `pros` | name, territory, contact_email |
| Platform (DSP)  | ✅ | `platforms` | name, platform_type, portal_url |
| Playlist        | ✅ | `playlists` | name, track_ids, is_public, share_link |

> **Gap:** No standalone `Album`, `Single`, or `EP` entity. These are differentiated
> via `releases.release_type`. This is sufficient for v1.
>
> **Gap:** No `ISRC` or `UPC` management table beyond the scalar fields on
> `tracks.isrc_code` and `releases.upc_code`. If batch management or reservation
> is needed, a dedicated `identifiers` table should be added.
>
> **Gap:** No `SplitSheet` entity. Splits are modeled inside contracts via
> `contract_split_groups` and `contract_splits`. A standalone split sheet
> (not attached to a contract) may be needed.
>
> **Gap:** No `Credit` entity. Credits are stored as JSON on tracks and releases.
> A formal `credits` table would enable structured role-based credits (e.g.,
> "Producer: X", "Engineer: Y", "Writer: Z").

---

### Module — Production

| Entity            | Status | Key Fields |
|-------------------|--------|------------|
| Recording Session | ❌ | id, artist_id, track_id, studio_id, date, duration, status |
| Studio            | ❌ | id, name, location, rate, availability |
| Studio Booking    | ❌ | id, studio_id, session_id, start, end, status |
| Producer          | ❌ | id, user_id, specialization |
| Engineer          | ❌ | id, user_id, role (mixing/mastering/recording) |
| Version           | ❌ | id, track_id, version_label, file_path, created_at |
| Mix Review        | ❌ | id, version_id, reviewer_id, comments, status |
| Master Review     | ❌ | id, version_id, reviewer_id, comments, status |
| Session Asset     | ❌ | id, session_id, file_path, type (raw/stems/mix/master) |

> **Gap:** Entire module missing. Production is currently an implicit workflow
> inside workspaces. v1 Production module should make recording sessions,
> version management, and mix/master review first-class objects.

---

### Module — Contracts (Business)

| Entity                | Status | Prisma Model | Key Fields |
|-----------------------|--------|-------------|------------|
| Contract              | ✅ | `contracts` | contract_number, title, status, type, territory, exclusivity |
| Contract Party        | ✅ | `contract_parties` | entity_type, entity_id, role, split_percent |
| Contract Document     | ✅ | `contract_documents` | file_path, version, checksum |
| Contract Asset        | ✅ | `contract_assets` | asset_type, asset_id, scope_type |
| Contract Split Group  | ✅ | `contract_split_groups` | group_name, group_type |
| Contract Split        | ✅ | `contract_splits` | party_id, percent |
| Contract Track Link   | ✅ | `contract_track_links` | contract_id, track_id |

---

### Module — Royalties (Business)

| Entity        | Status | Prisma Model | Key Fields |
|---------------|--------|-------------|------------|
| Royalty       | ✅ | `royalties` | artist_id, work_id, track_id, source, amount, currency |
| Statement     | ❌ | — | id, royalty_ids, period, organization_id, total, generated_at |
| Calculation   | ❌ | — | id, statement_id, ruleset, result, status |

> **Gap:** Royalties exist as raw line items. No statement or calculation engine
> beyond the AI simulation run.

---

### Module — Financial (Business)

| Entity       | Status | Key Fields |
|--------------|--------|------------|
| Invoice      | ❌ | id, contract_id, amount, currency, status, issued_date, due_date |
| Budget       | ❌ | id, project_id, total, spent, remaining |
| Expense      | ❌ | id, budget_id, category, amount, receipt_url |
| Accounting Entry | ❌ | id, invoice_id, debit_account, credit_account, amount |

> **Gap:** Entire module missing. Invoicing, accounting, budgets, and expenses
> are not yet modeled.

---

### Module — Marketing

| Entity         | Status | Key Fields |
|----------------|--------|------------|
| Campaign       | ❌ | id, name, release_id, start_date, end_date, budget, status |
| Calendar Entry | ❌ | id, campaign_id, date, type, description |
| Press Item     | ❌ | id, release_id, publication, url, date |
| Email Campaign | ❌ | id, name, template, recipient_list, sent_date |
| Social Post    | ❌ | id, platform, scheduled_date, content, status |
| Asset          | ❌ | id, campaign_id, file_path, type (artwork/video/copy) |
| Analytics Snapshot | ❌ | id, campaign_id, metric, value, date |

> **Gap:** Entire module missing. Marketing is not yet modeled.
> Some fields on existing models could serve as starting points
> (e.g., `releases.cover_art_url` for artwork), but campaigns,
> calendars, and press are not represented.

---

### Module — CRM (Network)

| Entity                  | Status | Prisma Model | Key Fields |
|-------------------------|--------|-------------|------------|
| Individual (Contact)    | ✅ | `individuals` | first_name, last_name, email, phone, role |
| Organization (Contact)  | ✅ | `organizations` | name, org_type, website, address |
| Individual-Org Link     | ✅ | `individual_organizations` | individual_id, organization_id |
| Network Relationship    | ✅ | `network_relationships` | source_type, source_id, target_type, target_id, relationship_type |
| Platform (DSP)          | ✅ | `platforms` | name, platform_type, portal_url |
| Playlist                | ✅ | `playlists` | name, track_ids, is_public |

> **Gap:** No entity subtype differentiation for sponsors, venues, DJs, radio,
> influencers, or media houses. These are all currently `organizations` or
> `individuals` with `org_type` / `role` discrimination. If formal subtypes
> are needed, either a `type` discriminator or separate tables should be added.

---

### Module — Project Management (Office)

| Entity     | Status | Prisma Model | Key Fields |
|------------|--------|-------------|------------|
| Task       | ✅ | `tasks` | title, status, priority, due_date, assigned_to, linked_entity |
| Note       | ✅ | `notes` | title, content, tags, category, pinned, linked_entity |
| Event      | ✅ | `events` | title, start_datetime, end_datetime, category, recurrence_rule, linked_entity |
| Document   | ✅ | `documents` | filename, file_path, mime_type, version, category, linked_entity |
| Office Note | ✅ | `office_notes` | title, body, tags |
| Office Note Link | ✅ | `office_note_links` | note_id, entity_type, entity_id |
| Office Document | ✅ | `office_documents` | doc_type, title, storage_path, checksum |
| Office Document Link | ✅ | `office_document_links` | document_id, entity_type, entity_id |

> **Note:** There are two parallel notes systems (`notes` and `office_notes`)
> and two document systems (`documents` and `office_documents`). These should
> be consolidated in a future migration. The `office_*` tables use explicit
> link tables for entity association, which is the preferred pattern.

---

### Module — Analytics

| Entity           | Status | Key Fields |
|------------------|--------|------------|
| Report Definition | ✅ | `report_definitions` | name, report_type, config_json |
| Report Run       | ✅ | `report_runs` | status, parameters_json, row_count |
| Report Artifact  | ✅ | `report_artifacts` | format, storage_path, filename |
| Dashboard        | ❌ | — | id, name, widgets[], organization_id |
| Analytics Snapshot| ❌ | — | id, metric, value, period, source |

> **Gap:** No dashboard model or metric snapshots. Reporting is ad-hoc via
> report definitions. Pre-built analytics dashboards for revenue, streaming,
> and campaign performance are not yet modeled.

---

### Module — Workspaces

| Entity                | Status | Prisma Model | Key Fields |
|-----------------------|--------|-------------|------------|
| Workspace Template    | ✅ | `workspace_templates` | name, slug, icon, color |
| Template Section      | ✅ | `workspace_template_sections` | name, slug, sort_order |
| Template Status       | ✅ | `workspace_template_statuses` | name, slug, sort_order, color |
| Workspace             | ✅ | `workspaces` | name, description, template_id, status |
| Workspace Member      | ✅ | `workspace_members` | user_id, role, invited_at, accepted_at |
| Timeline Event        | ✅ | `workspace_timeline_events` | event_type, summary, details |
| Workspace File        | ✅ | `workspace_files` | category, filename, file_path |
| Workspace Notification| ✅ | `workspace_notifications` | type, title, is_read |

---

### Module — System & Admin

| Entity                    | Status | Prisma Model |
|---------------------------|--------|-------------|
| Status Quo Item           | ✅ | `status_quo_items` |
| Backup Artifact           | ✅ | `admin_backup_artifacts` |
| Backup Restore Event      | ✅ | `admin_backup_restore_events` |
| Restore Audit             | ✅ | `admin_restore_audit` |

---

## Entity Relationship Map

```
Organization (tenants)
├── User (owner, members)
├── Role
├── Team
├── Subscription → Plan
├── API Key
├── SSO Provider
│
├── Artist
│   ├── Artist Membership (group → members)
│   ├── Release → Track → Work
│   ├── Contract → Contract Party, Contract Document, Contract Split
│   └── Royalty
│
├── Workspace
│   ├── Workspace Member
│   ├── Timeline Event
│   ├── Workspace File
│   └── Workspace Notification
│
├── Task (linked to any entity)
├── Note (linked to any entity)
├── Event (linked to any entity)
├── Document (linked to any entity)
│
├── Individual → Organization (network contacts)
├── Network Relationship (any ↔ any)
│
└── AI Session → AI Message
```

---

## Cross-Cutting Concerns

### Soft Deletes

All major entities use `is_deleted: Boolean @default(false)`. This enables safe
undo and audit trails. Queries must always filter `WHERE is_deleted = false`
unless explicitly querying deleted records.

### Organization Isolation

Every entity carries `organization_id` (UUID) to enforce multi-tenant isolation.
All queries must filter by `organization_id` from the authenticated session.

### Status Lifecycles

Status fields follow the timeline pattern (Principle 2). Each status transition
is recorded in `audit_logs` with `action = "<entity>.<new_status>"`.

Standard statuses per module:

| Module    | Statuses |
|-----------|----------|
| Artist    | active, suspended, archived |
| Track     | draft, recording, mixing, mastering, complete, released |
| Release   | planning, recording, mixing, mastering, pressing, promoted, released, archived |
| Contract  | draft, pending_signature, active, completed, terminated, expired |
| Task      | todo, in_progress, review, done, cancelled |
| Campaign  | planning, active, paused, completed, archived |
| Invoice   | draft, sent, paid, overdue, cancelled |
| Workspace | planning, active, completed, archived |

### Timeline Pattern (Principle 2)

Every status transition generates an audit log entry:

```
{
  action: "track.released",
  entity_type: "track",
  entity_id: 42,
  entity_name: "Song Title",
  changes: { status: { from: "complete", to: "released" } },
  user_id: 7,
  organization_id: "org-uuid"
}
```

This enforces Principle 2 (Timeline) without requiring a separate timeline
table per entity — the `audit_logs` table serves as the universal timeline.

### Linking Pattern (Principle 3)

Cross-entity links use one of two patterns:

1. **Direct foreign key** — for strong, permanent relationships (e.g.,
   `tracks.release_id`, `contracts.artist_id`).

2. **Link tables** — for polymorphic or many-to-many relationships (e.g.,
   `office_note_links`, `office_document_links`, `contract_track_links`,
   `contract_assets`).

When adding a new link type, prefer the link table pattern if the relationship
is optional, temporary, or polymorphic. Use direct FKs for structural ownership.

---

## Migration Approach

### Short-term (v1.4)

1. Add `notifications` table for global notifications
2. Consolidate `notes`/`office_notes` and `documents`/`office_documents`
3. Add `credits` table for structured role-based credits

### Medium-term (v1.5)

1. Build Production module (sessions, versions, reviews)
2. Build Marketing module (campaigns, calendar, press)
3. Add `invoices` table for billing/invoicing

### Long-term (v2.0+)

1. Build Financial module (budgets, expenses, accounting)
2. Build CRM subtypes (sponsors, venues, DJs, radio, influencers)
3. Build Analytics module (dashboards, metric snapshots)
