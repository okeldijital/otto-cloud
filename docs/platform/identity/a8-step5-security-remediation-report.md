# A.8 Step 5 — Security Regression Remediation Report

**Mode:** Implementation (repository only)  
**Date:** 2026-08-12  
**Repository:** otto-cloud (okeldijital/otto-cloud local)  
**Branch:** `main`  
**Commit baseline:** `3cbcf03fcf18ec4e7ff6b54d8b471a2190ec8992`  
**Working tree:** Dirty — Groups A+B+Step 5 uncommitted (no commit created)

**Production systems:** not modified  
**Commits / deploys / Neon / Vercel:** none

---

## A. Baseline

| Item | Value |
|------|--------|
| HEAD | `3cbcf03fcf18ec4e7ff6b54d8b471a2190ec8992` |
| Message | `feat(iam): deliver password-reset emails via Resend with log fallback` |
| Working tree | **Dirty** — A.8 Groups A/B + Step 5 remediations uncommitted |
| Prior Step 4 verdict | PASS WITH CONDITIONS |
| Groups A/B preserved | **Yes** (not discarded) |

---

## B. Findings remediated

| Finding | Severity | Fix | Tests |
|---------|----------|-----|-------|
| **R4-TS-001** | High (ops) | Typed `assertLegacyUserInActorOrg` return; removed invalid `tenantId` on `CurrentIdentityContext`; `recordAudit` always receives concrete `auditUserId` from org context | `tsc --noEmit` PASS; privilege + identity suites |
| **R4-LINT-001** | Medium | Next 16 removed `next lint` — added `eslint.config.mjs` (flat `eslint-config-next/core-web-vitals`); `npm run lint` targets auth/API security surface with `--max-warnings 0`; `lint:full` available for broader tree | `npm run lint` PASS |
| **A8-001** | Critical | `/api/test-db` returns only `{ ok, connected, timestamp }` — **no** `user_count` / topology | step5 + http tests; source contract |
| **A8-002** | Critical | `/api/platform/health/identity` requires session + **platform authority**; no identity/session/org counts | http matrix: anon 401, member/admin/owner 403, platform 200 |
| **R4-SEED-001** (code path) | Critical* | `isPlatformAuthority()` **no longer** elevates on bare `platform.admin` permission (stale owner template). Platform = `isSuperAdmin` / `super_admin` / `platform_admin` roles only | privilege + step5 tests |
| **R4-SEED-001** (ops design) | Critical* | Dry-run script `scripts/reconcile-iam-owner-platform-admin.ts` (apply **refused** in Step 5) | step5 source contract; **not executed against prod** |
| **R4-002** | High | `/api/export` uses UUID org id for catalog entities; `requireLegacyIntOrgId` for INT-scoped entities; **no** `parseInt(uuid)\|\|1` | step5 + http export isolation |
| **R4-003** | High | AI (`analytics`, `core-write`, `release-integration`, `royalty`) + network (`health`, `organizations`) use `requireLegacyIntOrgId` / `requireActorUserId`; catch maps auth errors | step5 source + unit helpers |
| **R4-004** | High | `/api/storage/upload`, `/api/storage/[id]`, `/api/releases/upload` use `requireOrgAuth` + entity ownership (`requireUploadEntityInOrg` / `requireReleaseInOrg`); no `\|\| 1` user id | step5 + http upload binding |
| **R4-001** | High | labels / publishers / pros classified **GLOBAL REFERENCE DATA**; mutations require `platformAuthorityFromSession`; reads remain authenticated | step5 + http catalog mutation matrix |

\*Critical under multi-org threat model. Code path is seed-drift-safe; DB surplus rows still need a future authorized reconciliation (not executed here).

### Key implementation notes

#### Platform authority (seed-drift safe)

```
Platform authority =
  isSuperAdmin (legacy is_superuser) OR
  role super_admin OR
  role platform_admin

NOT =
  permissions.includes("platform.admin")   // was org-owner seed pollution
```

