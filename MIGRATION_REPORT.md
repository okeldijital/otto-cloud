# OTTO Desktop → Cloud Migration Report

## Milestone 1 — Architecture & Parity Audit

---

# 1. DESKTOP MODULE INVENTORY

**Repository:** `/Users/m2krproduction/otto`
**Stack:** FastAPI + SQLAlchemy + Alembic + React/Vite + Electron
**Database:** SQLite (local, per-user)

---

### 1.1 Database Layer (SQLAlchemy — 59 models across 36 files)

| Module | Models | File |
|--------|--------|------|
| Authentication | User | `user.py` |
| Activity Logging | Activity | `activity.py` |
| Artist Management | Artist, ArtistMembership | `artist.py`, `artist_membership.py` |
| Audit | AuditLog | `audit_log.py` |
| Catalog | Release, Track | `release.py`, `track.py` |
| Contracts | Contract, ContractParty, ContractAsset, ContractDocument, ContractSplitGroup, ContractSplit | `contract.py` |
| Contract Intake | ContractIntakeReleaseLink, ContractTrackLink | `contract_intake_links.py`, `contract_track_links.py` |
| Documents | Document | `document.py` |
| Events | Event | `event.py` |
| Governance | StatusQuoItem | `governance.py` |
| Labels | Label | `label.py` |
| Network CRM | Organization, Individual, Platform, NetworkRelationship | `network.py` |
| Notes | Note | `note.py` |
| Office Documents | OfficeDocument, OfficeDocumentLink | `office_document.py` |
| Office Notes | OfficeNote, OfficeNoteLink | `office_note.py` |
| Playlists | Playlist | `playlist.py` |
| PROs | PRO | `pro.py` |
| Publishers | Publisher | `publisher.py` |
| Royalties | Royalty | `royalty.py` |
| Tasks | Task | `task.py` |
| Users | User | `user.py` |
| Works | Work | `work.py` |
| Works Admin | WorksAdmin, WorksAdminDocument | `works_admin.py` |
| AI | AISession, AIMessage, AIAuditLog | `ai.py` |
| AI Contract Resolution | AIContractResolutionRun, AIContractResolutionLink | `ai.py` |
| AI Contract Documents | AIContractDocument, AIContractWorkLink | `contract_documents.py` |
| AI Contract Wizard | AIContractDraft, AIContractAttachRun, AIContractAttachLink | `contract_wizard.py` |
| AI Core Write | AICoreWriteProposalRun, AICoreWriteProposalItem, AICoreWriteApplyEvent | `ai_core_write.py` |
| AI Release Integration | AIReleaseIntegrationRun, AIReleaseIntegrationLink | `release_integration.py` |
| AI Royalty | AIRoyaltySimulationRun | `ai_royalty.py` |
| Backup | AdminBackupArtifact, AdminBackupRestoreEvent, AdminRestoreAudit | `admin_backup.py`, `admin_backup_restore.py` |
| Reporting | ReportDefinition, ReportRun, ReportArtifact | `reporting.py` |

**Database engine:** `SafeUuid` type decorator stores UUID as Integer in SQLite. SQLAlchemy declarative base. Engine created from `DATABASE_URL` env var. SQLite-specific PRAGMAs set on connect (WAL, foreign_keys, busy_timeout).

**Migrations:** 42 Alembic revision files tracking schema evolution from `initial_tables` through `step_4_refinement`, including contract v1 tables, CRM→Network rename, org scoping, AI tables, backup/restore, and artist groups.

---

### 1.2 API Layer (FastAPI — 259 endpoints across 36 files)

| Module | File | Endpoints | Core Operations |
|--------|------|-----------|-----------------|
| Auth | `auth.py` | 5 | login, register, get/update profile, verify token |
| Admin | `admin.py` | 4 | backup schedule CRUD, stats |
| Admin/Works | `admin_of_works.py` | 1 | status quo dashboard |
| Analytics | `analytics.py` | 8 | KPI, revenue trend, catalog growth, top artists/releases, contract status, events, recent activity |
| AI Core | `ai.py` | 3 | health, tools, chat (session-based) |
| AI Analytics | `ai_analytics.py` | 4 | summary, overview, contracts, catalog |
| AI Contracts | `ai_contracts.py` | 6+ | extract, bulk extract, link suggest, resolve, track map, release integration plan |
| AI Core Write | `ai_core_write.py` | 3 | health, propose, apply |
| AI Release Integration | `ai_release_integration.py` | 4 | health, plan, attach, ingest |
| AI Release Mapping | `ai_release_mapping.py` | 1 | map plan |
| AI Release Validation | `ai_release_validation.py` | 2 | health, plan |
| AI Royalty | `ai_royalty.py` | 2 | health, simulate |
| Backup | `backup.py` | 7 | list, create, upload, restore, delete, download, snapshots |
| Catalog | `catalog.py` | 50+ | full CRUD for artists, releases, tracks, works, labels, publishers, PROs |
| Config | `config.py` | 3 | config CRUD, node info, first-run check |
| Contracts | `contracts.py` | 30+ | full CRUD, parties, assets, documents, split groups, splits, completeness, status quo, from-extract |
| Contracts Wizard | `contracts_wizard.py` | 5 | drafts CRUD, attach plan/apply |
| Documents | `documents.py` | 6 | upload, CRUD |
| Events | `events.py` | 5 | CRUD |
| Groups | `groups.py` | 2 | catalog groups (stub) |
| Network | `network.py` | 15 | health, all contacts, orgs CRUD, individuals CRUD, platforms CRUD, relationships CRUD |
| Notes | `notes.py` | 5 | CRUD |
| Office Documents | `office_documents.py` | 9 | CRUD, links, download, preview |
| Office Events | `office_events.py` | 5 | CRUD |
| Office Notes | `office_notes.py` | 7 | CRUD, links |
| Office Reports | `office_reports.py` | 14 | definitions CRUD, runs, artifacts, download, preview, PDF export, share |
| Office Status Quo | `office_status_quo.py` | 3 | list, recompute, resolve |
| Office Tasks | `office_tasks.py` | 5 | CRUD, sync-status-quo |
| Playlists | `playlists.py` | 5 | CRUD |
| Reports/Legacy | `reports.py` | 10 | CSV/Excel/PDF export for artists, releases, works, tasks, events |
| Royalties | `royalties.py` | 5 | CRUD |
| Search | `search.py` | 1 | multi-entity global search |
| System Control Center | `system_control_center.py` | 9 | health, runtime, DB inventory/switch, orgs, storage |
| Tasks | `tasks.py` | 5 | CRUD |
| Users | `users.py` | 5 | CRUD |
| Works Admin | `works_admin.py` | 6 | list, detail, update, documents |

