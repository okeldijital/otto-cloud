# Milestone 2.1 Complete — Storage Foundation

| Field | Value |
|-------|--------|
| Version | 1.0 |
| Status | Implemented |
| Date | 2026-07-28 |
| ADR | [ADR-008](./adr-008-document-storage.md) |

---

## Architecture

```
DocumentService
      ↓
StorageProvider (interface)
      ↓
CloudflareR2Provider  →  platform storage client / R2 config
```

- **Documents are immutable platform assets** (`document_assets`).
- **Business links** live in relationship tables (`contract_document_relations`).
- Documents **never** store `contractId`, `releaseId`, or AI fields.
- Soft delete sets `deletedAt`; storage blobs are not hard-deleted in this milestone.

### Key modules

| Path | Role |
|------|------|
| `lib/documents/document-service.ts` | Validation, checksum, upload orchestration, audit, activity |
| `lib/documents/storage-provider.ts` | Provider interface |
| `lib/documents/providers/cloudflare-r2.ts` | R2 implementation |
| `lib/documents/document-repository.ts` | Document persistence only |
| `lib/documents/contract-document-repository.ts` | Relationship persistence only |
| `app/api/contracts/[id]/documents/` | Upload + list API |
| `app/api/contracts/[id]/documents/[documentId]/` | Soft-delete API |
| `components/contracts/ContractDocumentsSection.tsx` | Contract detail UI |

---

## Database

### `document_assets`

UUID PK · organization-scoped · storage metadata · SHA-256 checksum · soft delete (`deletedAt`).

Indexes: organization, storageKey, checksum, uploadedAt.

### `contract_document_relations`

UUID PK · `contractId` · `documentId` · `relationshipType` · `createdBy` / `createdAt`.

Unique `(contractId, documentId)`.

Migration: `prisma/migrations/20260728120000_add_platform_document_assets/`.

---

## Storage

- Provider-independent interface: `upload`, `download`, `delete`, `exists`, `metadata`, `signedUrl`.
- R2 uses existing `lib/config/storage` + `lib/storage/client` (no duplicated credentials).
- Object keys: `organizations/{organizationId}/documents/{uuid}-{filename}`.
- Technical metadata only (filename, extension, MIME, size, checksum, provider, bucket, region, timestamps).

---

## API

| Method | Path | Behavior |
|--------|------|----------|
| `POST` | `/api/contracts/:id/documents` | Multipart upload → store + link + audit |
| `GET` | `/api/contracts/:id/documents` | List active linked documents (metadata) |
| `DELETE` | `/api/contracts/:id/documents/:documentId` | Soft delete document |

Envelope:

```json
{ "success": true, "data": { ... }, "message": null, "errors": null }
```

Responses **never** expose `storageKey` or bucket to clients.

---

## Known limitations

1. **R2 credentials required** at runtime for real uploads (`R2_BUCKET_NAME`, `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`).
2. **Migration must be applied** before API use (`prisma migrate deploy` / `prisma db push`).
3. **Legacy `contract_documents`** remains for older completeness/upload paths; new UI uses platform documents.
4. **Audit org column** still INT-coerced platform-wide (see platform audit UUID work item) — audits are recorded but org filter may be imperfect until that lands.
5. **No file download endpoint** in 2.1 (metadata only). Signed download belongs in 2.2.
6. **No PDF viewing** (deferred to 2.3).
7. **Activity `entity_id`** is the contract int id (activities table constraint).

---

## Future phases

| Phase | Focus |
|-------|--------|
| 2.2 | Repository UI polish, signed download, replace-as-new |
| 2.3 | Embedded PDF viewer |
| 3.x | OCR / AI intelligence (separate subsystem; do not mutate Document immutability) |

Other modules (Releases, Rights, Artists, …) should add relationship tables and call `DocumentService` patterns — not invent per-module file storage.

---

## Success criteria checklist

- [x] Documents can be uploaded
- [x] Documents are immutable (no in-place mutation)
- [x] Metadata stored
- [x] SHA-256 checksum generated
- [x] Documents linked to contracts via relationship table
- [x] StorageProvider abstraction
- [x] Cloudflare R2 isolated in provider
- [x] Organization isolation on list/delete/upload
- [x] Audit records (uploaded / linked / deleted)
- [x] Activity records (Document Uploaded / Removed)
- [x] Repositories persistence-only
- [x] No AI / OCR / PDF viewing / parsing
- [x] Unit tests (`npm run test:documents`)
- [ ] Application build verified in CI with env
- [ ] Migration applied to target database
