# OTTO Cloud — Production Migration Baseline Ledger

**Status:** Governed baseline record with historical execution limitation
**Date:** 2026-08-18
**Environment:** Neon production (`plain-tree-50826299` / `production`)

## Purpose

This document records the verified relationship between the version-controlled Prisma migration set and the current Neon production database. It is an evidence ledger, not a claim that every historical migration was executed through Prisma's normal migration runner.

## Repository authority

- Prisma migration provider: PostgreSQL.
- `prisma/migrations/migration_lock.toml` is committed to version control.
- The repository's migration directories are the canonical schema-change artifacts for future deployments.
- Production schema changes must use the repository migration history and the project's controlled deployment process.

## Production observations

The production Neon branch was inspected directly during PROD-002.

Observed state:

- Production branch: `production`.
- Branch state: `READY`.
- Database: `neondb`.
- `_prisma_migrations` contained **25 records**.
- Finished migrations: **25**.
- Rolled-back migrations: **0**.
- Incomplete migrations: **0**.
- The inspected records reported `applied_steps_count = 0` and the same recorded timestamp.

## Interpretation

The migration ledger is therefore consistent with a **baselined/resolved production state**, rather than providing evidence of a conventional, individually executed Prisma migration history.

This is an audit limitation, not evidence that the production schema is invalid. The production schema is operational and the repository contains the corresponding migration artifacts. However, historical execution provenance for the 25 records cannot be reconstructed from `_prisma_migrations` alone.

## Governance rule

Do **not** rewrite, delete, reset, or re-execute the existing production migration ledger merely to make its historical appearance conform to a normal Prisma execution history.

For future schema changes:

1. Create a new Prisma migration in the repository.
2. Review the migration before integration.
3. Deploy through the governed branch and Vercel acceptance path.
4. Apply the migration to production using the approved production migration process.
5. Verify `_prisma_migrations` after deployment.
6. Record the resulting migration name, deployment commit, and Vercel deployment in the operational evidence record.

## Acceptance state

**PROD-002: CONDITIONAL PASS.**

The current production schema/migration state is documented and no destructive remediation is authorized solely to repair historical ledger provenance.

The remaining limitation is formally recorded as historical provenance debt and does not block future migration governance when new migrations are tracked normally.
