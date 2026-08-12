# A.7 — Production Migration Baseline Audit

**Status:** Steps 1–4 complete; no production database writes performed.

**Audit date:** 2026-08-12

## Scope

This audit establishes why Prisma migration history is absent on the current Neon `production` branch, compares the production database structure with the known `iam-lab` target, verifies the available migration ledger on `iam-lab`, and defines the safe baseline strategy.

Business data was not modified, migrated, deleted, recreated, or provisioned.

## 1. Why migration history is absent

Neon project: `plain-tree-50826299` (`otto`)

Production branch: `br-round-meadow-apqgdtjj` (`production`)

Neon reports:

- production is the primary/default branch;
- `last_reset_at = 2026-07-29T12:10:06Z`;
- production was created from the same parent state used for the later `iam-lab` branch;
- `_prisma_migrations` is absent from production.

The timing and branch history are consistent with the July 29 reset/recovery event removing Prisma's migration ledger while leaving the application schema present. The audit does **not** claim that the exact historical write that removed the ledger has been independently reconstructed from WAL; it establishes the operationally relevant fact that the ledger is absent after the reset.

## 2. Production vs `iam-lab` schema comparison

Read-only catalog inspection produced:

| Metric | production | iam-lab | Difference |
|---|---:|---:|---:|
| public tables | 193 | 194 | +1 |
| public columns | 2,156 | 2,164 | +8 |
| public constraints | 1,543 | 1,549 | +6 |
| public indexes | 768 | 769 | +1 |
| `_prisma_migrations` | absent | present | ledger only |
| migration rows | N/A | 25 | ledger only |

The additional table and associated objects in `iam-lab` are the Prisma migration ledger. The non-ledger application/IAM object counts align exactly.

IAM table inventories and column counts also align between the two branches. Production contains the complete 24-table IAM schema, but no IAM rows.

### Interpretation

The current production database is structurally equivalent to the `iam-lab` database for application/IAM schema purposes, with the important exception that production has no `_prisma_migrations` ledger.

This is the critical finding: **the database does not need to be rebuilt to restore Prisma migration bookkeeping.**

## 3. Migration equivalence evidence

`iam-lab` contains exactly 25 successful migration records and no rolled-back migrations. The ledger contains these migrations:

1. `0001_initial`
2. `20260611214305_add_plan_features`
3. `20260612172322_add_api_keys`
4. `20260612172526_add_api_keys_relation`
5. `20260612173434_add_enterprise_features`
6. `20260619000001_add_release_workspace_models`
7. `20260717133500_add_attachment_model`
8. `20260717140000_repair_workspace_tables`
9. `20260717141000_repair_iam_tenant_tables`
10. `20260728120000_add_platform_document_assets`
11. `20260728140000_document_intelligence`
12. `20260728150000_human_verification`
13. `20260728160000_verified_contract_domain`
14. `20260728170000_contract_relationships`
15. `20260728180000_contract_lifecycle`
16. `20260728190000_platform_events_notifications`
17. `20260728200000_release_contract_read_model`
18. `20260728210000_platform_projection_checkpoints`
19. `20260728220000_rights_domain`
20. `20260728230000_royalty_entitlements`
21. `20260729010000_iam_identity_platform`
22. `20260729120000_iam_a2_password_lifecycle`
23. `20260729140000_iam_a3_session_management`
24. `20260729150000_iam_a4_mfa_totp`
25. `20260729160000_iam_a5_org_rbac`

All 25 records have `applied_steps_count = 1` and `rolled_back = false`.

The migration ledger is therefore available as a **reference ledger** on `iam-lab`. It must not be copied by SQL or manually edited into production.

### Important limitation

A migration ledger is historical metadata; structural equivalence cannot prove the exact historical execution order on production. What can be established safely from the current evidence is that production's current schema already contains the cumulative application/IAM structure represented by the 25-migration target.

## 4. Safe baseline strategy

### Decision

Do **not** run `prisma migrate deploy` against production yet.

Do **not** run `prisma migrate reset` under any circumstances.

Do **not** replay the 25 migrations against production.

The appropriate next operation is a **Prisma baseline/resolve operation** that records the already-present migrations as applied without executing their SQL again.

The intended pattern is:

```text
production schema (already present)
        |
        |  migration ledger missing
        v
prisma migrate resolve --applied <migration-1>
...
prisma migrate resolve --applied <migration-25>
        |
        v
_prisma_migrations restored as authoritative metadata
        |
        v
prisma migrate status
        |
        v
pending migrations = 0
```

This operation must only be executed after the exact migration set on the release being deployed is frozen and reviewed. The command must be run against the **production branch's direct PostgreSQL connection**, not the pooled runtime connection, and must use the repository migration directories as the source of truth.

### Required pre-write checks

Before the baseline write:

1. Confirm `git` release/ref containing exactly the 25 migration directories above.
2. Confirm no migration exists in the release after `20260729160000_iam_a5_org_rbac` that changes the database schema.
3. Confirm production schema fingerprint still matches the audited fingerprint immediately before the write.
4. Take/verify a Neon recovery point before changing migration metadata.
5. Run the baseline operation once; do not improvise SQL against `_prisma_migrations`.
6. Run `prisma migrate status` immediately afterward.
7. Verify that Prisma reports the database up to date.
8. Only after that gate passes may `bootstrap:iam` be considered.

## Production safety constraints

The following remain prohibited:

- `prisma migrate reset`
- `TRUNCATE`
- `DELETE` against application/IAM tables
- `DROP TABLE`
- replaying the 25 migrations
- manually inserting arbitrary rows into `_prisma_migrations`
- manually inserting IAM credentials
- creating a login through SQL
- modifying business records

## Current IAM state

Production currently has the IAM schema but no IAM data. Read-only inspection showed zero rows in the principal identity/authentication tables, including:

- `iam_identities`
- `iam_credentials`
- `iam_password_credentials`
- `iam_organizations`
- `iam_organization_memberships`
- `iam_roles`
- `iam_permissions`
- `iam_role_permissions`
- `iam_sessions`
- `iam_refresh_tokens`
- `iam_mfa_credentials`

The legacy identity tables `users`, `tenant_users`, `tenants`, `organizations`, `roles`, and `permissions` are also empty.

Therefore authentication cannot pass until the supported IAM bootstrap creates the initial administrator and organization.

## A.7 gate result

| Step | Result |
|---|---|
| 1. Establish why migration history is absent | **PASS — ledger absent following July 29 production reset; exact historical deletion event not reconstructed** |
| 2. Compare production schema with target | **PASS — production matches `iam-lab` application/IAM structure; only Prisma ledger objects differ** |
| 3. Verify migration target | **PASS WITH LIMITATION — `iam-lab` has all 25 successful migration records; structural target is present in production** |
| 4. Determine safe baseline | **PASS — baseline/resolve is safer than deploy/replay; execution deliberately deferred pending final pre-write checks** |

## Conclusion

The current production database does **not** need a schema rebuild. The safe path is to restore Prisma's migration bookkeeping using the repository's known migration set, without executing the migrations again, and only then bootstrap IAM through the supported application tooling.

No production database write was performed during this audit.
