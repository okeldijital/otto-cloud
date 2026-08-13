# R1–R3 STEP 2 — RESIDUAL AUTHORIZATION-BOUNDARY REMEDIATION REPORT

**Mode:** Repository-only implementation of the R1–R3 Step 1 residual findings. No production database, IAM, Vercel, or deployment changes were made. No migrations were run. No commits, pushes, or merges were performed.

**Basis:** R1–R3 Step 1 residual audit (`r1-r3-step1-residual-boundary-audit.md`) and its milestone assessment (`r1-r3-step2-milestones-assessment.md`).

---

## 1. Branch and Base Commit

| Item | Value |
|------|-------|
| Repo branch | `main` |
| Base commit (HEAD before work, == `origin/main`) | `2a2ecfdd7b44b61e90c2d50e40325d82b6cae512` (`feat(security): harden residual authorization boundaries` = A.9 closure) |
| HEAD during work | Unchanged (work is uncommitted working-tree changes) |
| Scope | R1/R2/R3 residual reads + the three indirect bypass surfaces (reports, report run data, AI audit) |

---

## 2. Files Changed

Source/routes:

| File | Change |
|------|--------|
| `lib/auth/resource-authorization.ts` | Added the two smallest missing A.8/A.9 primitives: `activityOrgScopeWhere(ctx)` (activities scoped via the authoritative `activities.user_id → users.organization_id` relationship) and `requireActivityInOrg(id, ctx)` (404 non-leaking by-id resolver). No new authorization model. |
| `app/api/royalties/route.ts` | R1 by-id now resolves through `requireRoyaltyInOrg(id, ctx)`; `action=validate-splits` resolves `contract_id` through `requireContractInOrg` and ANDs the royalty aggregation with `royaltyOrgScopeWhere(ctx)` with an empty-entity-set guard; `id`/`contract_id` validated with `requirePositiveIntId` (GET, PUT, DELETE). |
| `app/api/office/activities/route.ts` | Replaced `getServerSession()`-only auth with `requireOrgAuth()`; by-id uses `requireActivityInOrg`; list is AND-ed with `activityOrgScopeWhere(ctx)` (server-derived org predicate; user filters subordinate); `id` validated with `requirePositiveIntId`; errors mapped via `resourceAuthErrorResponse`. |
| `app/api/office/audit-logs/route.ts` | Replaced broken `parseInt(ctx.organizationId) || null` list filter with the server-derived `requireAuditLogInOrg`-style predicate (`organization_id = legacyIntOrgId` OR `tenant_id = ctx.organizationId`); by-id uses `requireAuditLogInOrg`; `id` validated with `requirePositiveIntId`; `requireOrgAuth` + `resourceAuthErrorResponse` (authenticated-without-org now maps to `403 NO_ORGANIZATION`, not `500`). |
| `lib/reports.ts` | `royalties_summary.run` now scopes via `royaltyOrgScopeWhere(ctx)`; `activity_log.run` scopes via `activityOrgScopeWhere(ctx)`; `ReportDefinition.run` and `runReport` take the authenticated `OrganizationContext`; actor user id derived via `requireActorUserId(ctx)` (no `|| 1` fallback). |
| `app/api/reports/route.ts` | POST passes org context to `runReport` (no `parseInt(session.user.id) || 1`); DELETE is organization-bound (foreign/non-existent run → 404 before delete); error mapping via `resourceAuthErrorResponse`. |
| `app/api/reports/[runId]/route.ts` | `requireOrgAuth`, `requirePositiveIntId(runId)`, org-bound run lookup, `resourceAuthErrorResponse`. |
| `app/api/reports/[runId]/data/route.ts` | `requireOrgAuth`, `requirePositiveIntId(runId)`, org-bound run lookup, re-run is org-bound via `def.run(ctx, …)`, `resourceAuthErrorResponse`. |
| `app/api/office/reports/runs/[runId]/data/route.ts` | Same as above for the office reports run-data surface. |
| `lib/ai-audit.ts` | `checkRoyaltyAnomalies(ctx)` now scopes with `royaltyOrgScopeWhere(ctx)` (no global 500-row royalty query); `checkCatalogConsistency(ctx)` scopes all track scans with `trackOrgScopeWhere(ctx)` and releases/works by org; all `check*`/`runAllAudits`/`postFindingsToStatusQuo` accept the org context. |
| `app/api/ai/audit/route.ts` | Passes org context to `runAllAudits`/`postFindingsToStatusQuo`; `resolve` uses `requireActorUserId(ctx)` and `requirePositiveIntId(entity_id)`; `requireOrgAuth` + `resourceAuthErrorResponse`. |