Organization owner remains organization authority only, even if production IAM still has `owner → platform.admin` rows.

#### Organization integer scope

Canonical helpers:

- `requireLegacyIntOrgId(ctx)` — fail closed if `legacyIntOrgId <= 0` / NaN  
- `requirePositiveIntId(raw)` — reject missing / non-digit / ≤0 / UUID strings  
- `requireActorUserId(ctx)` — never invent user id `1`  
- `requireUploadEntityInOrg(type, id, ctx)` — org-scoped entity bind before attach

#### Global catalogs

| Entity | Classification | Mutations |
|--------|----------------|-----------|
| labels | GLOBAL REFERENCE DATA | platform authority |
| publishers | GLOBAL REFERENCE DATA | platform authority |
| pros | GLOBAL REFERENCE DATA | platform authority |

Schema ownership columns **not** added (no migration). Documented as intentional deferred model work if product later requires org-owned catalogs.

---

## C. Findings intentionally unresolved

| Finding | Reason | Risk | Required future action |
|---------|--------|------|------------------------|
| **R4-SEED-001 production DB rows** | Reconciliation is an IAM write — forbidden in Step 5 | Existing DBs may still store `owner → platform.admin` links; **code no longer elevates** on that permission alone | Separate authorized ops step: run dry-run then apply IAM-only delete of surplus `iam_role_permissions` |
| **Full-repo lint debt** | Pre-existing UI/hook issues outside A.8 security surface (`WidthProvider.jsx`, img a11y, etc.) | Process noise; not auth bypass | Track `npm run lint:full` cleanup outside A.8 |
| **Legacy dual-stack IAM** (`/api/iam/roles`, teams, some org members) | Group B hardened primary paths; residual dual-stack not full rewrite | Medium — weaker isolation on unused/legacy admin UIs | Group C / deprecation plan |
| **`/api/organizations/members` under-permissioned residual** | Not fully rewritten in Step 5 (R4-024 class) | Medium if route still used in UI | Require `users.manage` consistently in later step |
| **HTTP live multi-org against running server** | Tests cover handler contracts + helper matrix + route imports; no live multi-tenant DB fixture | Lower residual vs pure unit | Optional integration suite with local fixtures (no production DB) |
| **INT org tables without legacyInt mapping** | Fail-closed when `legacyIntOrgId` unavailable | Some AI/network features 403 until mapping exists | Ensure production org has valid legacy int mapping or migrate AI tables to UUID org |

---

## D. IAM reconciliation

| Item | Status |
|------|--------|
| Production IAM modified | **NO** |
| IAM reconciliation executed | **NO** |
| Dry-run / design completed | **YES** — `scripts/reconcile-iam-owner-platform-admin.ts` |
| Apply mode | **Refused** in this deliverable (`--apply` exits 2) |
| Business tables in plan | **0** |
| Target state | `owner → platform.admin = NO` |

Dry-run design reports:

```
Current: owner → platform.admin = YES/NO   (from DB when run)
Target:  owner → platform.admin = NO
Other affected IAM records: N
Business tables affected: 0
```

Idempotent future plan (ops only):

1. SELECT surplus `iam_role_permissions` for `platform.admin` on org system roles  
2. DELETE those rows only  
3. Optionally re-run `seedOrgSystemRoles` (additive; catalog v6 does not re-add platform.admin to owner)  
4. Re-verify counts  

---

## E. Production safety

| Check | Result |
|-------|--------|
| Neon production writes | **NONE** |
| Business data writes | **NONE** |
| IAM production writes | **NONE** |
| Schema migrations | **NONE** |
| Prisma migrate / deploy / reset / resolve | **NONE** |
| Vercel changes | **NONE** |
| Production deployment | **NONE** |
| Secrets exposed | **NO** |
| Password resets | **NONE** |
| Bootstrap IAM | **NONE** |

