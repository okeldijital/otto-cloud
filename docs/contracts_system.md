# Contracts System (PDF-first, single module)

- Run `scripts/backup_otto.sh` before applying any contract migrations (backs up DB and contract files).
- Canonical tables: `contracts`, `contract_parties`, `contract_assets`, `contract_documents`, `contract_split_groups`, `contract_splits`.
- Creation is PDF-first: POST `/api/contracts` requires a PDF upload; activation is blocked until at least one document exists.
- Relationships:
  - Parties: system entities (artists/labels/publishers/etc) or external name fallback; duplicate protection in UI.
  - Assets: Work/Track/Release with inclusion/exclusion scope.
  - Split blocks: multiple groups (MASTER/PUBLISHING/MECHANICAL/PERFORMANCE/OTHER) each with splits tied to parties or external names.
- Documents: versioned per contract; newest version treated as primary until backend flag lands. Download/preview via `/api/contracts/{id}/documents/{doc_id}/download|preview`.
- Audit: create/update/delete, link/unlink, upload/download events routed through audit service.
- Org scoping: every query filters by `organization_id`; create/update/delete return 404 when org mismatch.
