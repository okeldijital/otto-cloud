# A.9 Step 4 — Security Regression & Commit-Readiness Review

> Read-only review of the completed A.9 Step 3 residual boundary remediation (F1–F5).
> Performed entirely from repository state. **No source/test/docs/db/Neon/Vercel/env changes were made; no commit, push, deploy, migrate, seed, reconcile, or credential reset was performed.** This document is the only deliverable of this step.

---

## 1. Baseline

| Item | Value |
|---|---|
| Repository | `main` (`/Users/lekonkosi/otto-cloud`) |
| HEAD | `76c038b33c65228d702fae170b561309fe27d67e` — `feat(security): harden IAM authorization boundaries` (A.8 last commit) |
| Change-set under review | Working tree = 18 modified files + 10 untracked files (all A.9-intended; inventory in §2) |
| Schema / migrations | `git status --short -- prisma/` empty — **no schema/migration changes** |
| Environment | Only `.env.example` tracked; `.env*` / `.local/**` ignored; **no `.env*`/`.local/**` changes present** |
| Deployment state | No Neon/Vercel/deploy/reconciliation evidence in the working tree; deployment references are pre-existing config/docs from prior milestones (§9) |

---

## 2. Changed-path inventory

**Modified (18):**

| Path | Purpose | Correctness |
|---|---|---|
| `app/api/admin/orgs/route.ts` | GET/PUT gate `requireAdmin` → `requirePlatformAdmin` | Verified |
| `app/api/ai/analytics/route.ts` | Both `tracks.count()` → `trackOrgScopeWhere(ctx)` | Verified |
| `app/api/ai/release-integration/route.ts` | `plan` release+contract org-bound; run row uses validated ids | Verified |
| `app/api/ai/royalty/route.ts` | `simulate` release/contract-doc org-bound (404), validated ids | Verified |
| `app/api/iam/roles/route.ts` | GET org-scoped for non-platform; POST session org (no client override); PUT/DELETE org-scoped 404; system roles 400 | Verified |
| `app/api/iam/teams/route.ts` | members/add/remove/DELETE org-bound 404; target user same-org | Verified |
| `app/api/network/all/route.ts` | orgs/individuals org-bound; platforms global ref | Verified |
| `app/api/network/health/route.ts` | Platform-only; hardcoded `missing_contracts:5` / `expired_agreements:2` removed | Verified |
| `app/api/network/individuals/route.ts` | by-id/list org-bound; junction same-org only | Verified |
| `app/api/network/organizations/route.ts` | by-id/list/PUT/DELETE org-bound 404 | Verified |
| `app/api/network/platforms/route.ts` | Mutations + DELETE platform-authority gated (403); GET global ref read | Verified |
| `app/api/network/relationships/route.ts` | GET/POST/DELETE platform-only; DELETE 404-check-first | Verified |
| `app/api/search/route.ts` | tracks/playlists scoped predicates; network orgs/individuals INT-org bound (fail-closed `-1`) | Verified |
| `lib/auth/resource-authorization.ts` | Added `requireAIContractDocumentInOrg` (INT org OR tenant uuid, 404) | Verified |
| `package.json` | Added `test:a9-http` script (intended) | Verified |
| `scripts/reconcile-iam-owner-platform-admin.ts` | A.8 follow-up: `--apply` (guarded), `--only-id`, flat-moon refuse, delete re-check + exit 6 | Verified |
| `next-env.d.ts` | Build-generated line (`./.next/dev/types` → `./.next/types`) | Generated artifact |
| `tsconfig.tsbuildinfo` | Build-generated TypeScript build cache | Generated artifact |

**Untracked (10):** `lib/auth/__tests__/a9-http-boundary.test.ts` (new test) and the A.8/A.9 report documents under `docs/platform/identity/` (`a8-step7-*`, `a8-step8-*`, `a8-step9-*`, `a9-step1-*`, `a9-step2-*`, `a9-step3-*`, `production-access-acceptance-report.md`, `production-admin-access-recovery-report.md`). All intended deliverables; no secrets.

No unrelated features, no config/package-lock/ESLint/Next config changes, no schema/migrations, no `.env*`, no committed secrets, no debug endpoints, no `TODO`/`FIXME`/`bypass`/`debugger` in changed files.

---

## 3. Validation results (all gates)

| Gate | Command | Result |
|---|---|---|
| Lint | `npm run lint` (eslint app/api lib/auth lib/permissions.ts lib/platform/identity --max-warnings 0) | exit 0 |
| Typecheck | `npx tsc --noEmit` | exit 0 |
| Build | `npm run build` | exit 0 |
| Whitespace | `git diff --check` | exit 0 |
| A.8 IDOR | `test:a8-idor` | 13 passed |
| A.8 privilege | `test:a8-privilege` | 27 passed |
| A.8 step5 | `test:a8-step5` | 27 passed |
| A.8 HTTP | `test:a8-http` | 27 passed |
| A.9 HTTP | `test:a9-http` | 47 passed |
| Identity | `test:identity` (9 suites) | 80 passed (9,10,8,10,9,9,8,9,8) |