**Auth pattern:** JWT tokens. `get_current_active_user` dependency on most routes. `get_current_admin_user` on admin routes. Organization scoping via `get_current_organization_id`.

---

### 1.3 Pydantic Schemas (42 files)

Every module has corresponding Pydantic schemas for request/response validation: `ArtistBase`, `ArtistCreate`, `ArtistUpdate`, `Artist`; `ContractBase`, `ContractCreate`, `ContractUpdate`, `ContractResponse` (with nested parties, assets, documents, split_groups, completeness); AI-specific schemas (`ContractExtractionV1`, `ContractIntelV2`, `ResolveRequestV1`, `AICoreWriteProposeRequest`, `RoyaltySimulationRequest`, etc.); Office schemas; Network schemas; etc.

Each entity typically has **3 schemas**: Create (required fields), Update (optional fields), Response (includes id/timestamps).

---

### 1.4 Service Layer (38 service files)

| Service Path | Purpose |
|---|---|
| `services/auth.py` | Password hashing (`bcrypt`), JWT creation |
| `services/governance_service.py` | Status quo recompute, resolve, sync-to-task |
| `services/status_quo.py` | Contract, work admin, relationship, release, overall status computation |
| `services/document_service.py` | Document creation |
| `services/office_reports.py` | Report builders (status quo, documents coverage, tasks progress, events timeline), CSV/PDF export |
| `services/admin/scc/runtime.py` | DB inventory, switch, org management, storage usage |
| `services/admin_backup/service.py` | Full backup/restore lifecycle (zip, sha256, manifest, integrity check, rollback) |
| `services/ai/engine.py` | AI engine abstraction (NullEngine for fallback) |
| `services/ai/tools.py` | AI tools (search_catalog, search_network, get_help_tips) |
| `services/ai/registry.py` | Tool registry (get_available_tools, execute_tool, is_tool_allowed) |
| `services/ai/audit.py` | AI request hashing and audit logging |
| `services/ai/analytics/queries.py` | AI analytics queries |
| `services/ai/contract_attach/plan.py` | Build contract attach plans |
| `services/ai/contract_attach/apply.py` | Apply contract attach plans |
| `services/ai/contract_ingest/ingest.py` | Ingest contract PDFs |
| `services/ai/contract_wizard/draft.py` | Create/get contract drafts |
| `services/ai/core_write/propose.py` | Build core write proposals |
| `services/ai/core_write/apply.py` | Apply core write proposals |
| `services/ai/extractors/*` | Contract extractors (v1 deterministic, v2 hybrid, v2 deterministic, v1 LLM, validators) |
| `services/ai/linking/link_suggest_v1.py` | Entity linking suggestions |
| `services/ai/llm/*` | LLM client, prompts, errors |
| `services/ai/matchers/contract_resolver_v1.py` | Entity resolution |
| `services/ai/parsing/*` | PDF text extraction, domain-specific rules |
| `services/ai/release_integration/*` | Release integration planning and attachment |
| `services/ai/release_mapping/map_plan_v1.py` | Release mapping |
| `services/ai/release_validation/plan.py` | Release validation |
| `services/ai/resolution/persist.py` | Resolution persistence |
| `services/ai/royalty/simulate.py` | Royalty simulation |
| `services/ai/track_mapping/` | Track mapping |
| `services/contracts/completeness.py` | Contract completeness computation |
| `services/contracts/create_from_extract.py` | Contract creation from AI extraction |
| `services/contracts/save_parties.py` | Batch party save |
| `services/contract_create/from_draft.py` | Contract creation from draft |

---

### 1.5 Frontend Layer (React + Vite + Electron)

