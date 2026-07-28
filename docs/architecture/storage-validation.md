# Storage Architecture Validation — Document Platform

| Field | Value |
|-------|--------|
| **Milestone** | 2.1A — Storage Architecture Validation |
| **Version** | 1.0 |
| **Status** | Complete |
| **Date** | 2026-07-28 |
| **Scope** | Architecture review only — no new user functionality |
| **Implementation under review** | Milestone 2.1 Storage Foundation |

**Primary sources reviewed**

- `prisma/schema.prisma` → `DocumentAsset`, `ContractDocumentRelation`
- `lib/documents/**`
- `lib/storage/client.ts`, `lib/storage/utils.ts`, `lib/config/storage.ts`
- `app/api/contracts/[id]/documents/**`
- `docs/product/contract-center/adr-008-document-storage.md`
- `docs/product/contract-center/milestone-2.1-complete.md`
- `docs/architecture/01-data-model.md` (platform data model context)
- `docs/architecture/organization-context-technical-debt.md`

**Missing reference docs (noted N/A where applicable)**

- `docs/product/contract-center/architecture.md` — not present
- `docs/product/contract-center/data-model.md` — not present
- `docs/architecture/storage-architecture.md` — not present (this document is the first formal storage validation artifact)

---

## Executive summary

| Area | Verdict |
|------|---------|
| Document entity purity | **Pass** |
| Relationship extensibility | **Pass** (by design: new relation tables only) |
| StorageProvider abstraction | **Pass** with minor wiring notes |
| Upload lifecycle / transactions | **Pass with residual risk** (documented) |
| Immutability | **Pass** |
| Soft delete | **Pass** |
| Security | **Pass with concerns** (documented) |
| Checksum | **Pass** |
| API surface | **Pass** (Contract-scoped; platform-ready pattern) |
| Performance | **Acceptable for M2.1** |
| R2 provider | **Pass** (lazy init verified; ops gaps noted) |
| Platform reuse readiness | **Architecture ready; integration glue required** |
| Critical defects | **None** |

**Recommendation:** Treat Milestone 2.1 as the **Document Platform Baseline**. Proceed to Milestone 2.2 (Repository UI). Address residual transaction/orphan and generic-link concerns as tracked debt—not as rewrites of fundamentals.

---

## Review 1 — Document entity

### Model: `DocumentAsset` → table `document_assets`

| Field | Type | Nullable | Role |
|-------|------|----------|------|
| `id` | UUID | No | Primary key |
| `organizationId` | UUID | No | Tenant isolation |
| `storageKey` | String | No | Object key in provider |
| `storageProvider` | String | No | Provider id (e.g. `cloudflare-r2`) |
| `storageBucket` | String | No | Bucket name at write time |
| `storageRegion` | String | Yes | Region snapshot |
| `originalFilename` | String | No | Client filename (display) |
| `extension` | String | Yes | Derived extension |
| `mimeType` | String | No | Declared MIME |
| `fileSize` | BigInt | No | Byte length |
| `checksum` | String | No | SHA-256 hex of body |
| `uploadedBy` | Int | Yes | User id |
| `uploadedAt` | DateTime | No | Upload time |
| `deletedAt` | DateTime | Yes | Soft delete marker |
| `createdAt` | DateTime | No | Row create |
| `updatedAt` | DateTime | No | Row touch (soft delete) |

### Indexes

| Index | Columns | Purpose |
|-------|---------|---------|
| `ix_document_assets_organization` | `organizationId` | Org-scoped lists / isolation |
| `ix_document_assets_storage_key` | `storageKey` | Lookup by object key |
| `ix_document_assets_checksum` | `checksum` | Future dedup / integrity queries |
| `ix_document_assets_uploaded_at` | `uploadedAt` | Chronological listing |

### Foreign keys / constraints

- **No FK** to contracts, releases, artists, or other business tables on the document row.
- Prisma reverse relation `contractLinks` is navigation-only from the document side; ownership direction remains **entity → document**.
- Soft delete is nullable `deletedAt` (no hard `is_deleted` flag required).
- `onDelete: Restrict` on relation → document prevents accidental hard delete of documents that still have links.

### Lifecycle

```
create (immutable payload)
  → active (deletedAt = null)
  → soft-deleted (deletedAt set; bytes retained)
  → (future) retention hard-delete of blob + optional row purge
```

There is **no** service path that updates `storageKey`, `checksum`, `fileSize`, or body contents after create.

### Business-field exclusion

| Forbidden field | Present? |
|-----------------|----------|
| `contractId` | **No** |
| `releaseId` | **No** |
| `artistId` | **No** |
| `workId` | **No** |
| AI / OCR / parse fields | **No** |