All green.

---

## 4. F1–F5 verification (re-audit of Step 3)

**F1 — Network boundary.** `organizations` by-id/list/PUT/DELETE are INT-org scoped with 404 for foreign; join includes filter junctions to same-org. `platforms` mutations + DELETE require `platformAuthorityFromSession` (403 `PLATFORM_AUTHORITY_REQUIRED`); GET is an authenticated global reference read. `relationships` GET/POST/DELETE are platform-only via the shared helper; DELETE 404-checks first. `all` orgs/individuals org-bound. `individuals` by-id/list org-bound; POST/PUT reduce `organization_ids` to same-org INT ids only (foreign dropped). `admin/orgs` requires `requirePlatformAdmin`. No alternate bypass found. ✔

**F2 — AI boundary.** `ai/royalty simulate`: `requirePositiveIntId(release_id)` → `requireReleaseInOrg` → scoped re-fetch (id + organization_id + `!is_deleted`); `contract_document_id` → `requireAIContractDocumentInOrg` (INT org OR tenant uuid); runs/hash use validated ids; royalty GET `runs` already org-scoped. `ai/release-integration plan`: `requirePositiveIntId(release_id)` + `requireReleaseInOrg` + scoped `findFirst`; `contract_id` validated + `requireContractInOrg`; run row uses validated `releaseId`/`contractIdForRun`; GET `plan` runs org-scoped. No unscoped `findUnique`/`findFirst`/raw SQL in F2 paths; foreign resources are indistinguishable (404 `NOT_FOUND`). ✔

**F3 — IAM boundary.** `iam/roles`: GET — platform sees all; org actors see `organization_id = ctx` only, with `_count.user_roles` narrowed to same-org users. POST — org actors always session-derived org (client `organization_id` ignored); `is_system` forced false; global-name uniqueness pre-check (pre-existing). PUT/DELETE — platform `findUnique`, org actor `findFirst {id, organization_id}`, 404 foreign, 400 system. `iam/teams`: all member ops + add/remove/delete org-bound; add-member requires target `prisma.user` (model `user`) in the same org. ✔

**Privilege-elevation analysis (deep check):** the legacy `permissions` catalog (seed-iam.ts) contains **no `platform.*` codes** (closest legacy keys: `admin.access`, `system.backup`, `system.monitor`), so the legacy `roles`/`role_permissions` stack cannot bind a platform-authority permission. `isPlatformAuthority` elevates **only** via `is_superuser` or `session.role ∈ {super_admin, platform_admin}` from the IAM context — it ignores the legacy permissions list entirely. `platformAuthorityFromSession` ignores a bare `platform.admin` IAM-permission; the only grant path is the IAM invite flow guarded by `assertCanGrantOrgRole`/`sendAccessInvite` (A.8-pinned). No API route grants `platform.admin`. Creating/editing/deleting a legacy role does not yield platform authority. ✔

**F4 — Aggregates.** `ai/analytics` — all counts/groupBys org-scoped: `contracts` via INT org, `artists/releases/works/ai_sessions/ai_contract_resolution_runs` via org UUID, `tracks` via `trackOrgScopeWhere`, run tables via validated ints. `network/health` — now platform-only; counts are global (platform view, correct); hardcoded fake values removed. `notifications`, `platform/events` metrics counts are org-scoped (verified in broader scan). ✔

**F5 — Search.** `app/api/search` diff confirms **only** the four previously-leaking queries changed: `tracks` → `AND:[trackOrgScopeWhere(ctx), OR(title/isrc_code/track_id)]`; `playlists` → `AND:[playlistOrgScopeWhere(ctx), OR(name/description)]`; `organizations` → `{name, organization_id: legacyIntOrgId}`; `individuals` → `{organization_id: legacyIntOrgId}` with fail-closed `-1` when INT scope unavailable. Pre-existing (unchanged) lines: `contracts` uses `parseInt(orgId)||0` (functional quirk, fails toward an invalid org — no cross-tenant leak), `labels`/`publishers`/`pros` global reference data (existing, unchanged). No post-processing re-join cross-tenant data observed. ✔

---

## 5. A.8 regression guarantee

