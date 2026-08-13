# R1–R3 STEP 3 — SECURITY REGRESSION & PRODUCTION-READINESS REVIEW

**Mode:** Strictly read-only. No source code, tests, package files, Prisma schema, migrations, documentation (other than this report), environment files, Neon, Vercel, Git history, or production data were modified. No commits, pushes, deploys, merges, seeds, IAM reconciliation, or production writes were performed.

**Basis:** The R1–R3 Step 2 remediation (uncommitted working-tree changes on top of the A.9 production baseline) reviewed against the R1–R3 Step 1 audit and Step 2 remediation report.

---

## 1. Executive Verdict

> **`PASS — COMMIT READY`**

The R1–R3 Step 2 remediation is **safe and complete enough to proceed to the commit gate**. All four Step 1 read-path findings (R1 royalties by-id + validate-splits, R2 office activities, R3 office audit-logs) and all three indirect bypass surfaces (`lib/reports.ts` royalties_summary/activity_log, `/api/office/reports/runs/[runId]/data` + `/api/reports/[runId]/data` re-runs, `lib/ai-audit.ts` royalty anomalies via `/api/ai/audit`) are closed in source. The new 32-case HTTP boundary suite asserts the authorization contracts, every A.8/A.9 regression suite passes unchanged, and lint/typecheck/build/diff-check are green. No blocking authorization regression and no accidental unrelated R1–R3 change was found.

The only working-tree changes outside the R1–R3 Step 2 file set are the **pre-existing documented leftovers** (`next-env.d.ts`, `tsconfig.tsbuildinfo`, `scripts/reconcile-iam-owner-platform-admin.ts`) plus untracked milestone docs and the new test file — none of which touch the audited routes.

---

## 2. Baseline

| Item | Value |
|------|-------|
| HEAD (this review) | `2a2ecfdd7b44b61e90c2d50e40325d82b6cae512` |
| Parent SHA | `76c038b33c65228d702fae170b561309fe27d67e` |
| Branch | `main` (tracks `origin/main`) |
| `origin/main` | `2a2ecfdd7b44b61e90c2d50e40325d82b6cae512` — identical to HEAD |
| A.9 production baseline | `2a2ecfdd7b44b61e90c2d50e40325d82b6cae512` — confirmed, Step 2 is based on it |
| Step 2 status | Uncommitted working-tree changes on top of HEAD (== `origin/main`) |

---

## 3. Working-Tree State

- **Modified tracked files (15):** the 11 R1–R3 Step 2 source/test files (`app/api/ai/audit/route.ts`, `app/api/office/activities/route.ts`, `app/api/office/audit-logs/route.ts`, `app/api/office/reports/runs/[runId]/data/route.ts`, `app/api/reports/[runId]/data/route.ts`, `app/api/reports/[runId]/route.ts`, `app/api/reports/route.ts`, `app/api/royalties/route.ts`, `lib/ai-audit.ts`, `lib/auth/resource-authorization.ts`, `lib/reports.ts`) + `package.json` (added `test:r1-r3-http`) + 3 **pre-existing documented leftovers** (`next-env.d.ts`, `tsconfig.tsbuildinfo`, `scripts/reconcile-iam-owner-platform-admin.ts`).
- **Untracked (14):** milestone docs (A.8/A.9 reports, R1–R3 step 1/2 docs) and `lib/auth/__tests__/r1-r3-http-boundary.test.ts` (the new Step 2 test suite).
- **Prisma schema / migrations:** **unchanged** (zero diff under `prisma/`). No schema change was invented for R2 (activities scoped via existing `users` relation).
- **Secrets / credentials:** no tracked credentials. `.env*` and `.local/` are gitignored (confirmed via `git check-ignore`); `.local/production-admin-bootstrap.secret`, `.env.local`, `.env.production.local` exist on disk but are **untracked/ignored**. `.env.example` is tracked (template only).
- **R1–R3 scope confirmation:** the working tree changes are limited to R1–R3 Step 2 plus the documented pre-existing leftovers. The `scripts/reconcile-iam-owner-platform-admin.ts` modification (A.8 reconciliation tooling, not R1–R3) was **identified and not modified**.
- **Staged:** none. No `git diff --cached` output.