**Verdict:** Storage concerns only. **Pass.**

---

## Review 2 — Relationship model

### Implemented pattern

```
Contract  (legacy int PK, organization_id Int)
    ↓
ContractDocumentRelation  (contractId, documentId, relationshipType)
    ↓
DocumentAsset  (UUID, org UUID, storage metadata)
```

### Can the same architecture support other modules without changing `document_assets`?

| Module | Without changing `document_assets`? | What is required? |
|--------|-------------------------------------|-------------------|
| **Releases** | **Yes** | Add `release_document_relations` (or equivalent) + service/API entry points |
| **Artists** | **Yes** | Add `artist_document_relations` |
| **Labels** | **Yes** | Add `label_document_relations` |
| **Publishers** | **Yes** | Add `publisher_document_relations` |
| **Organizations** (tenant branding/docs) | **Yes** | Add `organization_document_relations` (use UUID org id) |
| **Royalty Statements** | **Yes** | Add `royalty_statement_document_relations` once statement entity exists |
| **Marketing Assets** | **Yes** | Add `marketing_asset_document_relations` (or workspace-scoped link table) |

**Answer:** Yes. The Document row is reusable as-is. Platform extension is **additive relation tables + thin service methods**, not Document schema redesign. This matches ADR-008.

**Note:** One document can be linked to multiple entities of different types once those tables exist (e.g. same PDF on Contract + Release). That multi-link reuse is a deliberate ADR-008 benefit and is not possible with `entityType`/`entityId` baked into the document row.

**Verdict:** **Pass.**

---

## Review 3 — StorageProvider abstraction

### Target stack

```
DocumentService
      ↓
StorageProvider   (interface)
      ↓
CloudflareR2Provider  →  storageClient (S3 SDK) + storageConfig
```

### Verification

| Check | Result |
|-------|--------|
| R2/S3 SDK isolated to provider + platform storage client | **Yes** — `@aws-sdk/*` in `providers/cloudflare-r2.ts` and `lib/storage/client.ts` only for this path |
| `DocumentService` knows nothing about R2 APIs | **Yes** — depends on `StorageProvider` methods only |
| Repositories know nothing about storage | **Yes** — Prisma only; no storage imports |
| Provider injectable for tests | **Yes** — constructor injection + memory provider in unit tests |

### Coupling notes (non-critical)

| Coupling | Severity | Notes |
|----------|----------|--------|
| Default constructor wires `getCloudflareR2Provider()` | Low | Production default; tests inject alternatives |
| `DocumentService` methods are contract-named (`uploadForContract`, …) | Medium | Platform pattern is correct; **generic** upload/link helpers not yet extracted |
| `DocumentService` queries `prisma.contracts` for ownership | Medium | Business ownership check lives in service (acceptable for M2.1); pure platform layer would take “entity verified” from callers |
| Shared utils (`generateStorageKey`, `sanitizeFilename`) from `lib/storage` | Low | Provider-agnostic; good reuse |

**Verdict:** Abstraction is clean. **Pass.**

---

## Review 4 — Upload lifecycle

### Observed flow

```
Upload request
  → Org auth (requireOrganization)
  → Validation (MIME, extension, size, non-empty)
  → Contract existence + org ownership
  → SHA-256 checksum
  → Metadata (filename, extension, key)
  → StorageProvider.upload (blob first)
  → DocumentAsset create
  → ContractDocumentRelation create
  → Audit (uploaded + linked)
  → Activity (Document Uploaded)
  → Response DTO (no storageKey)
```

### Transaction boundaries

| Step | Atomic with | Failure behavior |
|------|-------------|------------------|
| Validation / contract check | N/A | No side effects |
| Blob upload | Alone | No DB rows |
| Document + relation creates | **Separate** Prisma calls (not a single `$transaction`) | See residual risk |
| Audit / activity | Best-effort after success | Failures logged/swallowed by audit helper patterns; do not roll back document |

### Residual risk — partial creation

1. **Blob succeeds, DB fails**  
   - Orphan object in R2.  
   - Code documents “best-effort; soft-orphans cleaned by retention later.”  
   - **No** incorrect contract link is created.

2. **Document row succeeds, relation fails**  
   - Orphan **document** row with no relation.  
   - Not wrapped in `prisma.$transaction`.  
   - Still no incorrect link; document is org-scoped and soft-deletable later.

3. **DB succeeds, audit/activity fails**  
   - Document remains valid; audit may be incomplete (existing platform audit swallows errors).

### Can failures leave partially created records?

**Yes, in limited forms (orphaned blob and/or unlinked document row).**  
**No** partial “linked to wrong org/contract” path was found given ownership checks before write.

