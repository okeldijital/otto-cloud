# OTTO Migration: Architecture Audit & Parity Matrices

## Overview

Migration of **OTTO Desktop** (FastAPI + SQLAlchemy + React/Vite + Electron) into **OTTO Cloud** (Next.js 16 App Router + Prisma + Neon PostgreSQL).

## 1. Database Parity Matrix

### Desktop SQLAlchemy Models (36 files, 59 classes)

| Model (Desktop) | Prisma Status | Notes |
|---|---|---|
| User | ✅ `User` | Cloud has more fields (role, last_login, avatar_url) |
| Activity | ✅ `activities` | Match |
| Artist | ✅ `artists` | Desktop `name` is **unique**, Prisma is not; Desktop has `streaming_link` (String), Prisma missing |
| ArtistMembership | ✅ `artist_memberships` | Match |
| AuditLog | ✅ `audit_logs` | Match |
| Contract | ✅ `contracts` | Match |
| ContractParty | ✅ `contract_parties` | Match |
| ContractAsset | ✅ `contract_assets` | Match |
| ContractDocument | ✅ `contract_documents` | Match |
| ContractSplitGroup | ✅ `contract_split_groups` | Match |
| ContractSplit | ✅ `contract_splits` | Match |
| AIContractDocument | ✅ `ai_contract_documents` | Match |
| AIContractWorkLink | ✅ `ai_contract_work_links` | Match |
| ContractIntakeReleaseLink | ✅ `contract_intake_release_links` | Match |
| ContractTrackLink | ✅ `contract_track_links` | Match |
| AIContractDraft | ✅ `ai_contract_drafts` | Match |
| AIContractAttachRun | ✅ `ai_contract_attach_runs` | Match |
| AIContractAttachLink | ✅ `ai_contract_attach_links` | Match |
| Document | ✅ `documents` | Match |
| Event | ✅ `events` | Match |
| StatusQuoItem | ✅ `status_quo_items` | Match |
| Label | ✅ `labels` | Match |
| Organization (Company) | ✅ `organizations` | Desktop uses `Organization`, Prisma uses `organizations` |
| Individual (Contact) | ✅ `individuals` | Desktop uses `Individual`, Prisma uses `individuals` |
| Platform | ✅ `platforms` | Match |
| NetworkRelationship | ✅ `network_relationships` | Match |
| Note | ✅ `notes` | Match |
| OfficeDocument | ✅ `office_documents` | Match |
| OfficeDocumentLink | ✅ `office_document_links` | Match |
| OfficeNote | ✅ `office_notes` | Match |
| OfficeNoteLink | ✅ `office_note_links` | Match |
| Playlist | ✅ `playlists` | Match |
| PRO | ✅ `pros` | Match |
| Publisher | ✅ `publishers` | Match |
| Release | ✅ `releases` | Desktop has `streaming_link` (String), Prisma missing |
| AIReleaseIntegrationRun | ✅ `ai_release_integration_runs` | Match |
| AIReleaseIntegrationLink | ✅ `ai_release_integration_links` | Match |
| ReportDefinition | ✅ `report_definitions` | Match |
| ReportRun | ✅ `report_runs` | Match |
| ReportArtifact | ✅ `report_artifacts` | Match |
| Royalty | ✅ `royalties` | Match |
| Task | ✅ `tasks` | Match |
| Track | ✅ `tracks` | Match |
| AISession | ✅ `ai_sessions` | Match |
| AIMessage | ✅ `ai_messages` | Match |
| AIAuditLog | ✅ `ai_audit_log` | Match |
| AIContractResolutionRun | ✅ `ai_contract_resolution_runs` | Match |
| AIContractResolutionLink | ✅ `ai_contract_resolution_links` | Match |
| AICoreWriteProposalRun | ✅ `ai_core_write_proposal_runs` | Match |
| AICoreWriteProposalItem | ✅ `ai_core_write_proposal_items` | Match |
| AICoreWriteApplyEvent | ✅ `ai_core_write_apply_events` | Match |
| AIRoyaltySimulationRun | ✅ `ai_royalty_simulation_runs` | Match |
| Work | ✅ `works` | Match |
| WorksAdmin | ✅ `works_admin` | Match |
| WorksAdminDocument | ✅ `works_admin_documents` | Match |
| AdminBackupArtifact | ✅ `admin_backup_artifacts` | Match |
| AdminRestoreAudit | ✅ `admin_restore_audit` | Match |
| AdminBackupRestoreEvent | ✅ `admin_backup_restore_events` | Match |