---

## 4. R1 Verification — `/api/royalties`

Read against the actual implementation (`app/api/royalties/route.ts`).

| Requirement | Result | Evidence |
|---|---|---|
| GET by ID uses `requireRoyaltyInOrg` | **PASS** | `route.ts:210` — `await requireRoyaltyInOrg(id, ctx)` before any read-back include |
| Authentication required | **PASS** | `route.ts:51` — `requireOrgAuth()` gates the entire GET |
| Org context server-derived | **PASS** | `ctx` from `requireOrgAuth()` only; no client-supplied org used |
| Foreign tenant IDs → non-leaking 404 | **PASS** | `requireRoyaltyInOrg` → `notFound("Royalty")` → 404 `NOT_FOUND` |
| Nonexistent IDs behave consistently | **PASS** | Same 404 path; test asserts both existing-but-foreign and non-existent → 404 |
| No client-supplied `organization_id`/`tenant_id` override | **PASS** | grep clean; scope comes from `royaltyOrgScopeWhere(ctx)` |
| `requireRoyaltyInOrg` used | **PASS** | `route.ts:210,285,326` |
| `validate-splits` uses `requireContractInOrg` | **PASS** | `route.ts:117` — `await requireContractInOrg(contractId, ctx)` (INT org OR tenant UUID, non-leaking 404) |
| Royalty aggregation org-constrained | **PASS** | `route.ts:157-164` — `AND: [royaltyOrgScopeWhere(ctx), { OR: entityClauses }]` |
| No global aggregation on empty entity set | **PASS** | `route.ts:157-164` — `entityClauses.length > 0 ? … : []` short-circuits to empty result |
| Malformed/non-positive IDs fail closed | **PASS** | `requirePositiveIntId` on `id`/`contract_id` (GET, PUT, DELETE) |
| No `parseInt(...) || 1` / `|| null` | **PASS** | grep clean on the route |
| PUT/DELETE not weakened | **PASS** | `route.ts:283-285, 324-326` — still `requireRoyaltyInOrg(id, ctx)` before mutate; id parsing hardened to `requirePositiveIntId` (R6-family improvement, not a weakening) |

---

## 5. R2 Verification — `/api/office/activities`

Read against `app/api/office/activities/route.ts`.

| Requirement | Result | Evidence |
|---|---|---|
| Canonical org authorization path | **PASS** | `requireOrgAuth()` (was `getServerSession()`-only) |
| List queries org-scoped | **PASS** | `route.ts:46` — `where: { AND: [activityOrgScopeWhere(ctx), filters] }` |
| By-ID queries org-scoped | **PASS** | `route.ts:20` — `requireActivityInOrg(id, ctx)` |
| Ownership chain `user_id → users.organization_id` enforced | **PASS** | `activityOrgScopeWhere` = `{ users: { is: { organization_id: ctx.organizationId } } }` (`resource-authorization.ts:392-394`) |
| Cross-tenant activity IDs unreadable | **PASS** | `requireActivityInOrg` → `notFound("Activity")` → 404 |
| Nonexistent/foreign no existence leak | **PASS** | uniform 404 `NOT_FOUND` |
| No client org identifier trusted | **PASS** | filters only `action/entity_type/entity_id/user_id/dates`, all AND-ed under server scope |
| No invented schema change | **PASS** | no Prisma diff; scoping uses existing `users` relation |
| `activityOrgScopeWhere` applied to every read path | **PASS** | by-id via `requireActivityInOrg`, list via explicit AND |
| `requireActivityInOrg` applied | **PASS** | `route.ts:20` |
| 401/403 mapping | **PASS** | `resourceAuthErrorResponse` in catch; unauthenticated → 401, auth-without-org → 403 `NO_ORGANIZATION` |