**Severity:** High technical debt for production hardening; **not** a critical design defect that invalidates ADR-008. Recommend transactional document+relation create and optional compensating delete/retention job before high-volume multi-module adoption.

**Verdict:** Lifecycle correct; transaction hardening deferred. **Pass with residual risk.**

---

## Review 5 — Immutability

| Attack / scenario | Result |
|-------------------|--------|
| Overwrite bytes at same `storageKey` via DocumentService | **Not exposed** — keys are UUID-prefixed; service always generates new keys |
| Update checksum / mime / size via API | **No update API** for document metadata content |
| “Replace” document | **New** document record + **new** relation (upload again); old row remains until soft-deleted |
| Soft delete | Sets `deletedAt` / `updatedAt` only — content fields preserved |
| Checksum stability | Content hash computed once at upload and stored; no rewrite path |

**Verdict:** Immutability model holds. **Pass.**

---

## Review 6 — Soft delete

| Concern | Behavior |
|---------|----------|
| Database | `deletedAt` set on `document_assets` |
| Storage blob | **Not** deleted (`StorageProvider.delete` not called) |
| Relationship | **Retained** (history); lists filter `document.deletedAt = null` |
| Audit | `document.deleted` with `softDelete: true` |
| Activity | `Document Removed` |
| Re-delete | `410 DOCUMENT_DELETED` |

**Confirm:** Delete never immediately removes the underlying object. **Pass.**

---

## Review 7 — Security