| Layer | Count | Details |
|---|---|---|
| **Routes** | 49 | 3 public (login, register, setup), 43 protected (with MainLayout), 2 catch-all, 1 setup |
| **Pages** | 42 | Dashboard, Catalog hub, all CRUD list+detail for 7 entities (Artists, Releases, Tracks, Works, Labels, Publishers, PROs), Contracts list+detail+bulk, Network (hub, contacts, orgs, individuals, platforms, relationships), Office (hub, documents, events, tasks, notes, reports, status-quo), AI (chat, analytics, royalties), Analytics, Admin, Settings, Playlists, Royalties, Works Admin (list, detail, status-quo) |
| **Components** | 33 | DataTable, EntityForm, Autocomplete, QuickAddModal, AttachmentsSection, StatsCard, Skeleton, ErrorBoundary, ProtectedRoute, FirstRunGuard, ConfirmationProvider, WidthProvider, Layout (MainLayout, Sidebar, TopBar, Logo), Contracts (AddContractWizard, BulkContractCard, CompletenessBadge, CreatePartyModal, EntityTypeahead, ExtractPreviewSections, PartyMultiAssign, TrackMultiSelect), Catalog (GroupMembersManager), SCC (DBSelectorCard, AdvancedSwitchPathAccordion), UI (Badge, Button, Card, ConfirmDialog, HealthBadge, Input, PageHeader, ThemeToggle) |
| **API Clients** | 16 | aiClient, aiAnalyticsClient, aiCoreWriteClient, aiIntakeClient, aiReleaseIntegrationClient, aiReleaseMappingClient, aiReleaseValidationClient, aiRoyaltyClient, aiTrackMappingClient, contractsBulkClient, contractsPartiesClient, contractsWizardClient, contractWizardClient, partyClient, partyLookupClient, tracksClient |
| **Services** | 15 | catalog, contractService, analytics, network, operations, reports, royalties, statusQuoService, worksAdminService, 6 office services |
| **Contexts** | 2 | AuthContext (login/register/logout/refreshUser), ThemeContext (light/dark, system preference) |
| **Hooks** | 1 | useBackendHealth (30s polling, health banner) |
| **Utils** | 3 | formatters (duration MM:SS↔HH:MM:SS), contracts (error formatting), storage (localStorage token/user) |
| **Lib** | 3 | api (axios instance with auth interceptor), queryClient (React Query), tauri (desktop native helpers) |
| **Auth** | JWT token in localStorage; `ProtectedRoute` wrapper; `adminOnly` prop for superuser; AuthProvider context with DEV_MODE bypass |

---

# 2. CLOUD MODULE INVENTORY

**Repository:** `/Users/m2krproduction/otto-cloud`
**Stack:** Next.js 16 App Router + Prisma + Neon PostgreSQL
**Database:** PostgreSQL (via Neon, Prisma ORM)

---

### 2.1 Database Layer (Prisma — 50 models)

| Module | Models |
|--------|--------|
| Core | User |
| Activity | activities |
| Catalog | artists, artist_memberships, tracks, track_releases, releases, works |
| Works Admin | works_admin, works_admin_documents |
| Labels | labels |
| Publishers | publishers |
| PROs | pros |
| Contracts | contracts, contract_parties, contract_assets, contract_documents, contract_split_groups, contract_splits, contract_track_links, contract_intake_release_links |
| Documents | documents |
| Events | events |
| Governance | status_quo_items |
| Network | organizations, individuals, individual_organizations, platforms, network_relationships |
| Notes | notes |
| Office Docs | office_documents, office_document_links |
| Office Notes | office_notes, office_note_links |
| Playlists | playlists |
| Royalties | royalties |
| Tasks | tasks |
| Audit | audit_logs |
| AI | ai_sessions, ai_messages, ai_audit_log, ai_contract_documents, ai_contract_work_links, ai_contract_drafts, ai_contract_attach_runs, ai_contract_attach_links, ai_contract_resolution_runs, ai_contract_resolution_links, ai_core_write_proposal_runs, ai_core_write_proposal_items, ai_core_write_apply_events, ai_release_integration_runs, ai_release_integration_links, ai_royalty_simulation_runs |
| Backup | admin_backup_artifacts, admin_backup_restore_events, admin_restore_audit |
| Reporting | report_definitions, report_runs, report_artifacts |
| Billing | plans, subscriptions, usage |
| Jobs | jobs |
| Migrations | alembic_version |
| Test | playing_with_neon |

---

### 2.2 API Layer (Next.js App Router — 16 route files)

| Endpoint | Methods | Description |
|---|---|---|
| `/api/health` | GET | Returns `{ status: "healthy" }` |
| `/api/test-db` | GET | Returns `{ ok: true, stage: "next-api-runtime-active" }` |
| `/api/users` | GET/PUT | Get/update current user profile |
| `/api/artists` | GET/POST/PUT/DELETE | Full CRUD + search + members |
| `/api/labels` | GET/POST/PUT/DELETE | Full CRUD |
| `/api/publishers` | GET | List only |
| `/api/pros` | GET | List only |
| `/api/works` | GET/POST/PUT/DELETE | Full CRUD |
| `/api/releases` | GET/POST/PUT/DELETE | Full CRUD + track assignment |
| `/api/tracks` | GET/POST/PUT/DELETE | Full CRUD + secondary releases |
| `/api/contracts` | GET/POST/PUT/DELETE | Full CRUD + parties, assets, split groups, splits |
| `/api/search` | GET | Global search across 13 entity types |
| `/api/auth/login` | POST | NextAuth login |
| `/api/auth/register` | POST | Registration |
| `/api/auth/me` | GET/PUT | Profile |
| `/api/auth/[...nextauth]` | * | NextAuth catch-all |