### Cloud-Only Models (no desktop equivalent)

| Model | Purpose |
|---|---|
| `plans` | Subscription plans |
| `subscriptions` | Org subscriptions |
| `jobs` | Async job tracking |
| `usage` | AI usage metrics |
| `alembic_version` | Migration tracking (remnant) |
| `playing_with_neon` | Test table |

### Column-Level Gaps (critical)

| Model | Desktop Field | Prisma Status | Action |
|---|---|---|---|
| `artists` | `name` unique constraint | ❌ Not unique | Add unique index |
| `artists` | `streaming_link` (String, not JSON) | ❌ Missing | Add column |
| `releases` | `streaming_link` (String) | ❌ Missing | Add column |

---

## 2. API Parity Matrix

### Desktop: 259 route decorators across 36 files
### Cloud: 16 route.ts files

| Domain | Desktop Routes | Cloud Routes | Status |
|---|---|---|---|
| **Auth** | 4 (`/token`, `/register`, `/me` GET/PUT) | 4 (`/auth/login`, `/register`, `/me`, `[...nextauth]`) | ✅ Partial (NextAuth replaces `/token`) |
| **Catalog - Artists** | 10 (CRUD, search, members, releases, works) | 1 (`/api/artists`) | 🔴 Major gap |
| **Catalog - Releases** | 6 (CRUD, tracks) | 1 (`/api/releases`) | 🔴 Major gap |
| **Catalog - Tracks** | 6 (CRUD, search, by_ids) | 1 (`/api/tracks`) | 🔴 Major gap |
| **Catalog - Works** | 5 (CRUD) | 1 (`/api/works`) | 🔴 Major gap |
| **Catalog - Labels** | 6 (CRUD, artists, releases) | 1 (`/api/labels`) | 🔴 Major gap |
| **Catalog - Publishers** | 7 (CRUD, artists, works) | 1 (`/api/publishers`) | 🔴 Major gap |
| **Catalog - PROs** | 5 (CRUD) | 1 (`/api/pros`) | 🔴 Major gap |
| **Contracts** | 30+ (CRUD, parties, assets, documents, splits, tracks, search) | 1 (`/api/contracts`) | 🔴 Major gap |
| **Contracts Wizard** | 5 (drafts, attach plan/apply) | ❌ Missing | 🔴 Missing |
| **Documents** | 6 (CRUD, upload) | ❌ Missing | 🔴 Missing |
| **Events** | 5 (CRUD) | ❌ Missing | 🔴 Missing |
| **Notes** | 5 (CRUD) | ❌ Missing | 🔴 Missing |
| **Tasks** | 5 (CRUD) | ❌ Missing | 🔴 Missing |
| **Playlists** | 5 (CRUD) | ❌ Missing | 🔴 Missing |
| **Royalties** | 5 (CRUD) | ❌ Missing | 🔴 Missing |
| **Search** | 1 (global search) | 1 (`/api/search`) | ✅ Present but verify scope |
| **Network** | 14 (orgs, individuals, platforms, relationships CRUD) | ❌ Missing | 🔴 Missing |
| **Office - Documents** | 9 (CRUD, links, download, preview) | ❌ Missing | 🔴 Missing |
| **Office - Events** | 5 (CRUD) | ❌ Missing | 🔴 Missing |
| **Office - Notes** | 7 (CRUD, links) | ❌ Missing | 🔴 Missing |
| **Office - Tasks** | 5 (CRUD, sync-status-quo) | ❌ Missing | 🔴 Missing |
| **Office - Reports** | 14 (definitions CRUD, runs, artifacts, export, share) | ❌ Missing | 🔴 Missing |
| **Office - Status Quo** | 3 (list, recompute, resolve) | ❌ Missing | 🔴 Missing |
| **Works Admin** | 6 (list, detail, update, documents) | ❌ Missing | 🔴 Missing |
| **Admin** | 4 (backup schedule, stats, audit-logs) | ❌ Missing | 🔴 Missing |
| **Backup** | 6 (CRUD, upload, restore, download) | ❌ Missing | 🔴 Missing |
| **System Control Center** | 7+ (health, runtime, db inventory/switch, orgs switch, storage) | ❌ Missing | 🔴 Missing |
| **AI** | 4 (health, tools, chat) | ❌ Missing | 🔴 Missing |
| **AI - Analytics** | 4 (summary, overview, contracts, catalog) | ❌ Missing | 🔴 Missing |
| **AI - Contracts** | 6+ (extract, link_suggest, resolve, wizard_plan) | ❌ Missing | 🔴 Missing |
| **AI - Core Write** | 3 (propose, apply) | ❌ Missing | 🔴 Missing |
| **AI - Release Integration** | 4 (plan, attach, ingest) | ❌ Missing | 🔴 Missing |
| **AI - Release Mapping** | 1 | ❌ Missing | 🔴 Missing |
| **AI - Release Validation** | 2 | ❌ Missing | 🔴 Missing |
| **AI - Royalty** | 2 (simulate) | ❌ Missing | 🔴 Missing |
| **Analytics** | 7 (KPI, revenue-trend, catalog-growth, upcoming-events, etc.) | ❌ Missing | 🔴 Missing |
| **Reports/Export** | 6 (export artists, releases, works, tasks, events, etc.) | ❌ Missing | 🔴 Missing |
| **Users** | 5 (CRUD) | 1 (`/api/users`) | 🔴 Gap |
| **Config** | 3 (config, node/info, is-first-run) | ❌ Missing | 🔴 Missing |
| **Health** | ❌ N/A | 1 (`/api/health`) | ✅ Cloud addition |
| **Test DB** | ❌ N/A | 1 (`/api/test-db`) | ✅ Cloud addition |

