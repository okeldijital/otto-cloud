# Label Tenancy Audit

**Status:** Audit required before migration
**Date:** 2026-09-09

## Current boundary

The active architecture classifies `labels` as global reference data. The Label mutation route therefore requires platform authority. The production UI exposes Label creation to catalogue users, producing the observed `Platform authority required` failure.

## Required audit

Before converting Labels to organization-owned catalogue data, inspect:

1. `labels` table columns, primary key, indexes, and existing rows.
2. Every FK/reference to `labels` (Artists, Releases, and any other catalogue tables).
3. Label IDs and names for duplicates/collisions.
4. Existing catalogue ownership signals that can deterministically assign each Label to an organization.
5. All Label API routes and authorization checks.
6. UI list/detail/create/edit behavior.
7. Prisma schema and migration history.

## Gate

No production schema change or authorization relaxation is approved until ownership backfill is deterministic and verified on a Neon temporary branch.