**Auth:** NextAuth with CredentialsProvider (bcrypt), JWT sessions. Routes use `getServerSession(authOptions)`.

---

### 2.3 Frontend (Next.js App Router — 44 pages, 30 components)

**Pages: 20 REAL, 24 PLACEHOLDER**

| Route | Status | Notes |
|---|---|---|
| `/dashboard` | ✅ REAL | StatsCards with live API data |
| `/catalog` | ✅ REAL | Navigation hub with entity counts |
| `/catalog/artists` | ✅ REAL | DataTable with API data |
| `/catalog/artists/[id]` | ✅ REAL | Detail view with API data |
| `/catalog/releases` | ✅ REAL | DataTable with API data |
| `/catalog/releases/[id]` | ✅ REAL | Detail view with API data |
| `/catalog/tracks` | ✅ REAL | DataTable with API data |
| `/catalog/tracks/[id]` | ✅ REAL | Detail view with API data |
| `/catalog/works` | ✅ REAL | DataTable with API data |
| `/catalog/works/[id]` | ✅ REAL | Detail view with API data |
| `/catalog/labels` | ✅ REAL | DataTable with API data |
| `/catalog/labels/[id]` | ✅ REAL | Detail view with API data |
| `/catalog/publishers` | ✅ REAL | DataTable with API data |
| `/catalog/publishers/[id]` | ✅ REAL | Detail view with API data |
| `/catalog/pros` | ✅ REAL | DataTable with API data |
| `/network` | ✅ REAL | Navigation hub |
| `/admin-of-works` | ✅ REAL | Navigation hub |
| `/admin-of-works/contracts` | ✅ REAL | DataTable with API data |
| `/admin-of-works/contracts/[id]` | ✅ REAL | Detail view with API data |
| `/office` | ✅ REAL | Navigation hub |
| `/network/individuals` | ❌ PLACEHOLDER | "Coming Soon" |
| `/network/individuals/[id]` | ❌ PLACEHOLDER | "Coming Soon" |
| `/network/organizations` | ❌ PLACEHOLDER | "Coming Soon" |
| `/network/organizations/[id]` | ❌ PLACEHOLDER | "Coming Soon" |
| `/network/platforms/[id]` | ❌ PLACEHOLDER | "Coming Soon" |
| `/network/contacts` | ❌ PLACEHOLDER | "Coming Soon" |
| `/admin-of-works/works` | ❌ PLACEHOLDER | "Coming Soon" |
| `/admin-of-works/status-quo` | ❌ PLACEHOLDER | "Coming Soon" |
| `/office/documents` | ❌ PLACEHOLDER | "Coming Soon" |
| `/office/events` | ❌ PLACEHOLDER | "Coming Soon" |
| `/office/tasks` | ❌ PLACEHOLDER | "Coming Soon" |
| `/office/notes` | ❌ PLACEHOLDER | "Coming Soon" |
| `/office/reports` | ❌ PLACEHOLDER | "Coming Soon" |
| `/office/status-quo` | ❌ PLACEHOLDER | "Coming Soon" |
| `/ai` | ❌ PLACEHOLDER | "Coming Soon" |
| `/ai/analytics` | ❌ PLACEHOLDER | "Coming Soon" |
| `/ai/royalties` | ❌ PLACEHOLDER | "Coming Soon" |
| `/billing` | ❌ PLACEHOLDER | "Coming Soon" |
| `/settings` | ❌ PLACEHOLDER | "Coming Soon" |
| `/admin` | ❌ PLACEHOLDER | "Coming Soon" |
| `/playlists` | ❌ PLACEHOLDER | "Coming Soon" |
| `/notes` | ❌ PLACEHOLDER | "Coming Soon" |
| `/documents` | ❌ PLACEHOLDER | "Coming Soon" |
| `/contracts/bulk` | ❌ PLACEHOLDER | Minimal stub |

**Components:**

| Category | Components |
|---|---|
| Layout | MainLayout, Sidebar, TopBar, Logo |
| UI | Button, Input, Card, Badge, PageHeader, ToastContainer, ConfirmDialog, ThemeToggle, HealthBadge, Skeleton |
| Shared | ProtectedRoute, DataTable, EntityForm, QuickAddModal, Autocomplete, StatsCard, ErrorBoundary, WidthProvider, FirstRunGuard, AttachmentsSection, ConfirmationProvider |
| Contracts | EntityTypeahead, CompletenessBadge |
| Office | ReportVisualizer |

**Auth:** NextAuth.js with CredentialsProvider. AuthContext provides `useAuth()` to client components. `ProtectedRoute` wrapper on dashboard layout.

---

### 2.4 Services & Utilities