**Drive-by resolution on contracts**
- `/api/contracts` exists but needs ~30 endpoints (parties, assets, documents, splits, tracks, wizard, search)
- `/api/artists` exists but needs ~10 endpoints (CRUD + search + members + releases + works)
- `/api/releases` exists but needs ~6 endpoints (CRUD + tracks)
- `/api/tracks` exists but needs ~6 endpoints (CRUD + search + by_ids)
- `/api/works` exists but needs ~5 endpoints (CRUD)
- `/api/labels` exists but needs ~6 endpoints (CRUD + artists + releases)
- `/api/publishers` exists but needs ~7 endpoints (CRUD + artists + works)
- `/api/pros` exists but needs ~5 endpoints (CRUD)
- `/api/search` exists — need to verify scope matches desktop

---

## 3. Feature Parity Matrix

### Core Features (Desktop vs Cloud)

| Feature Area | Desktop | Cloud | Status |
|---|---|---|---|
| **Dashboard** | ✅ Full analytics dashboard | ✅ Placeholder (`/dashboard`) | 🟡 Needs real data |
| **Login/Auth** | ✅ Email/password | ✅ NextAuth + email/password | ✅ Working |
| **Registration** | ✅ Self-register | ✅ Register page | ✅ Working |
| **Setup Wizard** | ✅ First-run setup | ❌ Missing | 🔴 Missing |
| **Settings** | ✅ User preferences | ✅ Placeholder (`/settings`) | 🟡 Needs implementation |
| **Organization Switcher** | ✅ Multi-org | ❌ Missing | 🔴 Missing |

### Catalog Features