Tests / config / docs:

| File | Change |
|------|--------|
| `lib/auth/__tests__/r1-r3-http-boundary.test.ts` | **New** — 32-case HTTP contract suite (see §5). |
| `package.json` | Added `"test:r1-r3-http"` script. |
| `docs/platform/identity/r1-r3-step2-residual-boundary-remediation-report.md` | This report. |

Pre-existing, unmodified leftovers present in the working tree (`next-env.d.ts`, `scripts/reconcile-iam-owner-platform-admin.ts`, `tsconfig.tsbuildinfo` build artifact) were documented in Step 1 and the milestones assessment; they were not authored or changed by this step.

---

## 3. R1/R2/R3 Fixes

### R1 — `GET /api/royalties` by-id and `action=validate-splits`
- **By-id** (`?id=`): replaced the unscoped `royalties.findUnique({ where: { id } })` with the canonical `requireRoyaltyInOrg(id, ctx)`. Foreign/non-existent rows → `404 NOT_FOUND` (non-leaking). The include readback happens only after org resolution passes.
- **validate-splits** (`?action=validate-splits&contract_id=`): resolved `contract_id` through `requireContractInOrg(contractId, ctx)` before any include read; the royalty aggregation is AND-ed with `royaltyOrgScopeWhere(ctx)`; if the contract exposes no linked artists/works/tracks, the aggregation short-circuits to an empty result — an empty entity/link set can never fall through to a global query.
- **Malformed numeric IDs**: `id`/`contract_id` now use `requirePositiveIntId` (fail-closed `400 VALIDATION_ERROR`). No `parseInt(...) || 1` / `|| null` / record-fallback remains on the audited path. PUT/DELETE `id` parsing was also hardened to `requirePositiveIntId` (R6-family).

### R2 — `GET /api/office/activities`
- Auth upgraded from `getServerSession()`-only to `requireOrgAuth()`.
- **By-id**: `requireActivityInOrg(id, ctx)` → foreign/non-existent → `404`.
- **List**: AND-ed with `activityOrgScopeWhere(ctx)` = `{ users: { is: { organization_id: ctx.organizationId } } }`, using the existing authoritative relationship `activities.user_id → users.organization_id`. User-supplied `action/entity_type/entity_id/user_id/date` filters remain subordinate to the server-derived org predicate. No new authorization model and no invented schema ownership column.

### R3 — `GET /api/office/audit-logs`
- **By-id**: `requireAuditLogInOrg(id, ctx)` (existing, previously unused helper) → foreign/non-existent → `404`.
- **List**: the broken `parseInt(ctx.organizationId) || null` filter (which turned a UUID into `null`/truncated int and collapsed to a global read) is replaced by the server-derived predicate `{ OR: [{ organization_id: requireLegacyIntOrgId(ctx) }, { tenant_id: ctx.organizationId }] }`, matching `requireAuditLogInOrg`. A malformed organization identifier can never become a global query. The UUID `tenant_id` boundary is preserved.
- **Error mapping**: authenticated-without-org now returns `403 NO_ORGANIZATION` instead of `500`.

---

## 4. Indirect Bypass Fixes

### Reports (`lib/reports.ts`, `/api/reports`, `/api/reports/runs/[runId]/data`, `/api/office/reports/runs/[runId]/data`)
- Report creation uses the authenticated org context; actor user id is server-derived via `requireActorUserId(ctx)` — the `parseInt(session.user.id) || 1` fallback is removed.
- `royalties_summary` and `activity_log` report runs (both the initial `POST /api/reports` run and the run-data re-runs) are organization-scoped via `royaltyOrgScopeWhere` / `activityOrgScopeWhere`.
- Report runs are organization-bound (list GET already was; run metadata and data re-runs were hardened with `requireOrgAuth` + `requirePositiveIntId` + org-bound lookup).
- Report deletion (`DELETE /api/reports?id=`) is organization-bound: the run must belong to the caller's org, else `404`; deletion then removes only that run and its artifacts.