| Layer | Files | Details |
|---|---|---|
| Lib | prisma.ts, auth.ts, api.js, tauri.js, queryClient.js | PrismaClient singleton, NextAuth config, Axios instance, Tauri helpers, React Query client |
| Services | (uses lib/api.js directly from pages) | No dedicated service layer files found |

---

# 3. FEATURE PARITY MATRIX

| Module | Desktop | Cloud | Status | Action |
|--------|---------|-------|--------|--------|
| **Authentication** | COMPLETE | COMPLETE | ✅ | — |
| **Registration** | COMPLETE | COMPLETE | ✅ | — |
| **User Profile** | COMPLETE | PARTIAL | 🟡 | EXTEND (add role, org switch) |
| **Setup Wizard** | COMPLETE | MISSING | 🔴 | CREATE |
| **Organization Switcher** | COMPLETE | MISSING | 🔴 | CREATE |
| **Dashboard** | COMPLETE | PARTIAL | 🟡 | EXTEND (add KPI charts, growth, events, activity) |
| **Catalog - Artists** | COMPLETE | PARTIAL | 🟡 | EXTEND (photo upload, groups mgmt, documents, reports) |
| **Catalog - Releases** | COMPLETE | PARTIAL | 🟡 | EXTEND (tracks, artists, contracts, credits) |
| **Catalog - Tracks** | COMPLETE | PARTIAL | 🟡 | EXTEND (works, releases, royalties, credits) |
| **Catalog - Works** | COMPLETE | PARTIAL | 🟡 | EXTEND (composers, arrangers, admin) |
| **Catalog - Labels** | COMPLETE | PARTIAL | 🟡 | EXTEND (artists, releases) |
| **Catalog - Publishers** | COMPLETE | PARTIAL | 🟡 | EXTEND (artists, works) |
| **Catalog - PROs** | COMPLETE | PARTIAL | 🟡 | EXTEND (detail page, artists, works) |
| **Catalog Groups** | COMPLETE | MISSING | 🔴 | CREATE |
| **Contracts - List** | COMPLETE | PARTIAL | 🟡 | EXTEND (completeness badge, status quo, filter) |
| **Contracts - Detail** | COMPLETE | PARTIAL | 🟡 | EXTEND (tabs, parties, assets, documents, splits) |
| **Contracts - Bulk** | COMPLETE | MISSING | 🔴 | CREATE (only placeholder exists) |
| **Contracts - Wizard** | COMPLETE | MISSING | 🔴 | CREATE |
| **Contracts - From Extract** | COMPLETE | MISSING | 🔴 | CREATE |
| **Contracts - Parties** | COMPLETE | MISSING | 🔴 | CREATE |
| **Contracts - Splits** | COMPLETE | MISSING | 🔴 | CREATE |
| **Network / CRM** | COMPLETE | MISSING | 🔴 | CREATE (all sub-pages are placeholders) |
| **Network - Orgs** | COMPLETE | MISSING | 🔴 | CREATE |
| **Network - Individuals** | COMPLETE | MISSING | 🔴 | CREATE |
| **Network - Platforms** | COMPLETE | MISSING | 🔴 | CREATE |
| **Network - Relationships** | COMPLETE | MISSING | 🔴 | CREATE |
| **Office - Documents** | COMPLETE | MISSING | 🔴 | CREATE |
| **Office - Events** | COMPLETE | MISSING | 🔴 | CREATE |
| **Office - Tasks** | COMPLETE | MISSING | 🔴 | CREATE |
| **Office - Notes** | COMPLETE | MISSING | 🔴 | CREATE |
| **Office - Reports** | COMPLETE | MISSING | 🔴 | CREATE |
| **Office - Status Quo** | COMPLETE | MISSING | 🔴 | CREATE |
| **Royalties** | COMPLETE | MISSING | 🔴 | CREATE |
| **Playlists** | COMPLETE | MISSING | 🔴 | CREATE |
| **Events** | COMPLETE | MISSING | 🔴 | CREATE |
| **Notes** | COMPLETE | MISSING | 🔴 | CREATE |
| **Documents** | COMPLETE | MISSING | 🔴 | CREATE |
| **Tasks** | COMPLETE | MISSING | 🔴 | CREATE |
| **Global Search** | COMPLETE | COMPLETE | ✅ | — |
| **AI - Chat** | COMPLETE | MISSING | 🔴 | CREATE |
| **AI - Analytics** | COMPLETE | MISSING | 🔴 | CREATE |
| **AI - Contracts** | COMPLETE | MISSING | 🔴 | CREATE |
| **AI - Core Write** | COMPLETE | MISSING | 🔴 | CREATE |
| **AI - Release Integration** | COMPLETE | MISSING | 🔴 | CREATE |
| **AI - Release Mapping** | COMPLETE | MISSING | 🔴 | CREATE |
| **AI - Release Validation** | COMPLETE | MISSING | 🔴 | CREATE |
| **AI - Royalty** | COMPLETE | MISSING | 🔴 | CREATE |
| **Analytics** | COMPLETE | MISSING | 🔴 | CREATE |
| **Admin Panel** | COMPLETE | MISSING | 🔴 | CREATE |
| **Backup/Restore** | COMPLETE | MISSING | 🔴 | CREATE |
| **System Control Center** | COMPLETE | MISSING | 🔴 | CREATE |
| **Works Admin** | COMPLETE | MISSING | 🔴 | CREATE |
| **Reports/Export** | COMPLETE | MISSING | 🔴 | CREATE |
| **Billing** | MISSING | MISSING | 🔴 | CREATE (cloud-only, placeholder) |
| **Settings** | COMPLETE | MISSING | 🔴 | CREATE |