| Feature Area | Desktop | Cloud | Status |
|---|---|---|---|
| **Artist List** | ✅ CRUD, search, filter | ✅ Placeholder page | 🟡 Needs real UI + API |
| **Artist Detail** | ✅ Full profile, members, releases, works, contracts, royalties | ✅ Placeholder `[id]` page | 🟡 Needs real UI + API |
| **Release List** | ✅ CRUD, search, filter | ✅ Placeholder page | 🟡 Needs real UI + API |
| **Release Detail** | ✅ Tracks, artists, contracts, credits | ✅ Placeholder `[id]` page | 🟡 Needs real UI + API |
| **Track List** | ✅ CRUD, search, filter | ✅ Placeholder page | 🟡 Needs real UI + API |
| **Track Detail** | ✅ Works, releases, royalties, credits | ✅ Placeholder `[id]` page | 🟡 Needs real UI + API |
| **Work List** | ✅ CRUD, search, filter | ✅ Placeholder page | 🟡 Needs real UI + API |
| **Work Detail** | ✅ Tracks, publishers, PRO, admin | ✅ Placeholder `[id]` page | 🟡 Needs real UI + API |
| **Label List** | ✅ CRUD, search | ✅ Placeholder page | 🟡 Needs real UI + API |
| **Label Detail** | ✅ Artists, releases | ✅ Placeholder `[id]` page | 🟡 Needs real UI + API |
| **Publisher List** | ✅ CRUD, search | ✅ Placeholder page | 🟡 Needs real UI + API |
| **Publisher Detail** | ✅ Artists, works | ✅ Placeholder `[id]` page | 🟡 Needs real UI + API |
| **PRO List** | ✅ CRUD, search | ✅ Placeholder page | 🟡 Needs real UI + API |
| **C Catalog Groups** | ✅ Group management | ❌ Missing | 🔴 Missing |

### Contract Features

| Feature Area | Desktop | Cloud | Status |
|---|---|---|---|
| **Contract List** | ✅ CRUD, search, filter | ❌ Missing page (only bulk/) | 🔴 Missing |
| **Contract Detail** | ✅ Parties, assets, documents, splits, tracks | ❌ Missing | 🔴 Missing |
| **Contract Parties** | ✅ Multi-assign, batch set, search | ❌ Missing | 🔴 Missing |
| **Contract Assets** | ✅ CRUD | ❌ Missing | 🔴 Missing |
| **Contract Splits** | ✅ Groups, splits, percentages | ❌ Missing | 🔴 Missing |
| **Contract Documents** | ✅ Upload, versioning, download, preview | ❌ Missing | 🔴 Missing |
| **Contract Tracks** | ✅ Multi-select, batch set | ❌ Missing | 🔴 Missing |
| **Bulk Contract Wizard** | ✅ Card-based bulk intake | ✅ Placeholder (`/contracts/bulk`) | 🟡 Needs implementation |

### Network/CRM Features

| Feature Area | Desktop | Cloud | Status |
|---|---|---|---|
| **Organizations** | ✅ CRUD, detail | ✅ Placeholder page | 🟡 Needs implementation |
| **Organization Detail** | ✅ Full profile | ✅ Placeholder `[id]` page | 🟡 Needs implementation |
| **Individuals** | ✅ CRUD, detail | ✅ Placeholder page | 🟡 Needs implementation |
| **Individual Detail** | ✅ Full profile | ✅ Placeholder `[id]` page | 🟡 Needs implementation |
| **Platforms** | ✅ CRUD, detail | ❌ Missing list page (only `[id]`) | 🔴 Missing |
| **Platform Detail** | ✅ Full profile | ✅ Placeholder `[id]` page | 🟡 Needs implementation |
| **Relationships** | ✅ Visual network graph | ❌ Missing | 🔴 Missing |
| **Network Dashboard** | ✅ Overview | ❌ Missing | 🔴 Missing |

### Office Features

