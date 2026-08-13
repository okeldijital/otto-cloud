# R1–R3 Milestones Assessment

- **Step:** R1–R3 boundary remediation — milestone-gate assessment
- **Date:** 2026-08-13
- **Basis:** Committed tree at HEAD `2a2ecfdd7b44b61e90c2d50e40325d82b6cae512` (== `origin/main` == deployed A.9 baseline). R1–R3 Step 1 audit (`r1-r3-step1-residual-boundary-audit.md`) remains the design target; no Step 2 implementation exists.
- **Method:** Independent verification run on the exact committed tree — every stated gate re-checked from a fresh process against the working copy (HEAD base).

---

## 1. Verdict

| Milestone | Status | Evidence |
|-----------|--------|----------|
| 1. `test:r1-r3-http` suite | **FAIL** — not present | No `r1-r3-http-boundary.test.ts`; no `test:r1-r3-http` npm script (`Missing script: "test:r1-r3-http"`); zero `r1-r3`/`r1_r3` references in `app/`, `lib/`, `scripts/`, `package.json`. |
| 2. Test artifact | **FAIL** — none | No R1–R3 test artifact exists (no suite, no coverage). |
| 3. Boundary helpers/plugin | **FAIL** — none added | No R1–R3-specific helpers/plugin introduced. Required-by-reader helpers already exist at base (`requireRoyaltyInOrg` `resource-authorization.ts:329`, `requireContractInOrg` `:238`, `requireAuditLogInOrg` `:371`, `royaltyOrgScopeWhere` `:314`) but are not wired to the affected reads. |
| 4. Production build | **PASS** (base only) | `next build` on HEAD: **Compiled successfully in 93s**, TypeScript finished in 47s, **211/211 static pages generated**, no errors. (Exercised no R1–R3 code — none exists.) |
| 5. Baseline regression | **PASS** | `test:a8-http` **14 passed**; `test:a9-http` **47 passed, 0 failed** (incl. T27 existence non-leak); `test:identity` **8 passed**. `git diff --check` exit 0. |
| 6. Working tree / branch | **PASS** | Single in-progress branch (`master`), HEAD == `origin/main`. Only the documented pre-existing leftovers (`next-env.d.ts`, `scripts/reconcile-iam-owner-platform-admin.ts`, `tsconfig.tsbuildinfo`) + untracked docs. No R1–R3 or unrelated source changes. |
| 7. Functional certification (production boundary probes) | **BLOCKED** | Not attempted: Step 1 §10 read-only probe limitations still apply (no `VERCEL_TOKEN`/`NEON_TOKEN`/`NEON_API_KEY`, no authenticated app session, prod-mutation prohibition). R1–R3 scope is **unimplemented**, so nothing exists to certify. |
| 8. Residual-risk reduction | **CONFIRMED UNCHANGED** | All 8 Step 1 boundary findings verified at their exact base-state lines (see §3). Zero remediation present. |

**Overall: `IMPLEMENTATION MILESTONES NOT MET`** — R1–R3 remediation (Step 2) has not been implemented. Every success signal is a base-tree control, not evidence of the security work.

---

## 2. Baseline / control verification (executed this assessment)

| Gate | Command | Result |
|------|---------|--------|
| A.8 HTTP regression | `npm run test:a8-http` | 14 passed, 0 failed |
| A.9 HTTP regression | `npm run test:a9-http` | 47 passed, 0 failed (T27: foreign-resource 404 vs 403 correctness holds) |
| Identity acceptance | `npm run test:identity` | 8 passed, 0 failed |
| Whitespace/conflict check | `git diff --check` | exit 0 |
| Production build | `next build` (16.2.7 Turbopack) | Compiled successfully in 93s; TS 47s; 211/211 pages |
| Repo integrity | `git rev-parse HEAD` vs `origin/main` | identical (`2a2ecfd`); working tree contains only documented leftovers |

---

## 3. Residual-risk confirmation (all 8 Step 1 findings still open at base lines)

Verified via targeted reads/greps on the current tree — every row is byte-identical to the Step 1 audit:

| # | Finding | Location (unchanged) | Status |
|---|---------|----------------------|--------|
| R1 | `GET /api/royalties?id=` — global `findUnique({ where: { id } })`, no `requireRoyaltyInOrg` | `app/api/royalties/route.ts:196` | OPEN |
| R1b | `GET ?action=validate-splits&contract_id=` — global `contracts.findFirst` | `app/api/royalties/route.ts:114` | OPEN |
| R1c | `POST /api/royalties` — foreign `artist_id/work_id/track_id` accepted without org/existence validation | `app/api/royalties/route.ts:236-238` | OPEN |
| R2 | `GET /api/office/activities?id=` (global `findUnique`) + list (global `findMany`) | `app/api/office/activities/route.ts:15,39` | OPEN |
| R3 | `GET /api/office/audit-logs?id=` (global `findUnique`) + list (parse-bug inert org filter `parseInt(ctx.organizationId) \|\| null`) | `app/api/office/audit-logs/route.ts:17,41` | OPEN |
| R4 | `royalties_summary` report ignores `orgId` (`where = {}`) | `lib/reports.ts:117-119` | OPEN |
| R5 | `activity_log` report global activities read | `lib/reports.ts:241` | OPEN |
| R6 | `ai-audit` royalty-anomaly check global (`royalties.findMany({ take: 500 })`, ignores `orgId`) | `lib/ai-audit.ts:162` (route passes `orgId` at `app/api/ai/audit/route.ts:17`, unused by `runAllAudits`) | OPEN |
| R7 | `office/audit-logs` authenticated-without-org returns `500` instead of `403` (parse-bug `|| null` → global read) | `app/api/office/audit-logs/route.ts:41` | OPEN |

No R1–R3 suite, no new helpers, no route changes — so none of the §11 Step 1 HTTP contracts (404 vs 403, audit-logs parse-bug regressions, report/ai-audit scoping) can be asserted.

---

## 4. Conclusions

1. **The security milestone is not met.** `test:r1-r3-http` does not exist; the R1/R1b/R2/R3 reads and the three bypass surfaces remain exactly as documented in Step 1.
2. **All green signals are base controls.** Build, A.8/A.9/identity regressions, and `diff --check` all pass *because nothing changed* — they do not certify the R1–R3 boundary.
3. **Deferral rationale is unchanged.** Production impact remains low (single org, mostly-empty affected tables), consistent with the A.9 deferral framing — but the cross-tenant read paths remain exploitable the moment multi-tenant royalty/activity/audit data is onboarded.

## 5. Recommended next step (requires explicit authorization — Step 1 doc §12)

1. Implement Step 2 per the Step 1 design: wire the existing readers-only helpers (`requireRoyaltyInOrg`, `requireContractInOrg`, `requireAuditLogInOrg`, `royaltyOrgScopeWhere`, `requireLegacyIntOrgId`) into the R1/R1b/R3 reads; choose R2 option A (user-scope) vs B (platform-gate); close the three bypass surfaces (`lib/reports.ts`, `lib/ai-audit.ts`); add the 9 HTTP contracts of Step 1 §11 as `test:r1-r3-http`.
2. Re-run `test:a8-idor/privilege/step5/http` + `test:a9-http` for regression, run the new `test:r1-r3-http`, and run `next build`.
3. Precedent discipline: reuse the canonical A.8/A.9 primitives only — no ad-hoc `organization_id` parsing in routes.