---

# 4. DATABASE PARITY MATRIX

**Assessment Scope:** Model-level and column-level comparison between Desktop (SQLAlchemy, authoritative) and Cloud (Prisma).

### Model-Level Parity

| Desktop Model | Prisma Model | Status | Notes |
|---|---|---|---|
| User | User | COMPLETE | Cloud adds role, last_login, avatar_url |
| Activity | activities | COMPLETE | |
| Artist | artists | PARTIAL | Desktop `name` has unique constraint; missing `streaming_link` (String) column |
| ArtistMembership | artist_memberships | COMPLETE | |
| AuditLog | audit_logs | COMPLETE | |
| Contract | contracts | COMPLETE | |
| ContractParty | contract_parties | COMPLETE | |
| ContractAsset | contract_assets | COMPLETE | |
| ContractDocument | contract_documents | COMPLETE | |
| ContractSplitGroup | contract_split_groups | COMPLETE | |
| ContractSplit | contract_splits | COMPLETE | |
| AIContractDocument | ai_contract_documents | COMPLETE | |
| AIContractWorkLink | ai_contract_work_links | COMPLETE | |
| ContractIntakeReleaseLink | contract_intake_release_links | COMPLETE | |
| ContractTrackLink | contract_track_links | COMPLETE | |
| AIContractDraft | ai_contract_drafts | COMPLETE | |
| AIContractAttachRun | ai_contract_attach_runs | COMPLETE | |
| AIContractAttachLink | ai_contract_attach_links | COMPLETE | |
| Document | documents | COMPLETE | |
| Event | events | COMPLETE | |
| StatusQuoItem | status_quo_items | COMPLETE | |
| Label | labels | COMPLETE | |
| Organization | organizations | COMPLETE | Desktop was "Company" originally |
| Individual | individuals | COMPLETE | Desktop was "Contact" originally |
| Platform | platforms | COMPLETE | |
| NetworkRelationship | network_relationships | COMPLETE | |
| Note | notes | COMPLETE | |
| OfficeDocument | office_documents | COMPLETE | |
| OfficeDocumentLink | office_document_links | COMPLETE | |
| OfficeNote | office_notes | COMPLETE | |
| OfficeNoteLink | office_note_links | COMPLETE | |
| Playlist | playlists | COMPLETE | |
| PRO | pros | COMPLETE | |
| Publisher | publishers | COMPLETE | |
| Release | releases | PARTIAL | Missing `streaming_link` (String) column |
| AIReleaseIntegrationRun | ai_release_integration_runs | COMPLETE | |
| AIReleaseIntegrationLink | ai_release_integration_links | COMPLETE | |
| ReportDefinition | report_definitions | COMPLETE | |
| ReportRun | report_runs | COMPLETE | |
| ReportArtifact | report_artifacts | COMPLETE | |
| Royalty | royalties | COMPLETE | |
| Task | tasks | COMPLETE | |
| Track | tracks | COMPLETE | |
| AISession | ai_sessions | COMPLETE | |
| AIMessage | ai_messages | COMPLETE | |
| AIAuditLog | ai_audit_log | COMPLETE | |
| AIContractResolutionRun | ai_contract_resolution_runs | COMPLETE | |
| AIContractResolutionLink | ai_contract_resolution_links | COMPLETE | |
| AICoreWriteProposalRun | ai_core_write_proposal_runs | COMPLETE | |
| AICoreWriteProposalItem | ai_core_write_proposal_items | COMPLETE | |
| AICoreWriteApplyEvent | ai_core_write_apply_events | COMPLETE | |
| AIRoyaltySimulationRun | ai_royalty_simulation_runs | COMPLETE | |
| Work | works | COMPLETE | |
| WorksAdmin | works_admin | COMPLETE | |
| WorksAdminDocument | works_admin_documents | COMPLETE | |
| AdminBackupArtifact | admin_backup_artifacts | COMPLETE | |
| AdminBackupRestoreEvent | admin_backup_restore_events | COMPLETE | |
| AdminRestoreAudit | admin_restore_audit | COMPLETE | |

### Column-Level Gaps

| Model | Field | Desktop | Prisma | Action |
|---|---|---|---|---|
| artists | name | unique=True | not unique | ALTER TABLE ADD UNIQUE |
| artists | streaming_link | String(500) | ❌ missing | ALTER TABLE ADD COLUMN |
| releases | streaming_link | String(500) | ❌ missing | ALTER TABLE ADD COLUMN |

### Cloud-Only Models (no desktop equivalent)

| Model | Purpose |
|---|---|
| plans | Billing subscription plans |
| subscriptions | Org subscription records |
| jobs | Async job tracking |
| usage | AI usage metrics |
| alembic_version | Migration tracking artifact |
| playing_with_neon | Test table |

