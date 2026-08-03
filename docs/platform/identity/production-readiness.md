# OTTO IAM — Production Readiness Assessment

**Date:** 2026-08-03  
**Scope:** IAM hardening after successful iam-lab validation  
**Branch target:** iam-lab only (no production DB modifications in this work)

---

## Executive Summary

The IAM platform previously validated on the isolated Neon branch **iam-lab**
(migrations, schema, auth, RBAC, sessions, app start). Remaining gaps were
**operational**: manual bootstrap, org-create slowness (apparent hang), failed-login
event validation warnings, incomplete env documentation, and missing production
safety rails.

This hardening work delivers:

- Idempotent **`npm run bootstrap:iam`** (no demo data)
- Batched permission/role seeding (**org create hang root cause fixed**)
- Fixed **`identity.login.failed`** envelope UUID / schema
- **`.env.example`** with required/optional/dev/prod classification
- Bootstrap **safety guards** against production targets
- Deployment + CI/CD documentation
- This readiness assessment

### Final verdict

# PRODUCTION READY WITH MINOR ACTIONS

---

## Bootstrap Architecture

See [bootstrap.md](./bootstrap.md).

Canonical path:

```
prisma migrate deploy → bootstrap:iam → app start → login smoke
```

---

## Root Cause Analysis

See [rca-organization-create-hang.md](./rca-organization-create-hang.md).

**Summary:** sequential N+1 upserts in `seedOrgSystemRoles` over Neon RTT —
fixed via chunked parallel permission upserts + `createMany` for role permissions.

---

## Event Validation Report

See [event-validation-report.md](./event-validation-report.md).

**Summary:** nil UUID failed UUID version validation; replaced with
`PLATFORM_SYSTEM_ORGANIZATION_ID` and relaxed IAM payload fields.

---

## Environment Configuration

See repository root **`.env.example`**.

| Category | Variables |
|----------|-----------|
| Required | `DATABASE_URL`, `DIRECT_URL`, `NEXTAUTH_SECRET` |
| Required (bootstrap) | `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD` |
| Required (production) | `IAM_ENCRYPTION_KEY` |
| Optional secrets | `IAM_ACCESS_TOKEN_SECRET` |
| Lab safety | `NEON_BRANCH=iam-lab` |
| Dev-only flags | `ALLOW_PRODUCTION_BOOTSTRAP`, `ALLOW_DESTRUCTIVE_DB_OPS` |

---

## Production Safety Controls

| Control | Implementation |
|---------|----------------|
| Target classification | `inspectDatabaseTarget()` |
| Production bootstrap block | `assertBootstrapAllowed()` |
| Destructive op block | `assertDestructiveAllowed()` |
| No migrate reset in bootstrap | By design |
| Idempotent seed | Upserts + skipDuplicates + early exit |
| Explicit overrides | `--allow-production`, env flags |

---

## Deployment Workflow

See [deployment-workflow.md](./deployment-workflow.md).

---

## CI/CD Workflow

See [cicd-workflow.md](./cicd-workflow.md).

---

## Assessment matrix

### Verified

| Area | Evidence |
|------|----------|
| Prisma migrations apply | Prior iam-lab validation (25 migrations) |
| Schema integrity | Prior lab + current IAM models present |
| Auth / RBAC / sessions | Prior lab validation |
| App starts | Prior lab validation |
| Idempotent bootstrap design | `scripts/bootstrap-iam.ts` |
| Org role seed performance | Batched seed implementation |
| Login-failed schema path | Envelope UUID + contract fix |
| Env documentation | `.env.example` |
| Safety guards | `lib/platform/identity/bootstrap/safety.ts` |

### Needs Improvement

| Issue | Severity | Impact | Remediation | Blocks prod? |
|-------|----------|--------|-------------|--------------|
| Neon `branch_name` not exposed via `current_setting` — classification relies on env/host markers | Medium | Misclassification if env unset | Always set `NEON_BRANCH` / `OTTO_ENV` in deploy | No |
| In-process rate limit + permission cache | Medium | Multi-instance inconsistency | Redis-backed limits/cache | No (single instance OK) |
| Legacy CI paths (`backend/`, `frontend/`) | Medium | CI does not validate this app tree | Add root Next.js + IAM workflow | No |
| MFA encryption key rotation not automated | Low | Ops burden on key rotation | Ops job + re-enroll | No |
| Full E2E login not automated in CI | Medium | Regressions need manual smoke | Playwright/Cypress smoke job | No |
| Dual IAM/legacy seed still present | Low | Confusion if wrong seed run | Prefer `bootstrap:iam`; deprecate legacy seed docs | No |
| `DIRECT_URL` often unset locally | Low | Migrate friction | Document + bootstrap fallback | No |

### Blockers

| Issue | Severity | Impact | Remediation | Blocks prod? |
|-------|----------|--------|-------------|--------------|
| *(none remaining for IAM core deploy process)* | — | — | — | — |

**Pre-flight still required before production cutover (operational, not code blockers):**

1. Confirm Neon **production** connection strings and set `NEON_BRANCH` / `OTTO_ENV=production`  
2. Set unique production `IAM_ENCRYPTION_KEY` and `NEXTAUTH_SECRET`  
3. Run `migrate deploy` + `bootstrap:iam --allow-production` **once** on empty/recovered IAM tables  
4. Manual smoke: login → dashboard → logout  
5. Confirm backup / PITR on Neon  

---

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Bootstrap against wrong DB | Low (guards) | High | Safety classification + overrides audit |
| Migration drift on recovered DB | Medium | High | `migrate deploy` + history reconciliation |
| Missing `IAM_ENCRYPTION_KEY` in prod | Medium | MFA/crypto weak | `validatePlatformEnv` + deploy checklist |
| Multi-instance session race | Medium | Medium | Sticky sessions or shared store later |
| Operator runs legacy `seed.ts` | Low | Medium | Docs + prefer `bootstrap:iam` |

---

## Recommendations

1. **Use only** `npm run bootstrap:iam` for IAM platform init.  
2. Always set `NEON_BRANCH` and `DIRECT_URL` in every environment.  
3. Gate production bootstrap with environment protection (2 reviewers).  
4. Add CI job: `test:identity` + `test:event-contracts` on every PR.  
5. Add post-deploy smoke (login) before traffic.  
6. Plan Redis for rate limits before horizontal scale.  
7. Deprecate/archive legacy `prisma/seed-iam.ts` messaging for cloud IAM.

---

## Remaining Technical Debt

1. Legacy `permissions` / `roles` / `User` tables coexist with `iam_*`  
2. `setup:cloud` still points at legacy seed path  
3. Platform event security consumers are registry placeholders  
4. Notification framework does not surface IAM security alerts yet  
5. Branch auto-detection from Neon metadata incomplete (null `neon.branch_name`)  
6. GitHub CI still targets pre-monorepo layout  

---

## Observability

| Need | Current | Gap |
|------|---------|-----|
| Auth failures | `iam_security_events` + platform events | Dashboard/alerts |
| Publish failures | Logger `platform.events` | Metrics export |
| Bootstrap runs | Console logs only | Structured ops log / audit row |
| Session anomalies | Session audit tables | Alerting |

---

## Final Verdict

# PRODUCTION READY WITH MINOR ACTIONS

IAM core is deployable with a **repeatable, automated, production-guarded**
bootstrap. Remaining items are operational pre-flight, CI modernization, and
scale-out hardening — not functional blockers for a controlled production
database recovery + IAM bring-up.