All eight A.8 protection surfaces remain intact. Protection files `lib/auth/organization-context.ts`, `lib/iam.ts`, privilege helpers, file/storage auth, and api-key routes are **untouched** by this change-set (the only `lib/auth` change is the additive `requireAIContractDocumentInOrg` in `resource-authorization.ts`). All transplanted A.8 test suites re-ran green in §3 (13+27+27+27). A.9 changes are strictly *narrowing* (org-derivation is always server/session-side; every changed branch adds an org bound or an authority gate). No A.8 behavior was relaxed.

---

## 6. HTTP test-contract review (`test:a9-http`, T1–T27)

The 47-case suite mirrors the changed route logic with mocked session/prisma and asserts the following contract points (deviation notes inline):

| Tests | Contract point proven |
|---|---|
| T1 | All 14 audited routes reject unauthenticated requests (401) |
| T2–T4 | Search tracks/playlists org-scoped; network rows INT-bound; scoped catalog entities still return |
| T5–T8 | AI simulate/plan org-bound; foreign release/contract/doc resolve to 404 `NOT_FOUND`; run org == actor int org |
| T9–T11 | `network/organizations` list/by-id/write org-scoped; foreign 404 |
| T12–T14 | member mutating platforms/relationships → 403 `PLATFORM_AUTHORITY_REQUIRED`; platform actor allowed |
| T15–T16 | `network/all` returns own-org rows only; junction rejects foreign org ids (dropped) |
| T17 | `admin/orgs` platform-only |
| T18–T20 | roles: member sees only own-org; POST org from session; foreign/system immutable (404 / 400) |
| T21–T23 | teams org-bounds incl. foreign-user add; permissions catalog remains authed read |
| T24–T25 | analytics tracks scoped; health platform-only, no hardcoded fields |
| T26 | client-supplied org cannot change scope (server context wins) |
| T27 | Foreign-resource resolution is a consistent 404 matrix; authority failures are 403 **with code** |

**Deviations (documented in Step 3 report, confirmed intentional):** T11/T16 foreign-network-row accesses return non-leaking 404 (not 403); T20 gives org actors 404-foreign / 400-system rather than a blanket platform-only gate so organization role management still functions. Existence is never distinguishable; authority failures remain 403+code.

**Assessment:** the suite is a faithful behavioral mirror of the changed handlers rather than a live-server integration test; the F1–F5 read audit (§4) supplies the primary evidence, the suite the executable contract proof. Adequate for repo-only review.

---

## 7. Broader `app/api` regression scan (classification)

Scanned all Prisma reads/writes in `app/api` for unscoped `findUnique`/`findFirst`/`findMany`/`count`, client-controlled `organization_id`, `parseInt(...)||1` fallbacks, path-tenant selection, global aggregates, authed-but-unowned mutation routes, and GET-scoped / PUT-unscoped pairs.

- **No `|| 1` fallbacks and no body-derived `organization_id` anywhere in `app/api`** (grep verified).
- **Fixed by A.9:** all 14 F1–F5 routes (§4).
- **Intentional global reference data (existing, unchanged):** `labels`, `publishers`, `pros`, `platforms` GET, `relationships` GET, IAM `permissions` catalog, `subscriptions` `plans`. These are global catalogs, not tenant-owned rows.
- **Pre-existing org-scoped / gated (existing, verified okay):** workspaces family (`fetch-then-check`, 404 on foreign org — e.g. `workspace/[id]/fields`, `workspaces/[id]`), `notifications` (org-scoped counts + service), `platform/events` metrics (org-scoped), `office/audit-logs` list (org-filtered), `storage/download/[id]` (A.8-covered), invitations (token-gated), `organizations/*` (session-derived tenant), `admin/users` (permission-gated), `iam/users`, `iam/audit` (org/permission-gated), `artists`/`tracks` POST re-reads (server-generated ids).
- **Pre-existing out-of-scope debt (surfaced, NOT part of this change-set):** see §8.

---

## 8. Residual findings (severity; none introduced by this change-set)

| # | Finding | Severity | In this commit? | Status |
|---|---|---|---|---|
| R1 | `app/api/royalties/route.ts` GET by-id does an unscoped `royalties.findUnique({id})` with no org check (list path is properly scoped; helper `requireRoyaltyInOrg` exists but is not used on by-id) | **High** (cross-tenant read on tenant-owned table) | No — pre-existing | Remediate in next security step |
| R2 | `app/api/office/activities/route.ts` GET is a fully unscoped global query (no `requireOrganization`, arbitrary `entity_id`/`user_id` filters) | **High** (cross-tenant read) | No — pre-existing | Remediate in next security step |
| R3 | `app/api/office/audit-logs/route.ts` GET by-id is an unscoped `audit_logs.findUnique` (list path is org-filtered) | Medium (cross-tenant single-row read) | No — pre-existing | Remediate in next security step |
| R4 | `app/api/iam/roles/route.ts` POST global role-name existence pre-check (`roles.findUnique({name})` — boolean oracle only, row not exposed) | Low | No — pre-existing | Track |
| R5 | `ai/contracts` resolve/attach + `ai/core-write` write registry rows with client-supplied `entity_id`s (from Step 3 report; writes outside the parseInt-pin scope) | Medium | No — pre-existing | Tracked in Step 3 report |
| R6 | Legacy `parseInt(orgIdStr)||0` / `||null` fallbacks in `search/contracts` and `office/audit-logs` list filter (fail toward invalid/null org, no cross-tenant leak, but non-ideal) | Low | No — pre-existing | Track |
| R7 | Generated artifacts `tsconfig.tsbuildinfo` + `next-env.d.ts` regenerate on every `npm run build` (diff noise; not sensitive) | Info | Yes (generated) | Decide: gitignore `tsconfig.tsbuildinfo` or accept noise |