---

# 5. API PARITY MATRIX

**Desktop:** 259 endpoints across 36 route files
**Cloud:** 16 route files (8 resource + 4 auth + 2 health + 1 search + 1 test-db)

### Endpoint-Level Comparison

| Desktop Endpoints | Cloud Endpoints | Status |
|---|---|---|
| Auth (5): login, register, me, update, verify | ✅ 4: login, register, me, update (via NextAuth) | ✅ COMPLETE (replaced by NextAuth) |
| Catalog Artists (10): CRUD + search + members + releases + works | ✅ 1 catch-all route handles GET/POST/PUT/DELETE with query params for search, members | ✅ COMPLETE |
| Catalog Releases (6): CRUD + tracks | ✅ 1 catch-all route | ✅ COMPLETE |
| Catalog Tracks (6): CRUD + search + by_ids | ✅ 1 catch-all route | ✅ COMPLETE |
| Catalog Works (5): CRUD | ✅ 1 catch-all route | ✅ COMPLETE |
| Catalog Labels (6): CRUD + artists + releases | ✅ 1 catch-all route (no artists/releases sub-endpoints) | 🟡 PARTIAL |
| Catalog Publishers (7): CRUD + artists + works | ❌ GET list only | 🔴 MISSING |
| Catalog PROs (5): CRUD | ❌ GET list only | 🔴 MISSING |
| Contracts (30+): CRUD + parties + assets + docs + splits + tracks + search + completeness + from_extract | ✅ 1 catch-all route handles basic CRUD, parties, assets, split groups via `action` param | 🟡 PARTIAL |
| Contracts Wizard (5): drafts, attach plan/apply | ❌ | 🔴 MISSING |
| Contracts Bulk (1): bulk extract | ❌ | 🔴 MISSING |
| Documents (6): CRUD + upload | ❌ | 🔴 MISSING |
| Events (5): CRUD | ❌ | 🔴 MISSING |
| Notes (5): CRUD | ❌ | 🔴 MISSING |
| Tasks (5): CRUD | ❌ | 🔴 MISSING |
| Playlists (5): CRUD | ❌ | 🔴 MISSING |
| Royalties (5): CRUD | ❌ | 🔴 MISSING |
| Network (15): orgs, individuals, platforms, relationships full CRUD | ❌ | 🔴 MISSING |
| Office Documents (9): CRUD + links + download + preview | ❌ | 🔴 MISSING |
| Office Events (5): CRUD | ❌ | 🔴 MISSING |
| Office Notes (7): CRUD + links | ❌ | 🔴 MISSING |
| Office Tasks (5): CRUD + sync-status-quo | ❌ | 🔴 MISSING |
| Office Reports (14): definitions CRUD, runs, artifacts, export PDF, share | ❌ | 🔴 MISSING |
| Office Status Quo (3): list, recompute, resolve | ❌ | 🔴 MISSING |
| Works Admin (6): list, detail, update, documents | ❌ | 🔴 MISSING |
| Users (5): CRUD | ✅ 1 route handles current user only (no admin list) | 🟡 PARTIAL |
| Admin (4): backup schedule, stats, audit-logs | ❌ | 🔴 MISSING |
| Backup (7): list, create, upload, restore, delete, download, snapshots | ❌ | 🔴 MISSING |
| System Control Center (9): health, runtime, DB switch, orgs, storage | ❌ | 🔴 MISSING |
| AI (3): health, tools, chat | ❌ | 🔴 MISSING |
| AI Analytics (4): summary, overview, contracts, catalog | ❌ | 🔴 MISSING |
| AI Contracts (6+): extract, bulk extract, link suggest, resolve | ❌ | 🔴 MISSING |
| AI Core Write (3): propose, apply | ❌ | 🔴 MISSING |
| AI Release Integration (4): plan, attach, ingest | ❌ | 🔴 MISSING |
| AI Release Mapping (1): map plan | ❌ | 🔴 MISSING |
| AI Release Validation (2): health, plan | ❌ | 🔴 MISSING |
| AI Royalty (2): simulate | ❌ | 🔴 MISSING |
| Analytics (8): KPI, revenue-trend, catalog-growth, etc. | ❌ | 🔴 MISSING |
| Reports/Export (10): CSV/Excel/PDF for entities | ❌ | 🔴 MISSING |
| Config (3): config, node info, first-run | ❌ | 🔴 MISSING |
| Global Search (1) | ✅ 1 route, 13 entity types | ✅ COMPLETE |
| Health (1) | ✅ | ✅ COMPLETE |

---

# 6. MINIMUM RESTORATION PATH

The smallest set of work required before production data can be imported from Desktop.

### Prerequisites for Data Import

Production data import requires:

1. **Database schema parity** — All Desktop columns must exist in Prisma (3 gaps identified)
2. **API endpoints for all core entities** — Every entity type needs at least CRUD so imported data is accessible
3. **Frontend pages for viewing imported data** — Users need to see what was imported

### Minimum Viable Restoration (MVP)

**Phase A — Database (1 session, ~1 hour)**
- Fix 3 Prisma column gaps (artists.name unique, artists.streaming_link, releases.streaming_link)
- Run `npx prisma migrate dev` for new migration
- ✅ Data can be stored in matching schema

