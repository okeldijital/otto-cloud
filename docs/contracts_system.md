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


## Contract storage workspace

The Contracts workspace is intentionally narrow: **upload, organise, retrieve**.

- **All Contracts** shows every stored contract.
- **Unfiled** shows contracts that are not assigned to any folder.
- **Connected to Release** shows contracts with at least one active relationship to a release.
- **Not Connected to Release** shows contracts with no active release relationship.
- **Recently Added** orders contracts by creation time.
- **Recently Updated** orders contracts by last update time.
- Release connection views use the contract relationship layer, not folder membership. A contract can be filed in folders while remaining unconnected to a release, or connected to a release without being filed.
- User-created folders are optional organisational views. A contract may belong to multiple folders.
- Removing or deleting a folder never deletes the contract or its source document.
- "Unfiled" is a retrieval view only. A contract does not need to be placed into a folder to be considered stored.
- Folder membership is separate from contract relationships. Relationship records remain the authoritative connections to artists, labels, publishers, releases, works, tracks and other entities.
- Folders are flat in this first implementation to keep retrieval and organisation deliberately simple; nested folder structures are not required.


## Organization isolation

Contracts are tenant-owned by the IAM organization UUID stored in `contracts.tenant_id`. The legacy integer `organization_id` is retained only for compatibility and is not an authorization boundary.

Contract folders and folder memberships likewise carry `tenant_id` and are filtered by the active IAM organization. Existing imported contracts and folders were backfilled to the M2KR MELT2000 REVISITED organization during the tenant-isolation migration.
