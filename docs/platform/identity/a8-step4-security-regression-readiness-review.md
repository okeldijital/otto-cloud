# A.8 Step 4 — Security Regression & Production-Readiness Review

**Mode:** Strictly read-only  
**Date:** 2026-08-12 (re-validated same day after context continuation)  
**Repository:** otto-cloud (okeldijital/otto-cloud local)  
**Implementation under review:** Working tree on top of `3cbcf03fcf18ec4e7ff6b54d8b471a2190ec8992` (A.8 Groups A+B uncommitted)

**Production systems:** not modified  
**Commits / deploys:** none  
**API surface counted:** **207** `app/api/**/route.ts` files

---

## A. Baseline

| Item | Value |
|------|--------|
| HEAD commit | `3cbcf03fcf18ec4e7ff6b54d8b471a2190ec8992` |
| Message | `feat(iam): deliver password-reset emails via Resend with log fallback` |
| Working tree | **Dirty** — A.8 Group A/B code + docs uncommitted (many `app/api/**`, `lib/auth/**`, `lib/platform/identity/**`, tests, reports) |
| Branch | `main` (tracks `origin/main`) |
| Node / npm | v24.17.0 / 11.13.0 |

---

## B. Validation results

### Lint

| Command | Result |
|---------|--------|
| `npm run lint` (`next lint`) | **FAIL / misconfigured** — Next reports `Invalid project directory .../lint` (script/CLI arg issue). Exit code **1**. **Lint did not meaningfully validate the tree**. |

**Assessment:** Lint is **not a reliable gate** in this repository configuration.

### Typecheck

| Command | Result |
|---------|--------|
| `npm run typecheck` | **Script does not exist** |
| `npx tsc --noEmit` | **FAIL** (exit 1) — TypeScript errors in Group B code |

Exact non-secret errors (re-confirmed):

1. `app/api/iam/users/route.ts` — `recordAudit` `user_id: number | undefined` not assignable to `number` (lines ~246, 263, 288, 323, 366).
2. `lib/auth/privilege-authorization.ts` — `is_superuser: boolean | null` vs `boolean`; `tenantId` not on `CurrentIdentityContext` (lines ~217, 230–231, 235).

**Assessment:** Typecheck **fails**. Blocks clean production build confidence even if `next build` might transpile some paths more loosely.

### Build

| Command | Result |
|---------|--------|
| `npm run build` | **Not fully re-run in this review** after tsc failure (tsc is sufficient to flag compile issues). Recommend build only after tsc is green. |

### A.8 regression tests (re-run)

| Suite | Result |
|-------|--------|
| `npm run test:a8-idor` | **13 passed, 0 failed** |
| `npm run test:a8-privilege` | **26 passed, 0 failed** |
| `npm run test:identity` | **All listed A.1–A.6 suites passed** (foundation through productization; exit 0) |

### Other tests

- Full `npm test` umbrella script: **not defined**.
- Domain tests exist as individual scripts; not all re-run (identity + A.8 security suites prioritized).
- `test:org-context` needs `DATABASE_URL` (not exercised against production).

### Security-relevant validation summary

| Gate | Status |
|------|--------|
| A.8 IDOR unit tests | PASS |
| A.8 privilege unit tests | PASS |
| Identity unit tests | PASS |
| TypeScript | **FAIL** |
| Lint | **Unreliable / broken config** |

---

## C. Group A verification (IDOR)

### Pattern confirmation

Canonical helpers exist and are used on claimed routes:

`lib/auth/resource-authorization.ts`  
→ `requireOrgAuth` → `require*InOrg` / org-scope where → mutation