**Phase B — Core API Restoration (2 sessions, ~4 hours)**
- Publishers: add POST/PUT/DELETE to existing route
- PROs: add POST/PUT/DELETE to existing route
- Labels: add artists/releases sub-endpoints to existing route
- Users: add admin list (GET all users)
- 🔧 **Data can now be imported for 8 catalog entities** (artists, releases, tracks, works, labels, publishers, PROs, users)

**Phase C — Contracts API (3 sessions, ~8 hours)**
- Contracts wizard (drafts, attach plan/apply)
- Contracts from extract
- Contracts bulk
- Parties management endpoints
- Split groups/splits
- Contract completeness
- Contract documents upload
- 🔧 **Contracts data can be imported**

**Phase D — Network API (2 sessions, ~4 hours)**
- Organizations CRUD
- Individuals CRUD
- Platforms CRUD
- Network relationships CRUD
- 🔧 **Network data can be imported**

**Phase E — Frontend Display (3 sessions, ~6 hours)**
- Replace 24 placeholder pages with real implementations
- Rebuild from Desktop components (DataTable pattern already established)
- 🔧 **Imported data is visible to users**

**Total minimum:** ~11 sessions, ~23 hours

### Data Import Order

```
1. Organizations (standalone, no dependencies)
2. Users (depends on orgs)
3. Labels, Publishers, PROs, Platforms (standalone)
4. Artists (depends on labels, publishers, PROs)
5. Works (depends on publishers, PROs)
6. Releases (depends on labels, artists, organizations as distributors)
7. Tracks (depends on releases, works)
8. Contracts (depends on artists, labels, organizations, individuals)
9. Contract Parties/Assets/Documents/Splits (depends on contracts)
10. Royalties (depends on artists, tracks, works)
11. Network Relationships (depends on orgs, individuals)
12. Office documents/events/tasks/notes (depends on all entities)
13. AI data (depends on contracts, releases)
14. Activities, Audit logs (depends on everything above)
```

---

# 7. RECOMMENDED IMPLEMENTATION ORDER

### Priority Tiers

**TIER 1 — Core Foundation (blocking everything else)**
```
1. Fix Prisma column gaps → migrate
2. Restore Publishers API endpoints (POST/PUT/DELETE)
3. Restore PROs API endpoints (POST/PUT/DELETE)
4. Restore Labels sub-endpoints (artists, releases list)
```

**TIER 2 — Entity Attributes**
```
5. Add GroupMembersManager to Artists (missing from cloud)
6. Add streaming_links display and social_media to Artist detail
7. Add composer/arranger display to Work detail
8. Add credit management to Releases, Tracks
```

**TIER 3 — Contracts Deep APIs**
```
9. Contract wizard (drafts + attach plan/apply)
10. Contract from extract
11. Contract bulk processing
12. Party management endpoints (save, batch set, search)
13. Split groups and splits management
14. Contract document upload, versioning
15. Contract completeness computation
```

**TIER 4 — Network/CRM**
```
16. Organizations full CRUD API
17. Organizations frontend pages
18. Individuals full CRUD API
19. Individuals frontend pages
20. Platforms full CRUD API
21. Platforms frontend pages
22. Relationships API and frontend
```

**TIER 5 — Cross-Cutting Office Suite**
```
23. Events API + frontend (calendar, recurrence)
24. Tasks API + frontend (Kanban, status-quo sync)
25. Notes API + frontend (rich text, tags, pinning)
26. Office Documents API + frontend
27. Office Status Quo API + frontend
28. Office Reports API + frontend
```

**TIER 6 — Remaining APIs**
```
29. Royalties API + frontend
30. Playlists API + frontend
31. Documents (general) API + frontend
32. Notes (general) API + frontend
33. Events (general) API + frontend
34. Tasks (general) API + frontend
35. Works Admin API + frontend
36. Analytics dashboard (recharts, KPI)
```

**TIER 7 — Advanced & System**
```
37. AI Chat, Analytics, Contracts, Core Write, Release Integration, Royalty
38. Admin panel (users CRUD, stats, audit logs)
39. System Control Center (DB switch, org switch, storage)
40. Backup/Restore system
41. Billing (cloud-native, design TBD)
42. Settings page
43. Setup Wizard (first-run)
```

---

## Summary Statistics

| Metric | Desktop | Cloud | Parity |
|--------|---------|-------|--------|
| SQLAlchemy/Prisma Models | 59 | 50 (56 total) | ~95% model-level |
| API Endpoints | 259 | 16 route files | ~6% |
| Frontend Pages | 42 | 44 (20 real, 24 placeholder) | ~45% real |
| Components | 33 | 30 | ~90% component parity |
| Service Files | 38 | ~0 (inline in routes) | 0% (inline acceptable) |
| Pydantic/Zod Schemas | 42 files | None | 0% |
| Auth | JWT | NextAuth JWT | ✅ |
| DB Engine | SQLite | PostgreSQL (Neon) | N/A |
| Frontend Framework | React/Vite | Next.js 16 App Router | N/A |
| Backend Framework | FastAPI | Next.js API routes | N/A |