---

## F. Validation

| Command | Result |
|---------|--------|
| `npm run lint` | **PASS** (exit 0) — security surface: `app/api`, `lib/auth`, `lib/permissions.ts`, `lib/platform/identity` |
| `npx tsc --noEmit` / `npm run typecheck` | **PASS** (exit 0) |
| `npm run build` | **PASS** (exit 0) — production Next build completed |
| `npm run test:a8-idor` | **13 passed, 0 failed** |
| `npm run test:a8-privilege` | **27 passed, 0 failed** |
| `npm run test:a8-step5` | **27 passed, 0 failed** |
| `npm run test:a8-http` | **27 passed, 0 failed** |
| `npm run test:identity` | **PASS** (A.1–A.6) |

### Regression audit (repository-wide, code)

| Pattern | Status after Step 5 |
|---------|---------------------|
| `parseInt(...)\|\|1` in `app/api` | **Cleared** (only comment remaining on export) |
| `Number(...)\|\|1` org fallback | Not found on org-scope routes remediated |
| Client org trust on storage upload | Server uses `requireOrgAuth` organizationId only |
| Bare `platform.admin` elevates platform | **Removed** from `isPlatformAuthority` |
| Public diagnostic counts | **Removed** |
| `/api/files` Group A path block | **Intact** |

---

## G. Final classification

# **PASS WITH CONDITIONS**

### Why not PASS

1. **Production IAM rows** may still contain `owner → platform.admin` until a separate authorized reconciliation (code is safe; DB cleanup is not done).  
2. **A.8 work remains uncommitted** — deployable baseline requires commit + review.  
3. Residual dual-stack / legacy org-member routes and full-tree lint debt are process/secondary risks, not critical deploy blockers for a single-org empty-catalog production profile, but multi-tenant production should complete reconciliation first.

### Why not BLOCKED

1. Step 4 **critical/high code blockers** for diagnostics, TypeScript, isolation collapse (`\|\|1`), upload binding, global catalog mutations, and seed-drift **code elevation** are remediated and tested.  
2. Build/typecheck/lint (security surface) + A.8 test suites green.  
3. No production mutations performed.

### Conditions before production deploy (next phase — not this step)

1. Human review of this report + uncommitted A.8 tree.  
2. Commit A.8 Groups A/B + Step 5 (separate explicit step).  
3. Optional but recommended for multi-org trust: authorized IAM dry-run then apply surplus `platform.admin` removal.  
4. Deploy code (Vercel) only after commit approval — **not** performed here.  
5. Post-deploy smoke: diagnostics 401/403 for non-platform; export/storage isolation; login.

---

## Files touched (high signal)

| Area | Paths |
|------|--------|
| Auth core | `lib/auth/privilege-authorization.ts`, `lib/auth/resource-authorization.ts`, `lib/permissions.ts`, `lib/iam.ts` |
| Diagnostics | `app/api/test-db/route.ts`, `app/api/platform/health/identity/route.ts` |
| Isolation | `app/api/export`, `app/api/ai/*`, `app/api/network/*` |
| Storage | `app/api/storage/upload`, `app/api/storage/[id]`, `app/api/releases/upload` |
| Global catalog | `app/api/labels`, `publishers`, `pros` |
| Tooling | `package.json`, `eslint.config.mjs` |
| Ops (no exec) | `scripts/reconcile-iam-owner-platform-admin.ts` |
| Tests | `lib/auth/__tests__/step5-security-remediation.test.ts`, `http-authorization-boundary.test.ts`, updated privilege tests |

---

## Safety attestation

This Step 5 work performed:

- local source edits and tests  
- local lint / typecheck / production build  
- **no** production DB / IAM / business writes  
- **no** migrations  
- **no** Vercel / Neon changes  
- **no** commit / PR / deploy  
- dry-run reconciliation design only  

**Stop.** Ready for final review before commit / production reconciliation phase.