### AI audit (`lib/ai-audit.ts`, `/api/ai/audit`)
- `checkRoyaltyAnomalies(ctx)` scopes with `royaltyOrgScopeWhere(ctx)` — no global 500-row royalty query remains; findings cannot contain foreign royalty ids/amounts.
- `checkCatalogConsistency(ctx)` scopes every track scan with `trackOrgScopeWhere(ctx)` and release/work scans by org.
- The `resolve` action derives the actor via `requireActorUserId(ctx)` (no `|| 1`) and validates `entity_id` with `requirePositiveIntId`; all writes remain org-scoped.

### Architecture reuse
No parallel authorization system was introduced. All scoping reuses the existing canonical helpers: `requireRoyaltyInOrg`, `requireContractInOrg`, `requireAuditLogInOrg`, `royaltyOrgScopeWhere`, `trackOrgScopeWhere`, `requireLegacyIntOrgId`, `requirePositiveIntId`, `requireActorUserId`, `resourceAuthErrorResponse`. The only additions are the two smallest missing primitives for activities, consistent with A.8/A.9 (`activityOrgScopeWhere`, `requireActivityInOrg`). Cross-tenant access uses the established non-leaking `404` behavior; authority/scope failures use explicit `403` codes.

---

## 5. Tests Added

- Suite: `lib/auth/__tests__/r1-r3-http-boundary.test.ts`
- Script: `npm run test:r1-r3-http` → **32 passed, 0 failed**.
- The suite exercises route-level decisions (auth gate → org context → org-scoped resolution → HTTP status), not helpers in isolation, mirroring the final route code and using the real canonical predicate helpers and `requirePositiveIntId`/`resourceAuthErrorResponse`.

The nine required HTTP contracts and their coverage:

| # | Contract | Test |
|---|----------|------|
| 1 | own royalty by-ID → allowed | `own royalty by-id → 200 with row` |
| 2 | foreign royalty by-ID → denied | `foreign royalty by-id → 404 NOT_FOUND (non-leaking)` |
| 3 | foreign linked royalty/entity → denied | `royalty by-id with foreign linked artist → 404` |
| 4 | foreign contract during validate-splits → denied | `validate-splits with foreign contract → 404 NOT_FOUND` |
| 5 | malformed royalty ID → fail closed | `malformed royalty id → 400 VALIDATION_ERROR (fail closed)` |
| 6 | activities list → organization-scoped | `activities list is organization-scoped (user_id → users.organization_id)` + `activities org scope is server-derived` |
| 7 | activity by-ID → organization-scoped | `activities own by-id → 200` / `activities foreign by-id → 404` |
| 8 | audit-log list/by-ID → organization-scoped | `audit-logs own by-id → 200` / `audit-logs foreign by-id → 404` / `audit-logs list excludes foreign rows (INT org predicate)` |
| 9 | malformed audit-log organization identifier → fail closed | `UUID parse bug fixed: no parseInt(orgId)||null global list` (digit-leading UUID `12345678-…` cannot match the INT-org row) |

Indirect cases also covered: report actor identity is server-derived (no `|| 1` — `USER_SCOPE_UNAVAILABLE` on invalid actor), `royalties_summary`/`activity_log` re-runs are org-scoped, `DELETE /api/reports` is org-bound (foreign/non-existent → 404), `checkRoyaltyAnomalies` predicate is `royaltyOrgScopeWhere` (never `{}`), anomaly findings exclude foreign royalty ids, and catalog-consistency track scans are `trackOrgScopeWhere`-scoped. Unauthenticated → 401 and authenticated-without-org → 403 (not 500) are asserted for the office routes.

---

## 6. Validation Results (executed locally on this tree)

| Gate | Command | Result |
|------|---------|--------|
| Lint | `npm run lint` | exit 0 (no warnings) |
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Production build | `npm run build` | `✓ Compiled successfully`; static pages 211/211; exit 0 |
| A.8 IDOR regression | `npm run test:a8-idor` | 13 passed, 0 failed |
| A.8 privilege regression | `npm run test:a8-privilege` | 27 passed, 0 failed |
| A.8 step-5 regression | `npm run test:a8-step5` | 27 passed, 0 failed |
| A.8 HTTP regression | `npm run test:a8-http` | 27 passed, 0 failed |
| A.9 HTTP regression | `npm run test:a9-http` | 47 passed, 0 failed |
| R1–R3 HTTP (new) | `npm run test:r1-r3-http` | 32 passed, 0 failed |
| Identity acceptance | `npm run test:identity` | 8 passed, 0 failed |
| Whitespace/conflict check | `git diff --check` | exit 0 |

