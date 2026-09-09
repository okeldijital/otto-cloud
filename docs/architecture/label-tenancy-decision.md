# Label Tenancy Decision

**Status:** Proposed implementation boundary
**Date:** 2026-09-09

Labels are currently treated as global reference data and their mutation endpoints require platform authority. This creates a product mismatch for the Catalog UI: organization users are presented with Label creation/editing controls but cannot persist changes.

The Catalog domain treats Labels as catalogue entities associated with Artists and Releases. Before changing the database boundary, the existing schema and all Label relationships must be audited and the migration validated on a Neon temporary branch.

## Locked direction

Unless the schema audit identifies a contrary invariant, Labels should become organization-scoped catalogue entities:

- `labels.organization_id` becomes the authoritative ownership/isolation key.
- Label CRUD is authorized by the active organization rather than platform authority.
- Existing Artist → Label and Release → Label foreign-key relationships remain canonical.
- Global reference-data semantics must not be silently retained after the migration.
- Existing Label records require a deterministic organization backfill before the new constraint is enforced.
- No production migration until a Neon temporary branch validates the backfill, foreign keys, indexes, and authorization behavior.

## Acceptance

`Create Label → save → reopen → edit → save → verify persistence`, plus verification that an organization cannot read or mutate another organization's Labels.