| Feature Area | Desktop | Cloud | Status |
|---|---|---|---|
| **Office Dashboard** | ✅ Overview | ✅ Placeholder | 🟡 Needs implementation |
| **Documents** | ✅ CRUD, categories, search | ✅ Placeholder page | 🟡 Needs implementation |
| **Events** | ✅ Calendar, CRUD, recurrence | ✅ Placeholder page | 🟡 Needs implementation |
| **Tasks** | ✅ Kanban, CRUD, status-quo sync | ✅ Placeholder page | 🟡 Needs implementation |
| **Notes** | ✅ Rich text, tags, pinning | ✅ Placeholder page | 🟡 Needs implementation |
| **Reports** | ✅ Definitions, runs, exports (PDF), sharing | ✅ Placeholder page | 🟡 Needs implementation |
| **Status Quo** | ✅ Auto-detected issues, resolve flow | ✅ Placeholder page | 🟡 Needs implementation |

### AI Features

| Feature Area | Desktop | Cloud | Status |
|---|---|---|---|
| **AI Chat** | ✅ Chat with tools | ✅ Placeholder page | 🟡 Needs implementation |
| **AI Analytics** | ✅ Summary, overview, contracts, catalog | ✅ Placeholder page | 🟡 Needs implementation |
| **AI Royalty** | ✅ Simulation | ✅ Placeholder page | 🟡 Needs implementation |
| **Contract Attach** | ✅ Plan + apply flow | ❌ Missing | 🔴 Missing |
| **Contract Intake** | ✅ Extract, resolve, wizard | ❌ Missing | 🔴 Missing |
| **Core Write** | ✅ Propose + apply | ❌ Missing | 🔴 Missing |
| **Release Integration** | ✅ Plan, attach, ingest | ❌ Missing | 🔴 Missing |

### Administrative Features

| Feature Area | Desktop | Cloud | Status |
|---|---|---|---|
| **Admin Panel** | ✅ Stats, audit logs | ✅ Placeholder page | 🟡 Needs implementation |
| **Admin of Works** | ✅ Status quo, contracts, works, documents | ✅ Placeholder pages | 🟡 Needs implementation |
| **Backup/Restore** | ✅ Create, upload, restore, download | ❌ Missing | 🔴 Missing |
| **SCC (System Control)** | ✅ DB switch, org switch, storage, health | ❌ Missing | 🔴 Missing |
| **Billing** | ❌ N/A | ✅ Placeholder page | 🟡 Cloud addition |

### General Features

| Feature Area | Desktop | Cloud | Status |
|---|---|---|---|
| **Documents (General)** | ✅ CRUD, categories, upload | ✅ Placeholder page | 🟡 Needs implementation |
| **Notes (General)** | ✅ Rich text, tags, pinning | ✅ Placeholder page | 🟡 Needs implementation |
| **Playlists** | ✅ CRUD, public/private | ✅ Placeholder page | 🟡 Needs implementation |
| **Events (General)** | ✅ CRUD, calendar | ✅ Placeholder page | 🟡 Needs implementation |
| **Global Search** | ✅ Multi-entity search | ✅ Page exists | 🟡 Need to verify API scope |
| **Theme Toggle** | ❌ Not in desktop (Electron) | ✅ Present in Cloud | ✅ Cloud addition |

---

## 4. Migration Phases

```
Phase 1: Full Architecture Audit ← YOU ARE HERE
Phase 2: Database Parity (restore missing columns, indexes)
Phase 3: API Parity (restore all backend routes)
Phase 4: Frontend Parity (rebuild pages from desktop components)
Phase 5: Service Layer (background jobs, exports, AI pipelines)
Phase 6: Core Domains (Catalog, Contracts, Network)
Phase 7: Operational Modules (Office, Admin, AI, Backup)
Phase 8: Data Import & Integration Testing
```

### Immediate Next Steps (Phase 2)

1. **Prisma schema fixes:**
   - Add `unique` constraint to `artists.name`
   - Add `streaming_link` column to `artists`
   - Add `streaming_link` column to `releases`

2. **Run migration** (`npx prisma migrate dev`)

3. **Type check and build** to verify no regressions
