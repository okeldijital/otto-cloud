# OTTO Cloud — Product Roadmap

## Phase 11 — Platform Stabilization ✅

Production-readiness of the migrated platform.

### Technical Validation ✅
- Authentication — organization_id, role, is_superuser now in JWT
- Authorization — is_active check on login, role field available in session
- Organization isolation — individuals API routes now filter by org, PUT/DELETE verify ownership
- API reliability — consistent error response pattern across all routes
- Error handling — error.tsx, global-error.tsx, not-found.tsx added
- Database performance — Prisma query logging (configurable via LOG_LEVEL)

### Operational Validation
- New organization onboarding — registration creates org (UUID), basic flow works
- User invitations — not yet implemented (Phase 12)
- Account management — settings page, profile editor
- Data creation, editing, deletion — full CRUD verified across all entity types

### Monitoring
- Error logging — centralized logger utility (lib/logger.ts)
- Audit monitoring — audit_logs table + API endpoint exist
- Performance metrics — not yet implemented
- Database health checks — health and test-db endpoints now check DB connectivity

---

## Phase 12 — Subscription System ✅

Restore billing components removed during migration.

### Plans ✅
- Trial, Solo, Professional, Enterprise seeded
- `/api/plans` returns all plans with feature metadata
- Schema extended with feature columns (ai_enabled, reports_enabled, advanced_contracts, max_team_members, max_storage_mb)

### Organization Subscription ✅
- `/api/subscriptions` — GET (current), POST (create/change), PUT (update) with plan details
- Billing page wired to live data with plan selection cards

### Feature Gating ✅
- `lib/features.ts` — `checkFeature()` and `checkUsageLimit()` helpers
- `/api/usage` — track and query usage metrics per org per period

### Remaining
- Stripe checkout session creation + webhook handler
- Automatic trial subscription on org registration
- Feature gating enforcement in API routes/middleware

---

## Phase 13 — File Storage ✅

Production storage for contract documents, office documents, artwork, attachments.

### Storage Abstraction ✅
- `lib/storage.ts` — unified storage service supporting `local` (default) and `s3` (configurable) drivers
- SHA-256 checksums computed on all uploads, stored in DB (contract_documents, documents)
- File validation — MIME type enforcement per domain, size limits
- Sanitized filenames, organized by domain/entityId

### Upload Routes Rewritten ✅
- `POST /api/releases/upload` — uses storage service, 10MB limit, image-only
- `POST /api/contracts?action=upload_document` — uses storage service, 50MB limit, PDF-only, checksums stored
- `POST /api/office/documents?action=upload` — uses storage service, 50MB limit, multi-type support, checksums stored

### Secure File Serving ✅
- `GET /api/files?path=...` — authenticated file serving endpoint with MIME detection
- S3 driver ready (imports `@aws-sdk/client-s3`, configured via env vars: `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL`)

### Remaining
- `@aws-sdk/client-s3` installed as dependency
- File deletion on document/record delete (calls `deleteFile()`)

---

## Phase 14 — Import / Export

Customer data portability.

- Import: CSV, XLSX, JSON
- Export: CSV, XLSX, PDF, Full backup

---

## Phase 15 — Reporting Engine

Restore and improve reporting for artists, releases, royalties, contracts, tasks. Export support.

---

## Phase 16 — Advanced AI

Contract drafting, metadata validation, release quality checks, royalty anomaly detection, catalog consistency checks. Review-first.

---

## Phase 17 — Public API

Authentication, rate limiting, API keys, documentation. Distributor/PRO/accounting integrations.

---

## Phase 18 — Enterprise Features

Multi-org administration, white labeling, advanced permissions, SSO, compliance tooling.

---

## Phase 19 — Mobile Experience

Responsive optimization, mobile dashboard, task management, approvals.

---

## Phase 20 — Product Maturity

Automated backups, disaster recovery, monitoring dashboards, usage analytics, security audits, performance optimization.

---

## Development Process

```
New Feature → Specification → Database Design → API Design → UI Implementation → Testing → Deployment → Documentation
```

## Required Documents

- ROADMAP.md ✓
- ARCHITECTURE.md
- API.md
- DATABASE.md
- CHANGELOG.md
- MIGRATION_HISTORY.md

## Success Criteria

OTTO Cloud is fully operational when:

- Organizations can self-onboard
- Subscriptions work
- Data is secure
- Backups are verified
- AI workflows operate
- Reporting works
- The desktop application is no longer required