---

## 6. R3 Verification — `/api/office/audit-logs`

Read against `app/api/office/audit-logs/route.ts`.

| Requirement | Result | Evidence |
|---|---|---|
| By-ID uses `requireAuditLogInOrg` | **PASS** | `route.ts:19` |
| List filtering server-derived | **PASS** | `route.ts:34-40` — `requireLegacyIntOrgId(ctx)` + `tenant_id = ctx.organizationId` |
| No UUID `parseInt` pass-through | **PASS** | `parseInt(ctx.organizationId)` removed; grep clean |
| No `parseInt(UUID) || null` fallback | **PASS** | removed; predicate built from `ctx` only |
| Previous global-list / wrong-scope failure gone | **PASS** | list is `AND: [orgPredicate, filters]`; org predicate is always present and server-derived |
| Missing org context → 403 not 500 | **PASS** | `requireOrgAuth()` + `resourceAuthErrorResponse` → `403 NO_ORGANIZATION` (test asserts; the prior 500-vs-403 bug is fixed) |
| Legacy INT org scope AND UUID tenant scope handled | **PASS** | `OR: [{ organization_id: intOrg }, { tenant_id: ctx.organizationId }]` mirrors `requireAuditLogInOrg` exactly |
| Foreign audit logs not retrievable | **PASS** | by-id → 404 `NOT_FOUND`; list excludes foreign rows |
| **500-vs-403 bug** | **PASS** | `app/api/office/audit-logs/route.ts:59-66` maps via `resourceAuthErrorResponse`; authenticated-without-org now yields `403 NO_ORGANIZATION` |

---

## 7. Indirect Bypass Verification

### `lib/reports.ts` (verified in full)
- `royalties_summary` scoped via `royaltyOrgScopeWhere(ctx)` — `reports.ts:126` (was global `{}`).
- `activity_log` scoped via `activityOrgScopeWhere(ctx)` — `reports.ts:251-252` (was global).
- `runReport(ctx, …)` — org + actor server-derived; `requireActorUserId(ctx)` (no `|| 1`), `organization_id = ctx.organizationId` — `reports.ts:290-331`.
- No `|| 1` / `|| null` scope collapse on the report paths. (`orgFilter` helper at `reports.ts:9-11` is applied to the pre-existing catalog/contract/tasks/status-quo report defs; those were already filtered and are unchanged in behavior.)

### `/api/reports` (`app/api/reports/route.ts`)
- POST passes `ctx` to `runReport` — `route.ts:56` (removed `parseInt(session.user.id) || 1`).
- DELETE org-bound: `report_runs.findFirst({ id, organization_id: ctx.organizationId })` → 404 foreign/nonexistent, then deletes only that run + artifacts — `route.ts:74-84`.
- GET run list already org-filtered; error mapping via `resourceAuthErrorResponse`.

### Report run-data routes (`/api/reports/[runId]/data`, `/api/office/reports/runs/[runId]/data`)
- `requireOrgAuth`, `requirePositiveIntId(runId)`, org-bound run lookup (`organization_id: orgId`) → 404 foreign — both files.
- Re-run passes authenticated `ctx` to `def.run(ctx, params_json)` — org scope preserved on re-run, cannot retrieve another org's data.
- Report run IDs cannot cross tenants (run must belong to caller org).

### `lib/ai-audit.ts` (verified in full)
- `checkRoyaltyAnomalies(ctx)` scoped with `royaltyOrgScopeWhere(ctx)` — `ai-audit.ts:177-180` (was global 500-row query).
- `checkCatalogConsistency(ctx)` scopes all track scans with `trackOrgScopeWhere(ctx)` (orphans, tracks-without-work, linked work-id set) and release/work scans by org — `ai-audit.ts:36-94`.
- `checkReleaseQuality`/`checkContracts` use `orgFilter(ctx.organizationId)` (unchanged INT/UUID column semantics, fail-closed by accident on INT columns — pre-existing, not an R1–R3 issue).
- `runAllAudits(ctx)` / `postFindingsToStatusQuo(ctx, …)` carry org context end-to-end.