**No Critical or High finding is within the A.9 Step 3 change-set.** R1/R2/R3 are real pre-existing cross-tenant read exposures that the broader scan surfaced; they do not touch or depend on the A.9 changes, but they should be queued ahead of any multi-tenant catalog/network data onboarding (consistent with A.9 Step 1's deferral framing).

---

## 9. Production status (from repository state only)

- HEAD commit is the A.8 closure (`76c038b`); no A.9 commit exists yet — the step is post-completion, pre-commit.
- No evidence of Neon/Vercel deployment, reconciliation, or schema changes in the working tree; all Vercel/Neon references are pre-existing config/documentation.
- `DATABASE_URL`-driven scripts (`reconcile-iam-owner-platform-admin`) remain dry-run by default, refuse the `flat-moon` lab host, and gate `--apply` behind `--only-id` verification + a post-delete count re-check (exit 6 on mismatch). No run was performed in this step.
- **Production blockers: none identified from repository state.** Nothing in this review authorizes or implies a production action.

---

## 10. Commit blockers

**None.** The change-set is internally consistent, scoped, gated, and green. No unrelated features, secrets, schema/migration, or debug code. `git diff --check` clean.

## 11. Production blockers

**None identified.** No commit/push/deploy/migrate/seed/reconcile/credential action is recommended or performed by this step.

---

## 12. Recommended next action

1. **Commit the A.9 working tree** (18 modified + intended new test + report docs) as the A.9 Step 3+4 deliverable once user authorization is given. Consider adding `tsconfig.tsbuildinfo` to `.gitignore` (or accept the build-generated diff noise) and/or regenerating `next-env.d.ts`/`tsbuildinfo` once before commit.
2. **Queue remediation for R1/R2/R3** (pre-existing cross-tenant reads in `royalties` by-id, `office/activities`, `office/audit-logs` by-id) as the next security milestone — they are the highest-value remaining boundary work and are independent of A.9.
3. Track R4–R6 in the remediation queue; close R7 via the gitignore/noise decision.
4. Keep `ai/contracts` resolve/attach + `ai/core-write` `entity_id` write validation in scope for the same next milestone (R5).

---

## 13. Verdict

# **COMMIT READY WITH CONDITIONS**

**Why not plain COMMIT READY:** §7 surfaced two **pre-existing High-severity** cross-tenant read routes (`royalties` GET by-id, `office/activities` GET) plus a Medium (`office/audit-logs` by-id) that are **outside the A.9 change-set** but inside the product's multi-tenant surface. They do not block landing the A.9 commit (they neither introduce nor rely on A.9 code), but they must be **queued for immediate remediation (Condition 1)** before multi-tenant data onboarding, mirroring the A.8 precedent of "PASS WITH CONDITIONS" and A.9 Step 1's deferral verdict. Condition 2 (generated-artifact noise disposition) is an ops decision, not a security gate.

- All gates pass (lint / tsc / build / diff-check / A.8 suites / A.9 suite / identity).
- A.8 regression guarantee: intact (protection files untouched; suites green).
- F1–F5 correctness: verified by read audit + 47 test assertions; no Critical/High in-scope finding.
- HTTP tests adequately prove boundaries (T1–T27 contract matrix; deviations intentional and documented).
- No sensitive/unrelated files in the change-set; no schema/migrations/.env changes; no production action taken or implied.

**Conditions (do not block the commit; gate closure):**
1. File and execute remediation for R1/R2/R3 in the next security milestone; keep R4–R6 tracked; before any multi-tenant catalog/network/legacy-IAM data is introduced.
2. Decide disposition of `tsconfig.tsbuildinfo` / `next-env.d.ts` generated-artifact noise (gitignore or accept). No code change made in this step.

No source/tests/docs/db/Neon/Vercel/env changes were made during this review; no commit, push, deploy, migrate, seed, reconcile, or credential reset was performed.