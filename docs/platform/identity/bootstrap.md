# IAM Bootstrap Architecture

## Purpose

`scripts/bootstrap-iam.ts` initializes a **clean** IAM platform for deployment.
It is the only supported path for first-time IAM setup on a migrated database.

Goals: **automated, deterministic, idempotent, safe to re-run, production-safe**.

## Dependency diagram

```
                    ┌─────────────────────────┐
                    │  Prisma migrate deploy  │
                    │  (schema only)          │
                    └───────────┬─────────────┘
                                │
                    ┌───────────▼─────────────┐
                    │  bootstrap-iam.ts       │
                    │  (this module)          │
                    └───────────┬─────────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         │                      │                      │
         ▼                      ▼                      ▼
┌─────────────────┐  ┌──────────────────┐  ┌────────────────────┐
│ Permission      │  │ Admin identity   │  │ Default org        │
│ catalog         │  │ + password       │  │ (iam_organizations)│
│ (iam_permissions│  │ credential       │  └─────────┬──────────┘
│  global)        │  │ (iam_identities, │            │
└─────────────────┘  │  iam_password_*) │            │
                     └────────┬─────────┘            │
                              │                      ▼
                              │           ┌────────────────────┐
                              │           │ System roles       │
                              │           │ (owner, admin, …)  │
                              │           │ + role_permissions │
                              │           └─────────┬──────────┘
                              │                     │
                              └──────────┬──────────┘
                                         ▼
                              ┌────────────────────┐
                              │ Membership         │
                              │ identity ↔ org     │
                              │ role=owner         │
                              └────────────────────┘
```

### Order of operations (must not reverse)

1. **Permissions** — global catalog (`seedIamPermissions`)
2. **Administrator identity** — email + Argon2id password credential
3. **Organization** — default tenant row + owner pointer
4. **System roles** — per-org templates (`seedOrgSystemRoles`)
5. **Membership** — admin as `owner` + default org

## What bootstrap creates

| Entity | Table(s) | Notes |
|--------|----------|--------|
| Permission catalog | `iam_permissions` | From `PERMISSION_CATALOG` |
| Admin identity | `iam_identities` | `status=active`, email verified |
| Password credential | `iam_password_credentials`, `iam_credentials` | Argon2id only |
| Default organization | `iam_organizations` | No demo content |
| System roles | `iam_roles`, `iam_role_permissions` | owner → viewer templates |
| Owner membership | `iam_organization_memberships` | `isOwner`, `isDefault` |

## What bootstrap never creates

- Demo artists, releases, contracts, royalties
- Sample documents or attachments
- Legacy `users` / `tenants` rows (separate from IAM)
- Fake invitations or MFA enrollments

## Idempotency

| State | Behavior |
|-------|----------|
| Already fully initialized | Exit 0 immediately (unless `--force`) |
| Partial (e.g. perms only) | Completes missing steps |
| Re-run after success | No duplicates |
| `--reset-admin-password` | Rotates password only with destructive allow flag |

Detection of “initialized”:

- `iam_permissions.count > 0`
- `iam_organizations.count > 0`
- admin identity exists for `INITIAL_ADMIN_EMAIL`
- at least one membership

## Safety guards

| Guard | Behavior |
|-------|----------|
| Target inspection | Parses `DATABASE_URL` host; classifies production / lab / local / unknown |
| Production block | Requires `ALLOW_PRODUCTION_BOOTSTRAP=true` or `--allow-production` |
| Destructive block | Password reset / overwrite requires `ALLOW_DESTRUCTIVE_DB_OPS` |
| Lab preference | Set `NEON_BRANCH=iam-lab` during hardening |
| No migrate reset | Bootstrap never calls `prisma migrate reset` |

Implementation: `lib/platform/identity/bootstrap/safety.ts`.

## Manual steps eliminated

Previously (lab validation):

1. Run `prisma/seed-iam.ts` (legacy permissions — **different** tables)
2. Manually create identity / password via ad-hoc SQL or scripts
3. Call `organizationService.createOrganization()` (hung — see RCA)
4. Manually assign roles / memberships
5. Manually set admin password with `reset-iam-password`

Now:

```bash
npx prisma migrate deploy
npm run bootstrap:iam
npm run dev
# login at /auth/login
```

## Relationship to legacy seed

| Script | Purpose | Use for IAM v1? |
|--------|---------|-----------------|
| `prisma/seed-iam.ts` | Legacy `permissions` / `roles` tables | No (legacy RBAC) |
| `prisma/seed.ts` | Legacy tenant + User + org | No for pure IAM |
| `scripts/bootstrap-iam.ts` | **Canonical IAM platform bootstrap** | **Yes** |

## CLI reference

```bash
npm run bootstrap:iam

# Options
npx tsx scripts/bootstrap-iam.ts --dry-run
npx tsx scripts/bootstrap-iam.ts --force
npx tsx scripts/bootstrap-iam.ts --reset-admin-password --allow-destructive
npx tsx scripts/bootstrap-iam.ts --allow-production   # production only, intentional
```