| Control | Status | Notes |
|---------|--------|-------|
| MIME validation | Pass | PDF-only for contract uploads (constants) |
| Extension validation | Pass | `.pdf` required |
| Max size | Pass | 50 MB |
| Filename sanitization | Pass | `sanitizeFilename` strips unsafe chars |
| Path traversal | Pass | `/` and `\` rejected in filename validation path; keys use sanitized segments + UUID |
| Organization isolation | Pass | Contract scoped by `legacyIntOrgId`; document filtered by `organizationId` UUID |
| Signed URL generation | Present / unused in M2.1 API | Provider implements `signedUrl`; no public download route yet (2.2) |
| Object key generation | Pass | `organizations/{orgId}/documents/{uuid}-{filename}` |
| Client DTO leakage | Pass | `storageKey` / bucket not returned |
| Auth | Pass | `requireOrganization` on all three routes |

### Concerns (non-blocking for 2.2)

1. **MIME trust** — browser-supplied `file.type`; no magic-byte sniffing. Spoofed MIME possible if client lies (extension still constrained to `.pdf`).
2. **No virus scanning** — explicitly out of M2.1 scope.
3. **No fine-grained RBAC** — any org member with session can upload/delete; permission matrix not differentiated (e.g. viewer vs editor).
4. **Full-buffer upload** — entire file in memory; DoS risk if size limit bypassed at reverse-proxy layer.
5. **Audit org UUID** — platform `audit_logs` still INT/`parseInt` (pre-existing platform debt).
6. **Dual document systems** — legacy `contract_documents` + new `document_assets` coexist; confusion risk until cutover.

**Verdict:** Adequate for foundation. **Pass with concerns.**

---

## Review 8 — Checksum

| Check | Result |
|-------|--------|
| Algorithm | SHA-256 via Node `crypto.createHash` |
| Deterministic | Yes (unit-tested) |
| Stored | Hex string on `document_assets.checksum` |
| Duplicate detection readiness | Index on `checksum`; no dedup logic yet (correct for M2.1) |
| Integrity verification | Hash of upload buffer before storage; no post-upload re-fetch verify |
| Confusion with ETag | Avoided — content hash used, not provider ETag |

**Verdict:** **Pass.**

---

## Review 9 — API

Base: `/api/contracts/:id/documents`  
Auth: session + organization context  
Envelope: `{ success, data, message, errors [, code] }`

### POST — upload

| | |
|--|--|
| **Request** | `multipart/form-data`: `file` (required), optional `relationshipType` |
| **Validation** | File presence; MIME; extension; size; contract ownership |
| **Success** | `201` — `document` metadata, `relationshipId`, `relationshipType`, `uploadedAt` |
| **Errors** | `400` validation / file; `401/403` org; `404` contract; `500` persist |

### GET — list

| | |
|--|--|
| **Request** | Path `:id` only |
| **Success** | `200` — `{ items: ContractDocumentDto[], total }` active only |
| **Errors** | `400` bad id; `401/403`; `404` contract |

### DELETE — soft delete

| | |
|--|--|
| **Request** | Path `:id`, `:documentId` |
| **Success** | `200` — soft-deleted document metadata |
| **Errors** | `404` not found / wrong org; `410` already deleted; auth errors |

**Verdict:** Consistent and scoped. **Pass.**

---

## Review 10 — Performance

| Path | Assessment |
|------|------------|
| Upload | O(n) memory for full file buffer; single PutObject; two DB inserts |
| Metadata list | Single query with `include: { document: true }` — **no N+1** |
| Org filter | Additional in-memory filter on `organizationId` (small N; could move into SQL) |
| Download prep | Provider `signedUrl` available; not yet in product path |
| Indexes | Align with org / key / checksum / uploadedAt access patterns |
| Future scaling | Multipart/streaming, async processing, and retention jobs needed before very large files / multi-module volume |

**Verdict:** Acceptable for M2.1. **Pass.**

---

## Review 11 — Cloudflare R2

| Topic | Finding |
|-------|---------|
| Connection management | Singleton `S3Client` behind lazy Proxy |
| Lazy initialization | **Verified** — env not required at import; client created on first use |
| Configuration | Central `lib/config/storage` getters (`R2_*` env) |
| Timeouts | SDK defaults; no app-level timeout override |
| Retry strategy | SDK defaults; no custom retry policy |
| Error handling | Provider throws; service maps to `DocumentServiceError` for DB path |
| Streaming | Not used — full Buffer Put/Get |
| Large files | Soft-capped at 50 MB; no multipart upload |

**Verdict:** Correct isolation and lazy init. Ops hardening is debt. **Pass.**

---

## Review 12 — Platform readiness

| Consumer | Can use immediately? | Required work |
|----------|----------------------|---------------|
| **Releases** | Architecture **yes** / product **no** | Relation table + API/service methods + MIME policy if non-PDF |
| **Rights** | Architecture **yes** / product **no** | Same pattern |
| **Royalties** | Architecture **yes** / product **no** | Statement entity + relation table |
| **Organizations** | Architecture **yes** / product **no** | Relation table using UUID org id |

**Required for “immediate” multi-module use (no Document schema change):**

1. Generic platform APIs, e.g. `createDocument` + `linkDocument(entityType, entityId)` or per-module thin facades.
2. Relation tables per entity family.
3. Per-domain validation policies (MIME/size) beyond contract PDF defaults.
4. Optional: transaction wrapper for document+relation; retention sweeper for orphans.
5. Signed download endpoint (shared) before UI modules need binary access.

**Verdict:** Platform **architecture** ready; **integration packages** not yet built. Acceptable for Contract Center 2.2.

---

## Review 13 — Technical debt

See [`docs/architecture/technical-debt.md`](./technical-debt.md) (storage section).

Completed by 2.1 (do not re-open as gaps):

- Platform document entity without business FKs
- StorageProvider abstraction with R2 implementation
- SHA-256 + soft delete + org-scoped metadata APIs for contracts

New / retained storage-related debt is listed in that file.

---

## Review 14 — Specification compliance

| Spec | Compliance | Notes |
|------|------------|-------|
| **ADR-008** | **Fully Compliant** | Immutable platform assets; relations external; provider-independent storage |
| **architecture.md** (product) | **Not Applicable** | File not present |
| **data-model.md** (product) | **Not Applicable** | File not present |
| **01-data-model.md** (platform) | **Partially Compliant** | Still documents legacy `contract_documents`; does not yet catalog `DocumentAsset` / relations — documentation lag only |
| **milestone-2.1-complete.md** | **Fully Compliant** | Implementation matches completion report |

---

## Critical defect assessment

| Candidate issue | Critical? | Disposition |
|-----------------|-----------|-------------|
| Orphan blob / unlinked document without transaction | No | High debt; retention + `$transaction` recommended |
| Contract-specific service surface | No | Medium debt; extract generic methods when second module adopts |
| MIME spoofing without magic bytes | No | Security concern; 2.2+ hardening |
| Dual legacy + platform document paths | No | Migration debt |

**No critical architectural defect requiring code change before 2.2.**

---

## Final recommendation

1. **Commit Milestone 2.1** as the **Document Platform Baseline**.
2. **Do not** redesign storage fundamentals for 2.2–2.3.
3. **Begin Milestone 2.2 — Repository UI** on this baseline.
4. Track residual items in `technical-debt.md`; promote any of them to a new ADR only if a platform-wide structural need appears.
5. Optionally (non-blocking): document+relation `$transaction` and generic create/link helpers before the **second** module adopts the platform.

---

## Sign-off checklist

- [x] Storage architecture validated  
- [x] Platform reuse confirmed (schema-level)  
- [x] Immutability verified  
- [x] Security reviewed  
- [x] Transaction boundaries documented  
- [x] Storage abstraction clean  
- [x] Specification compliance stated  
- [x] Recommendation for Phase 2.2 issued  
)