### `/api/ai/audit` (`app/api/ai/audit/route.ts`)
- GET/POST use `requireOrgAuth`; actor derived via `requireActorUserId(ctx)` (no `|| 1`); `entity_id` validated with `requirePositiveIntId`; status-quo write scoped to `ctx.organizationId`.

---

## 8. Helper Review (`lib/auth/resource-authorization.ts`, `lib/auth/organization-context.ts`)

| Helper | Verified behavior |
|---|---|
| `requireOrgAuth` | Session + org resolution via `requireOrganization()`; 401/403 fail-closed; org from authenticated server state only |
| `requireRoyaltyInOrg` | `findFirst({ id, royaltyOrgScopeWhere(ctx) })` → 404 `NOT_FOUND`; fails closed |
| `requireContractInOrg` | `findFirst({ id, OR: [organization_id: intOrg, tenant_id: ctx.organizationId] })` → 404 |
| `requireAuditLogInOrg` | same INT-org/tenant OR predicate on `audit_logs` → 404 |
| `royaltyOrgScopeWhere` | tenant_id OR linked artist/work/track ownership; no client input |
| `trackOrgScopeWhere` | tenant_id OR release/work/track_releases ownership |
| `activityOrgScopeWhere` | `users: { is: { organization_id: ctx.organizationId } }` — server-derived via existing relation |
| `requireActivityInOrg` | by-id + activity scope → 404 |
| `requirePositiveIntId` | fail-closed positive-int validation (rejects `""`, `abc`, `1abc`, `0`, `-1`, non-safe ints) |
| `requireActorUserId` | fail-closed actor id from ctx (rejects 0/NaN) |
| `resourceAuthErrorResponse` | maps `ResourceAuthError` + `OrganizationContextError` → 401/403/404 with codes |

All helpers derive organization context exclusively from authenticated server state; none accept an arbitrary client-supplied organization. Confirmed fail-closed.

---

## 9. Regression-Pattern Scan (changed surfaces)

Scanned `findUnique/findFirst/findMany/count/aggregate/groupBy/update/delete/deleteMany/updateMany` and the listed anti-patterns across the R1–R3 surfaces and their callers:

- `parseInt(...) || 1` / `|| null` on the audited read paths: **none**.
- Client-derived `organization_id` / `tenant_id` / `is_superuser` on the audited routes: **none**.
- Global royalty/activity/audit-log queries on the audited routes: **none** (by-id via `require*InOrg`; lists/aggregates under org predicates).
- Global report/AI royalty queries: **none** (`royaltyOrgScopeWhere`/`activityOrgScopeWhere`/`trackOrgScopeWhere`).
- Remaining `parseInt` occurrences on the audited routes are **subordinate filter/pagination parsing** (`limit`, `entity_id`, `user_id` list filters) that are always AND-ed **under** the server org predicate — they cannot collapse isolation, consistent with the pre-existing sibling routes (documented residual F4-item).

Other read surfaces re-checked for R1/R2/R3 equivalence:
- `lib/audit.ts getAuditLogs` — **dead code** (no callers); `recordAudit` is write-only and writes org context.
- `/api/iam/audit` — org-scoped (`tenant_id` from session + `audit.view`), unchanged.
- `/api/v1/royalties` — API-key org scope, unchanged.
- `/api/royalties/entitlements/**`, dashboard, promote/replay/review — service-level org scopes, unchanged.

---

## 10. Test-Suite Verification