| Finding | Claimed route | Verified in code? | Notes |
|---------|---------------|-------------------|--------|
| A8-003 releases | `app/api/releases/route.ts` | **Yes** | PUT/DELETE use `requireOrgAuth` + `requireReleaseInOrg` |
| A8-004 artists | `app/api/artists/route.ts` | **Yes** | PUT/DELETE use `requireArtistInOrg` |
| A8-005 works | `app/api/works/route.ts` | **Yes** | PUT/DELETE use `requireWorkInOrg` |
| A8-006 contracts | `app/api/contracts/route.ts` | **Yes** | PUT/DELETE use `requireContractInOrg` |
| A8-007 tracks | `app/api/tracks/route.ts` | **Yes** | Full CRUD via `trackOrgScopeWhere` / `requireTrackInOrg`; stamps `tenant_id` |
| A8-008 royalties | `app/api/royalties/route.ts` | **Yes** | Org-scoped filters + `requireRoyaltyInOrg`; create stamps `tenant_id` |
| A8-009 v1 royalties | `app/api/v1/royalties/route.ts` | **Yes** | Filters by API-key `orgId` |
| A8-010 files | `app/api/files/route.ts` | **Yes** | `path` rejected (`PATH_ACCESS_DISABLED`); attachment id + org |
| A8-018 office | tasks/events/documents/status-quo | **Yes** (mutations) | Org-bound helpers |
| A8-019 workspace children | release-workspace/* | **Yes** (sampled deliverables/milestones/approvals/publications/videos/marketing) | |
| A8-020 playlists | `app/api/playlists/route.ts` | **Yes** | `tenant_id` / `created_by` scope |
| A8-032 v1 catalog | tracks/labels | **Yes** | tracks scoped; labels empty fail-closed |

### Bypass / residual IDOR (still open)

| ID | Severity | Area | Issue |
|----|----------|------|--------|
| **R4-001** | **High** | Global catalogs | `labels`, `publishers`, `pros` still session + `findUnique({ id })` mutate without ownership columns (Group A intentionally incomplete) |
| **R4-002** | **High** | Isolation | `export` still uses `parseInt(orgUuid) \|\| 1` (A8-017) — collapses org scope |
| **R4-003** | **High** | Isolation | Same `parseInt(...)\|\|1` in `network/organizations`, `network/health`, multiple `ai/*` routes |
| **R4-004** | **High** | Files | `storage/upload`, `releases/upload` still trust client entity/release ids without full ownership proof (A8-022 residual) |
| **R4-005** | **Medium** | Dual workspace stacks | `app/api/workspace/**` and `workspaces/**` use org check after `findUnique` (OK if always compared); more fragile than atomic `findFirst({id, organization_id})` |
| **R4-006** | **Medium** | Tracks/royalties legacy data | Unlinked rows without `tenant_id`/release/work may become invisible (fail-closed) or remain weakly linked — operational data quality concern |

### Alternate routes

No evidence that unpatched twin routes re-open **artists/releases/works/contracts** CRUD without org binding on the primary mutation paths reviewed. Global catalogs (`labels`/`publishers`/`pros`) remain alternate broad-mutate surfaces.

---

## D. Group B verification (privilege escalation)

### Helpers present

- `lib/auth/privilege-authorization.ts` — platform vs org, role ranks, superuser gate, invite normalization, legacy user org bind  
- `lib/platform/identity/middleware/assert-org-scope.ts` — path org binding  

### Finding verification

| Check | Result |
|-------|--------|
| 1. Org owner cannot grant platform authority (code path) | **PASS** — owner template excludes `platform.admin`; grants of `super_admin`/`platform_admin` denied |
| 2. Org admin cannot grant platform authority | **PASS** (code) |
| 3. Members cannot grant admin roles | **PASS** (rank rules in unit tests) |
| 4. Client role cannot bypass rank | **PASS** (`assertCanGrantOrgRole` / `normalizeLegacyInviteRole`) |
| 5. Client `is_superuser` cannot elevate | **PASS** on admin/users & iam/users (403) |
| 6. Org admin cannot admin other org users | **PASS** on hardened routes (org bind / 404) |
| 7. Org admin cannot reset password outside org | **PASS** on `/api/iam/users` |
| 8. Path org id cannot select other org without platform auth | **PASS** via `assertAdminOrganizationPath` |
| 9. Invitation role cannot become owner/platform | **PASS** (grant rules + invite normalize) |
| 10. Legacy IAM cannot fully bypass | **PASS with residual** — hardened, not removed; still dual-stack |

### Important nuance (A8-016 runtime vs seed)

**Code** no longer treats org `platform.admin` as `isSuperAdmin`.

**However** `isPlatformAuthority()` still returns true if the identity’s **resolved permission list** includes `platform.admin`.

`seedOrgSystemRoles` is **idempotent add-only** (`createMany` + `skipDuplicates`) and **does not remove** existing `iam_role_permissions` rows.

Therefore for an **existing** production org whose owner role was seeded under catalog v5 (ALL perms including `platform.admin`):

- Deploying code alone **does not strip** `platform.admin` from the owner role in the database.  
- That owner may still satisfy `isPlatformAuthority()` via **permission list**, not via `isSuperAdmin` short-circuit.

This is the primary **operational deployment condition** (see §E and §K).

---

## E. Role / permission seed drift

| Question | Answer |
|----------|--------|
| Does existing production IAM retain old owner permission set? | **Yes, until reconciliation** — seed only upserts role names and **adds** missing role_permissions; it never deletes surplus links such as `platform.admin` on owner. |
| Is `platform.admin` still assigned to production owner? | **Likely yes** if bootstrap ran under catalog v5 / ALL. **Not verified by live production query in this review** (no production writes; production permission rows not re-inspected here). |
| Idempotent safe reconciliation mechanism? | **Partial** — re-running `seedOrgSystemRoles` is safe but **insufficient** to remove `platform.admin` from owner. No dedicated “sync role template = exact set” job found. |
| Deploy code alone leave production insecure? | **Risk remains** for A8-016 until owner role permissions are reconciled **or** `isPlatformAuthority` is further tightened to ignore org-granted `platform.admin`. Current code still honors `platform.admin` in permission list. |
| Migration required? | **No schema migration** required for Groups A/B code. |
| One-time IAM reconciliation required? | **Yes, recommended before trusting multi-org production** — remove `platform.admin` from org-scoped roles (especially `owner`) without touching business tables. |
| Can reconciliation avoid business data? | **Yes** — only `iam_role_permissions` / role seed rows. |

**Catalog version in code:** `PERMISSION_CATALOG_VERSION = 6` (was 5). Version is cache-invalidation oriented; not an automatic DB migrator.

---

## F. A8-001 / A8-002 diagnostics

| Endpoint | Auth | Exposure | Production recommendation |
|----------|------|----------|---------------------------|
| `GET /api/test-db` | **None** | DB connectivity + **`user_count`**; error messages | **SHOULD-NOT-BE-PUBLIC** — **deployment blocker** if internet-facing |
| `GET /api/platform/health/identity` | **None** | IAM identity/session/org **counts**, platform version, policy details | **SHOULD-NOT-BE-PUBLIC** — **deployment blocker** if internet-facing |
| `GET /api/health` | None | `ok` + `database: connected/error` | Acceptable liveness if minimal; lower risk |

No alternate equivalent found that fully replaces these for public recon; metrics identity route requires auth (better).

---

## G. Legacy IAM assessment

| Surface | Classification |
|---------|----------------|
| Platform IAM `/api/auth/*` | **SAFE** (primary) |
| `/api/iam/users` (hardened) | **AUTHENTICATED BUT LEGACY** / residual dual-stack |
| `/api/iam/roles`, `/api/iam/teams` | **SECURITY RISK** (still weaker isolation; not fully Group B scoped) |
| `/api/organizations/members` (legacy tenant_users) | **SECURITY RISK** residual (A8-024 class) — under-permissioned member admin |
| `users.is_superuser` | **AUTHENTICATED BUT LEGACY** — still used as platform flag (intentional bridge) |
| NextAuth package / routes | **DEAD/UNUSED** (removed; cutover tests confirm) |
| `lib/auth/session` getServerSession | **SAFE** (IAM-backed alias) |

---

## H. API-key / v1 assessment

| Endpoint | Status |
|----------|--------|
| `withApiAuth` helper | Binds org from key |
| `v1/royalties` | **Fixed** — org-scoped filters (A8-009) |
| `v1/catalog` artists/releases/works | Org-filtered |
| `v1/catalog` tracks | **Fixed** — org join/tenant scope |
| `v1/catalog` labels | Fail-closed empty (schema has no org) |
| Other v1 gaps | Low surface; continue monitoring for unscoped entities |

---

## I. Files / export assessment

| Surface | Status |
|---------|--------|
| `/api/files` path param | **Blocked** in code |
| Attachment download `/api/storage/download/[id]` | Org check present (pre-existing) |
| Export | **Still broken isolation** (`parseInt(uuid)||1`) — **R4-002 / A8-017** |
| Storage upload entity binding | Residual risk (R4-004) |

---

## J. Remaining findings (deployment-relevant)

| ID | Severity | Affected | Exploit condition | Current protection | Remediation | Blocks deploy? |
|----|----------|----------|-------------------|--------------------|-------------|----------------|
| **R4-TS-001** | High (ops) | `iam/users`, `privilege-authorization.ts` | N/A — compile errors | Tests run via tsx | Fix TypeScript types | **Yes** (build confidence) |
| **R4-001** | High | labels/publishers/pros APIs | Authenticated user mutates global catalog | Session only | Org-scope or admin-only write / schema | **Conditional** (multi-tenant trust) |
| **R4-002** | High | `/api/export` | Any org exports as org `1` | requireOrganization but wrong id | Use UUID/legacyInt helpers | **Yes** if export enabled in prod |
| **R4-003** | High | `ai/*`, network health/orgs | UUID parse collapse to 1 | Mixed | Same as export | **Yes** if those routes used multi-tenant |
| **A8-001** | Critical | `/api/test-db` | Unauthenticated | None | Auth-gate or disable in prod | **Yes** |
| **A8-002** | Critical | `/api/platform/health/identity` | Unauthenticated | None | Auth-gate or strip counts | **Yes** |
| **R4-SEED-001** | Critical* | Production owner role perms | Owner retains `platform.admin` in DB after deploy | Code partially mitigates isSuperAdmin | IAM reconciliation (delete surplus role_permissions) | **Yes** for multi-org trust |
| **R4-004** | High | storage/release upload | Attach to foreign entity ids | Partial session org | Entity ownership check | Conditional |
| **R4-024** | High | `/api/organizations/members` | Member self-admin | requireOrganization only | Require users.manage | Conditional |
| **R4-LINT-001** | Medium | `next lint` | N/A | Broken | Fix lint script | No (process) |
| **R4-TEST-001** | Medium | Test suite | Helper-level only | Unit tests pass | Add HTTP integration tests | No (quality) |

\*Critical in multi-organization production threat model; single-org empty catalog lowers immediate exploitability but does not remove the design defect if unreconciled.

---

## K. Deployment prerequisites

| Prerequisite | Required? |
|--------------|-----------|
| Fix TypeScript errors (R4-TS-001) | **Yes** before shipping this working tree |
| Commit A.8 A/B code | **Yes** (currently uncommitted) |
| Disable/gate A8-001/A8-002 diagnostics | **Yes** before public production exposure |
| Fix export / `parseInt\|\|1` isolation | **Yes** if multi-tenant or export/AI/network features used |
| IAM role reconciliation for owner − `platform.admin` | **Yes** before treating platform boundary as enforced on existing DB |
| Schema migrations | **No** for A.8 A/B alone |
| Business data migration | **No** |
| Vercel DATABASE_URL change | **No** (already aligned in prior A.7 work; not re-verified here) |
| HTTP-level multi-org tests | Recommended, not blocking if helper tests + recon done |

---

## L. Rollback considerations

| Layer | Rollback |
|-------|----------|
| Application code | Redeploy previous commit (pre-A.8 working tree) — straightforward if not yet in production |
| No schema migrations in A/B | No DB schema rollback needed |
| IAM seed version | Catalog version is code-side; DB role_permissions unchanged by deploy alone |
| If reconciliation is later applied | Reversible only by re-adding permissions (ops script); keep backups of `iam_role_permissions` before recon |

---

## M. Final verdict

# **PASS WITH CONDITIONS**

### Why not PASS

1. **TypeScript errors** in Group B code block clean compile confidence.  
2. **Public diagnostics** (A8-001/A8-002) remain critically exposed.  
3. **Seed drift**: existing DBs may still grant org owners `platform.admin`; deploy alone does not remove it; `isPlatformAuthority` still honors that permission.  
4. **Residual High isolation bugs**: export/`parseInt||1`, global catalogs (labels/publishers/pros), upload entity binding, some legacy org member routes.

### Why not BLOCKED

1. Group A core catalog IDOR remediations are **present in source** and unit-tested.  
2. Group B privilege controls are **present in source** and unit-tested.  
3. Identity platform tests pass.  
4. No evidence of production writes during A.8 implementation work in this review.  
5. Conditions are **actionable operational/code fixes**, not an unknown catastrophic failure of the A/B design.

### Conditions to reach deployable multi-tenant production

1. Fix tsc errors.  
2. Gate/remove public diagnostics.  
3. Reconcile IAM owner roles (remove `platform.admin` from org roles) **or** tighten `isPlatformAuthority` to ignore org-granted `platform.admin`.  
4. Fix `parseInt(uuid)||1` export/AI/network isolation.  
5. Decide policy for global catalogs (labels/publishers/pros).  
6. Commit and deploy only after the above.

---

## HTTP-level test coverage note

A.8 tests validate **helpers and policy functions**, not live Next.js route handlers with cookies/HTTP.  
Identity tests are service/unit level.  
**Gap:** no automated HTTP multi-org IDOR suite against running server.

---

## Safety attestation

This Step 4 review performed:

- local test execution  
- static code inspection  
- no production DB writes  
- no IAM writes  
- no migrations  
- no Vercel/Neon changes  
- no deployments  
- report file only as documentation deliverable  

**Stop.** Do not begin Group C or further remediation from this step.