All results are real, captured from the executed commands. (An initial build attempt failed only because two `npm run build` were launched concurrently in one invocation; a clean single build passes with exit 0.)

---

## 7. Security Review (read-only, of the changed routes)

The changed surface was grepped for the listed anti-patterns. Results:

| Pattern | Status |
|---------|--------|
| `findUnique`/`findFirst` without tenant predicates (royalties by-id, activities, audit-logs, report runs) | **Removed** — every by-id read is gated by `requireRoyaltyInOrg` / `requireActivityInOrg` / `requireAuditLogInOrg` / org-bound `report_runs.findFirst`. |
| `parseInt(...) || 1` | **Removed** — no fallback actor id remains (`runReport` uses `requireActorUserId`; AI `resolve` uses `requireActorUserId`). |
| `parseInt(...) || null` (tenant/record fallback) | **Removed** — audit-logs list predicate is derived from `ctx` (`requireLegacyIntOrgId` + `ctx.organizationId`), never from `parseInt` of a UUID. |
| Client-derived `organization_id` | **None** on the changed routes — org is always from `requireOrgAuth` context. |
| Client-derived `tenant_id` | **None** — royalty/audit-log/activity scope predicates use `ctx.organizationId`. |
| Fallback user IDs | **Removed** from `/api/reports` POST and `/api/ai/audit` resolve. |
| Global royalty queries | **Removed** — `royalties_summary` and `checkRoyaltyAnomalies` use `royaltyOrgScopeWhere`. |
| Global activity queries | **Removed** — `activity_log` and `/api/office/activities` use `activityOrgScopeWhere`. |
| Global audit-log queries | **Removed** — by-id via `requireAuditLogInOrg`; list via org predicate. |
| Global report/AI royalty queries | **Removed** — all report/audit royalty reads are org-scoped. |

A.8/A.9 boundaries remain intact: all A.8/A.9 regression suites pass unchanged, the canonical helper set is reused (no parallel model), cross-tenant resolution remains `404` (non-leaking), and explicit authority failures remain `403` with codes.

---

## 8. Production-Safety Confirmation

Repository-only implementation. The following were **not** performed: Neon modifications, production SQL writes, migrations, IAM reconciliation/modification, Vercel changes, deployments, pushes, merges, or commits. Production is untouched; only the working tree changed.

---

## 9. Residual Findings (not part of this scope, tracked per Step 1 §6)

1. **`POST /api/royalties` accepts unvalidated foreign `artist_id/work_id/track_id`** (`app/api/royalties/route.ts` create path). Write-path data-integrity issue (Step 1 §6, adjacent — not an R1–R3 read-path fix). `tenant_id` is stamped from the server context, so reads back remain own-org visible; foreign references would surface only via the read-back `include`. Recommended follow-up: org/existence-validate linked ids before create.
2. **`catalog_summary` tracks/labels/publishers/pros counts** remain global (Step 1 §7, F4-class Low, previously tracked) — unrelated to R1–R3.
3. **`contracts_audit` (reports) and `checkContracts` (AI)** filter the INT `contracts.organization_id` by the UUID `ctx.organizationId`, which yields zero rows (fail-closed by accident, not a leak) — pre-existing behavior, unchanged. Optional follow-up: switch to `requireLegacyIntOrgId(ctx)` so the reports return own-org contract data rather than empty results.
4. Pagination `limit`/`skip` parsing on list routes remains plain `parseInt` with defaults; these cannot collapse isolation (always AND-ed under the org scope) and are consistent with the sibling routes.

---

## 10. Recommended Next Gate

Proceed to **R1–R3 Step 3**: a read-only security regression/readiness review of the implemented boundary — re-running the full validation matrix, auditing the changed routes for the §7 patterns, and confirming the A.8/A.9 base remains intact before any merge/deploy decision. Per the step's stop condition, no commit, push, merge, or deploy was performed here.

**STOP — Step 2 implementation complete.** No commits, pushes, merges, or deployments were made; production is untouched.