| Gate | Command | Exact result |
|---|---|---|
| Lint | `npm run lint` | **exit 0** (no warnings, `--max-warnings 0`) |
| Typecheck | `npx tsc --noEmit` | **exit 0** |
| Production build | `npm run build` | **exit 0** — `✓ Compiled successfully` (static/dynamic pages rendered) |
| A.8 IDOR | `npm run test:a8-idor` | **13 passed, 0 failed** |
| A.8 privilege | `npm run test:a8-privilege` | **27 passed, 0 failed** |
| A.8 step-5 | `npm run test:a8-step5` | **27 passed, 0 failed** |
| A.8 HTTP | `npm run test:a8-http` | **27 passed, 0 failed** |
| A.9 HTTP | `npm run test:a9-http` | **47 passed, 0 failed** |
| R1–R3 HTTP (new) | `npm run test:r1-r3-http` | **32 passed, 0 failed** |
| Identity acceptance | `npm run test:identity` | **8 passed, 0 failed** |
| Whitespace/conflict | `git diff --check` | **exit 0** |

All gates executed locally on this exact tree. No test failures.

---

## 11. New R1–R3 HTTP Suite Review (`lib/auth/__tests__/r1-r3-http-boundary.test.ts`)

The suite mirrors the **final route decision logic** (auth gate → org context → org-scoped resolution → HTTP status) using the real canonical predicate helpers (`royaltyOrgScopeWhere`, `activityOrgScopeWhere`, `trackOrgScopeWhere`, `requirePositiveIntId`, `resourceAuthErrorResponse`), consistent with the A.8/A.9 HTTP suites. It tests **authorization boundaries**, not happy paths: it asserts 401 unauthenticated, 403 `NO_ORGANIZATION` (not 500), 404 foreign/nonexistent (non-leaking), 400 malformed, cross-org exclusion, and org-scoped list/report/anomaly output.

Coverage vs. the Step 1 §11 contracts:

1. own royalty by-id → 200 ✅
2. foreign royalty by-id → 404 `NOT_FOUND` ✅
3. foreign linked artist/work/track royalty → 404 ✅
4. foreign contract during validate-splits → 404 ✅
5. malformed royalty id → 400 `VALIDATION_ERROR` ✅
6. activities list org-scoped (user_id → users.organization_id) + server-derived ✅
7. activity by-id own 200 / foreign 404 ✅
8. audit-log by-id own 200 / foreign 404 / list excludes foreign (INT org predicate) ✅
9. UUID-parse-bug regression (digit-leading UUID cannot match INT-org row; no global list) ✅

Indirect bypass tests: report actor identity server-derived (`USER_SCOPE_UNAVAILABLE` on invalid actor, no `|| 1`), `royalties_summary`/`activity_log` re-runs org-scoped, `DELETE /api/reports` org-bound (foreign/non-existent → 404), `checkRoyaltyAnomalies` predicate is `royaltyOrgScopeWhere` (never `{}`), anomaly findings exclude foreign royalty ids, catalog-consistency track scans use `trackOrgScopeWhere`. 32 total assertions counted.

---

## 12. A.8 / A.9 Regression Status

- **A.8:** org-scoped catalog mutations, privilege boundaries, platform authority, diagnostic protection, API-key org isolation, and file/storage isolation surfaces are **untouched** by R1–R3 (no diff on those routes/libs). `test:a8-idor/privilege/step5/http` all pass (13/27/27/27).
- **A.9:** network org isolation, platform-only network mutations, AI release/contract isolation, IAM role/team isolation, aggregate isolation, and global search isolation surfaces are **untouched** (no diff on those files). `test:a9-http` passes 47/47.
- The only shared-file change is `lib/auth/resource-authorization.ts`, which is **additive** (two new helpers: `activityOrgScopeWhere`, `requireActivityInOrg`). No existing helper semantics changed; cross-tenant resolution remains 404 non-leaking; explicit authority failures remain 403 with codes.

**No R1–R3 regression against A.8/A.9.**

---

## 13. Residual Findings

### A. Blocking
**None.** No finding prevents committing/deploying the R1–R3 Step 2 implementation.

### B. Non-blocking (pre-existing / outside R1–R3 Step 2)
1. **`POST /api/royalties` accepts unvalidated foreign `artist_id/work_id/track_id`** (`app/api/royalties/route.ts:251-253` create path). Write-path data-integrity issue; `tenant_id` is server-stamped so reads remain own-org visible. Tracked since Step 1 §6; recommended follow-up (org/existence-validate linked ids before create). Not an R1–R3 read-path fix.
2. **`catalog_summary` tracks/labels/publishers/pros counts remain global** (`lib/reports.ts:37-40`) — F4-class Low, previously tracked (Step 1 §7). Unrelated to R1–R3.
3. **`contracts_audit` (reports) and `checkContracts` (AI)** filter the INT `contracts.organization_id` by the UUID `ctx.organizationId`, yielding zero rows — fail-closed by accident, not a leak; pre-existing behavior, unchanged (Step 2 §9.3).
4. **Pagination/limit and list-filter `parseInt`** remain on list routes (`limit`, `entity_id`, `user_id`); cannot collapse isolation (always AND-ed under org scope) and are consistent with sibling routes (Step 2 §9.4).
5. **`recordAudit`/`lib/audit.ts` INT/UUID coercion** — write-side only, no read exposure; already cataloged in `docs/platform/work-items/audit-system-uuid-migration.md`.

No new tenant-isolation issue was found on the R1–R3 surfaces.

---

## 14. Production-Readiness Assessment

- **Read-only assessment only.** No production login, audit-log writes, Neon modification, IAM modification, migrations, reconciliation, Vercel changes, or pushes were attempted.
- **Production probing:** not performed and **not safely possible here** — no `VERCEL_TOKEN`/`NEON_TOKEN`/`NEON_API_KEY`, no Vercel/Neon CLI installed, and `.env.production.local` is a sanitized snapshot (`DATABASE_URL="[SENSITIVE]"`). Logging into production would write audit rows to the audited resource, which is prohibited by this step. No workaround was attempted.
- **Structural readiness from source + tests + build:** the authorization model is the single canonical A.8/A.9 helper set, applied consistently; all read paths are organization-bound with non-leaking 404; authority/scope failures are explicit 403 codes; the A.8/A.9 base remains green; the production build compiles clean. The implementation is structurally ready for production **from a code standpoint**; deployment decisions remain a separate authorized operational gate.

---

## 15. Exact Commit/Deploy Prerequisites

To commit the R1–R3 Step 2 work:

1. Stage the R1–R3 Step 2 file set: the 11 route/lib files listed in §3 plus `lib/auth/__tests__/r1-r3-http-boundary.test.ts` and `package.json`.
2. **Exclude** the pre-existing leftovers unless separately authorized: `next-env.d.ts`, `tsconfig.tsbuildinfo`, `scripts/reconcile-iam-owner-platform-admin.ts` (A.8 reconciliation tooling, not R1–R3).
3. **Exclude** all ignored secret files (`.env*`, `.local/**`) — they are untracked and must remain so.
4. Before commit: `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm run test:a8-idor`, `test:a8-privilege`, `test:a8-step5`, `test:a8-http`, `test:a9-http`, `test:r1-r3-http`, `test:identity`, `git diff --check` — all currently green (see §10).
5. Deploy (separate authorized operational step, not performed here): verify against production Neon per the A.8/A.9 deployment workflow; run any approved read-only `COUNT` grounding first.

---

## 16. Final Verdict

**`PASS — COMMIT READY`**

All R1–R3 Step 2 requirements are implemented and verified against source; all relevant tests, lint, typecheck, and build pass; no blocking authorization regression exists; no accidental unrelated R1–R3 change exists. The implementation is structurally production-ready; deployment itself is an explicit, separately authorized operational gate.

---

**Hard stop — Step 3 complete.** No fixes were implemented, nothing was committed, pushed, or deployed; no Neon/Vercel/IAM/DB changes were made; Step 4 was not started. Next authorized gate: **R1–R3 Step 4 (commit gate / merge decision)** upon explicit authorization.
