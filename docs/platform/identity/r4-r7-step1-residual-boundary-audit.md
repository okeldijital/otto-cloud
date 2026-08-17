# R4–R7 STEP 1 — RESIDUAL AUTHORIZATION BOUNDARY AUDIT

**Mode:** Strictly read-only. No source code, tests, Prisma schema, migrations, Neon, IAM, Vercel configuration, deployments, or Git history were modified. No commits, pushes, merges, deploys, seeds, reconciliation, password resets, or production-data changes were made. Nothing was remediated.

**Basis:** Audit of the remaining R4–R7 authorization / tenant-isolation findings following closure of A.8, A.9, and R1–R3.

---

## Executive Summary

Following the closure of A.8 (commit `76c038b`), A.9 (commit `2a2ecfd`), and R1–R3 (commit `911c483`), the residual R4–R7 deferred debt was re-audited at the exact committed baseline `911c483`.

The audit confirms that the **authoritative deferred R4–R7 inventory** is the one tracked in the A.9/R1–R3 acceptance reports:

| ID | Description | Recorded severity |
|----|-------------|-------------------|
| R4 | `iam/roles` POST global role-name existence pre-check (`roles.findUnique({ name })`) | Low |
| R5 | `ai/contracts` resolve + `ai/core-write` write registry rows with client-supplied `entity_id`s (no per-entity org probe) | Medium |
| R6 | Legacy `parseInt(...)||0/||null` fallback remnants | Low |
| R7 | Generated-artifact diff noise (`tsconfig.tsbuildinfo`, `next-env.d.ts`) | Info |

An earlier, distinct numbering (the R1–R3 milestone-assessment's internal R4–R7: `royalties_summary`/`activity_log` report scoping, `ai-audit` royalty-anomaly scoping, audit-logs 500-vs-403) **was in-scope for R1–R3 and is now closed** in `911c483`; it is not re-audited here beyond confirming closure.

**Findings disposition:**
- **R4** — confirmed present, Low, information-disclosure/existence-oracle class. The pre-check returns only `400 Role already exists` (boolean-only; the row is never returned). Not exploitable against production today (roles table empty). The global name-uniqueness itself is a schema-level constraint (`roles.name @unique`), not an authorization bypass.
- **R5** — confirmed present, Medium. `ai/contracts` resolve and `ai/core-write` propose write registry rows (runs/links/items) that carry client-supplied `entity_id` values without a per-entity org-ownership probe. Runs and reads are org-scoped; the risk is reference pollution / future-bypass if a downstream consumer trusts the stored `entity_id` without re-probing org ownership. Not exploitable today (AI tables empty; no consumer follows the stored ids across tenants).
- **R6** — one genuine remnant remains (`app/api/search/route.ts:105` `parseInt(orgId)||0`), fail-closed (falls to `0`, matches no row), pre-existing and A.9-accepted. `lib/audit.ts:25` and the `orgFilter` coercions in `lib/reports.ts`/`lib/ai-audit.ts` are non-auth-critical or fail-closed.
- **R7** — operational only; both artifacts are untracked/modified in the working tree.

**Equivalent/bypass surfaces:** No additional live route reads or mutates the affected AI registry rows outside the org-scoped paths; no global `findMany` on `roles` beyond the org-scoped GET; `reports`/`ai-audit` scoping (the old R1–R3 bypass surfaces) remains org-scoped. No client-controlled `organization_id`/`tenant_id` reaches authorization on the audited surfaces.

---

## 1. Baseline

| Item | Value |
|------|-------|
| Repo branch | `main` |
| Repo commit (HEAD) | `911c4831db26b34170e687776081a3e40c085270` (`feat(security): harden R1-R3 residual authorization boundaries`) |
| `origin/main` | `911c4831db26b34170e687776081a3e40c085270` — identical to HEAD |
| Parent commit | `2a2ecfdd7b44b61e90c2d50e40325d82b6cae512` (A.9 closure) |
| Deployed production commit | `911c483` per `r1-r3-step7-production-deployment-verification-report.md` (Git-based Vercel deploy of `main`; **Vercel deployment ID not independently verifiable** — no Vercel CLI/token in environment) |
| Working tree | Modified: `next-env.d.ts`, `tsconfig.tsbuildinfo`, `scripts/reconcile-iam-owner-platform-admin.ts`; untracked: R1–R3 step4–step8 + A.9 step6–step8 + production-access report docs. **None touch the audited routes.** |
| Staged files | None |
| Working tree vs last accepted R1–R3 state | Differs **only** by the documented pre-existing leftovers listed above (all classified below); no R4–R7 source changes. |

### Working-tree leftover classification

| Item | Classification |
|------|----------------|
| `docs/platform/identity/r1-r3-step*.md`, `a9-step6/7/8*.md`, `a9-final-acceptance-report.md`, production-access reports | R1–R3 uncommitted documentation (deliverables from prior milestone steps) |
| `next-env.d.ts`, `tsconfig.tsbuildinfo` | Generated artifacts (the R7 finding itself — regenerate on every build) |
| `scripts/reconcile-iam-owner-platform-admin.ts` | Pre-existing operational leftover (A.8 reconciliation tooling; diff enables `--apply`; not part of R4–R7) |
| — | No unrelated source changes |

**Baseline integrity:** `git rev-parse HEAD` == `git rev-parse origin/main` == `911c483`. No staged files. `git status` shows only the documented leftovers.

---

## 2. Audit scope

- **In scope (R4–R7):** `app/api/iam/roles/route.ts`, `app/api/ai/contracts/route.ts`, `app/api/ai/core-write/route.ts`, and every equivalent surface reaching the same resources: `app/api/ai/*` (route, analytics, audit, draft, release-integration, royalty), `app/api/search/route.ts`, `lib/reports.ts`, `lib/ai-audit.ts`, `lib/audit.ts`, plus the canonical helpers (`lib/auth/resource-authorization.ts`, `lib/auth/privilege-authorization.ts`, `lib/auth/organization-context.ts`) and the Prisma schema for affected tables.
- **Not re-audited (closed):** R1–R3 surfaces (royalties by-id/validate-splits, activities, audit-logs, reports/ai-audit scoping) — verified closed in `911c483` and covered by `test:r1-r3-http` (32 passed, re-run green this step).
- **Production inspection:** read-only; based on committed evidence from prior milestone reports. No live probes (see §Production Impact).

**Regression baseline re-run this step:** `test:r1-r3-http` 32/32, `test:a9-http` 47/47, `test:a8-http` 27/27 — all green at baseline `911c483`. `git diff --check` clean for tracked changes.

---

## 3. Finding Inventory (authoritative R4–R7)

| ID | Severity | Route/module | Original finding (from A.9/R1–R3 acceptance) | Current status at `911c483` |
|----|----------|--------------|----------------------------------------------|-----------------------------|
| R4 | Low | `app/api/iam/roles/route.ts` POST | Global role-name existence pre-check `roles.findUnique({ where: { name: body.name } })` — boolean oracle only, row never returned | **OPEN (unchanged)** — `route.ts:65`. Boolean-only; `400` on any name collision. Global name uniqueness is schema-level (`roles.name @unique`, `schema.prisma:1380`). |
| R5 | Medium | `app/api/ai/contracts/route.ts` (resolve) + `app/api/ai/core-write/route.ts` (propose) | Registry rows written with client-supplied `entity_id`s; no per-entity org probe before write | **OPEN (unchanged)** — `ai/contracts:65-89` (`resolve` creates `ai_contract_resolution_links` with `parseInt(link.entity_id)`); `ai/core-write:75-106` (`propose` writes `ai_core_write_proposal_runs`/`_items` with `parseInt(contract_id/release_id/contract_document_id)`). Runs/reads org-scoped; reference ids unvalidated. |
| R6 | Low | `app/api/search/route.ts:105`; `lib/audit.ts:25`; `lib/reports.ts:9-10`, `lib/ai-audit.ts:24-25` | Legacy `parseInt(...)||0` / `||null` fallback remnants | **PARTIALLY OPEN** — search `parseInt(orgId)||0` remains (fail-closed: `||0` matches no row); `lib/audit.ts` write-coercion remains (non-auth-critical); `orgFilter` coercions remain (fail-closed for UUID columns; causes the pre-existing 500 on `contracts` Int column in `ai/audit` — Observation B). |
| R7 | Info | `tsconfig.tsbuildinfo`, `next-env.d.ts` | Generated-artifact diff noise on every `npm run build` | **OPEN (operational)** — both modified/untracked in working tree. |

---

## 4. Reconstructed authorization model (reused, not re-created)

The audit uses only the established A.8/A.9/R1–R3 primitives. No second authorization framework was introduced or designed.

| Helper | Location | Applied on R4–R7 surfaces |
|--------|----------|---------------------------|
| `requireOrganization()` / `requireOrgAuth()` | `lib/auth/organization-context.ts:460` / `resource-authorization.ts:42` | All audited routes resolve server-side org context (never from client body/query) |
| `requirePermission("roles.manage")` | `lib/iam` | R4 POST/PUT/DELETE gate |
| `platformOf()` / `isPlatformAuthority()` / `platformAuthorityFromSession()` | `privilege-authorization.ts:64,310,325` | R4 platform-vs-org branch; global catalog mutations |
| `requireLegacyIntOrgId(ctx)` | `resource-authorization.ts:50` | R6 (contracts Int column); AI routes (`core-write`, `royalty`, `release-integration`, `analytics`) |
| `requirePositiveIntId(raw,label)` | `resource-authorization.ts:66` | R6-family by-id hardening (already used on audit-logs/reports; NOT yet on `search/contracts`) |
| `requireActorUserId(ctx)` | `resource-authorization.ts:94` | AI write paths stamp server-derived actor (core-write/royalty/release-integration); **NOT yet on `ai/contracts` (still `parseInt(session.user.id)||1`)** |
| `trackOrgScopeWhere` / `royaltyOrgScopeWhere` | `resource-authorization.ts:286,314` | AI analytics/audit scoping (already correct) |
| `requireContractInOrg` / `requireReleaseInOrg` / `requireAIContractDocumentInOrg` | `resource-authorization.ts:238,221,259` | **Existing but NOT called** on the R5 write paths — this is the missing primitive for R5 |
| `resourceAuthErrorResponse` | `resource-authorization.ts:31` | Consistent 401/403/404 mapping |

**Conclusion:** R4/R5/R6 can each be remediated with existing helpers; **no new primitive is strictly required**. R5's smallest fix is invoking `requireContractInOrg`/`requireReleaseInOrg`/`requireAIContractDocumentInOrg` (all already implemented) before persisting client-supplied reference ids, mirroring what `ai/royalty simulate` and `ai/release-integration plan` already do. R4's existence pre-check should become org-scoped (with platform cross-org allowance). R6's search remnant should use `requireLegacyIntOrgId`-based predicate or `requireContractInOrg`-style `findFirst`.

---

## 5. Detailed Findings

### F-R4 — `iam/roles` POST global role-name existence pre-check (Low)

- **Affected route:** `app/api/iam/roles/route.ts` POST (line 65), `roles.findUnique({ where: { name: body.name } })`.
- **Affected model/table:** `roles` (`schema.prisma:1378`), `roles.name @unique` global (line 1380).
- **Source evidence:** `route.ts:65-66`:
  ```ts
  const existing = await prisma.roles.findUnique({ where: { name: body.name } });
  if (existing) return NextResponse.json({ error: "Role already exists" }, { status: 400 });
  ```
- **Authorization analysis:**
  - Auth: `requirePermission("roles.manage")` (line 48) — org-level permission.
  - Org context source: server-derived. `organization_id` is session-derived for org actors; only platform authority may supply `body.organization_id` (lines 57-60, A.9 F3 logic — verified correct).
  - The pre-check is **global**: it queries across all orgs and system roles. This is a **boolean existence oracle** for role names. The returned row is never exposed (only `400`).
  - The global `@unique` on `roles.name` means tenant B cannot reuse a role name already taken by tenant A — a schema-level cross-tenant naming conflict (documented in A.9 step-3 report §7.2). This is functional/schema, not an authorization bypass.
- **Exploit path:** Org-A member with `roles.manage` sends `POST /api/iam/roles` with a candidate name; `400 Role already exists` reveals the name is used anywhere in the platform (any org or system role). Enumerating candidate names yields a boolean membership oracle over a non-sensitive dimension (role names).
- **Information exposed:** Existence of role names (boolean only). No role rows, permissions, members, or org identity returned.
- **Current production impact:** Roles table empty in production (A.8 Step 9: `roles` empty). Oracle yields nothing today. Not exploitable.
- **Existing helper:** `requireOrganization` + `platformOf` already branch the create org; the pre-check itself needs an org-scoped variant (`findFirst({ where: { name, OR: [{organization_id: orgId},{organization_id: null}] } })` for org actors; global for platform).
- **Recommended remediation:** Scope the existence pre-check to the actor's org (plus system roles) for org actors; keep global check only for platform authority. A 404/`OK` semantics change is not required — a scoped pre-check is sufficient. Schema change is NOT required for the oracle; the global `@unique` may remain as an explicit design decision.
- **HTTP tests required:** T-R4-1 (same-org name in use → 400), T-R4-2 (foreign-org-only name → org actor 200-create / platform 400), T-R4-3 (unauthenticated → 401), T-R4-4 (malformed body → 400).

### F-R5 — `ai/contracts` resolve + `ai/core-write` propose: client-supplied `entity_id` registry writes (Medium)

- **Affected routes:**
  - `app/api/ai/contracts/route.ts` POST `action=resolve` (lines 65-89): validates the run is org-scoped (`findFirst({ id: parseInt(run_id), organization_id: orgId })`, 404 foreign) then bulk-creates `ai_contract_resolution_links` with client-supplied `entity_type` / `entity_id: parseInt(link.entity_id)`, `action`, `confidence`.
  - `app/api/ai/core-write/route.ts` POST `action=propose` (lines 75-106): creates `ai_core_write_proposal_runs` + nested `ai_core_write_proposal_items` with client-supplied `contract_id` / `release_id` / `contract_document_id` (`parseInt`), `entity_id: parseInt(contract_id)`, `patch_json`.
  - Equivalent sibling: `app/api/ai/release-integration/route.ts` POST `action=attach` (lines 133-160) — same pattern (client `entity_id` on `ai_release_integration_links`). (`plan` is correctly hardened with `requireReleaseInOrg`/`requireContractInOrg`.)
- **Affected models/tables:** `ai_contract_resolution_runs`/`_links` (`schema.prisma:258-291`), `ai_core_write_proposal_runs`/`_items` (`:337-387`), `ai_release_integration_runs`/`_links` (`:402-447`). All carry `organization_id` (Int or UUID) with server-set values.
- **Source evidence:** `ai/contracts/route.ts:74-88`; `ai/core-write/route.ts:79-104`; `ai/release-integration/route.ts:142-158`.
- **Authorization analysis:**
  - Auth: `getServerSession` + `requireOrganization` (server-derived org).
  - Run resolution is org-bound (`findFirst` with `organization_id`; foreign run → 404). **The run/registry rows themselves are org-scoped.**
  - **Gap:** the *referenced* `entity_id` values are accepted from the client and persisted **without** a per-entity org-ownership probe. A caller can attach a link / proposal item referencing an entity id owned by another org (e.g., a foreign artist/contract/release). This is reference pollution; the A.9 step-3 report frames it as "a per-entity org probe before write would be the next hardening step."
  - No downstream consumer currently resolves the stored `entity_id` into foreign data: the only reads are org-scoped run reads (`GET extract`/`proposals`), and no lib/service joins these ids to catalog tables. So today this is a **write-path integrity / latent bypass** risk, not a live cross-tenant read/write.
  - `ai/core-write apply` (lines 108-131) only creates an `ai_core_write_apply_events` row; it does not mutate the referenced contract. So no cross-org mutation occurs today.
- **Exploit path:** Org-A user with an authenticated session calls `resolve`/`propose`/`attach` supplying an `entity_id` belonging to Org B. The registry row is created under Org A (no cross-org data touched today). If any future feature (AI tooling, dashboard, report) reads `ai_*_links.entity_id` and fetches the referenced record **without** re-probing org ownership, that becomes a cross-tenant read/write. The correct existing primitives (`requireContractInOrg`, `requireReleaseInOrg`, `requireArtistInOrg`, `requireAIContractDocumentInOrg`) are the guard that must be wired at write time.
- **Information exposed:** None today (registry rows are org-scoped; ids are opaque). Latent risk only.
- **Current production impact:** AI registry tables empty in production (rehearsal baseline: all `ai_*` at 0; production catalog empty). Not exploitable today.
- **Existing helper:** `requireContractInOrg`/`requireReleaseInOrg`/`requireAIContractDocumentInOrg`/`requirePositiveIntId`/`requireActorUserId` — all exist and are already used by the sibling `plan`/`simulate` paths.
- **Recommended remediation:** Before persisting each link/item reference, resolve the referenced entity via the existing `require*InOrg` helper for its `entity_type` (404 foreign). For `entity_id: null` / optional refs, allow null but reject non-null ids that fail org resolution. Also replace `parseInt(session.user.id)||1` in `ai/contracts` with `requireActorUserId(ctx)` for the `user_id` stamp.
- **HTTP tests required:** T-R5-1 (resolve with foreign `entity_id` → 404), T-R5-2 (resolve with own entity → 201), T-R5-3 (propose with foreign `contract_id` → 404), T-R5-4 (attach with foreign `entity_id` → 404), T-R5-5 (unauthenticated → 401), T-R5-6 (foreign `run_id` → 404).

### F-R6 — legacy `parseInt(...)||0` / `||null` fallback remnants (Low)

- **Affected routes:** `app/api/search/route.ts:105` (contracts filter); `lib/audit.ts:25` (audit-write coercion, non-auth-critical); `lib/reports.ts:9-10` + `lib/ai-audit.ts:24-25` (`orgFilter` coercion — legacy-compat; fail-closed for UUID columns).
- **Analysis:**
  - `search/route.ts:105` `organization_id: parseInt(orgId) || 0` — `ctx.organizationId` is a UUID; `parseInt` of a letter-leading UUID → `NaN` → `|| 0` → `0`. A `0` org id matches no contracts → **fail-closed** (empty result, no cross-tenant leak). Digit-leading UUIDs produce a truncated integer that also will not match a real Int org id in this codebase (Int org scope is `requireLegacyIntOrgId`/`LEGACY_INT_ORG_ID`). Pre-existing, A.9-accepted (r1-r3-step8 §13 confirms "fail-closed"). Still non-ideal: contracts search is effectively dead. Remediation: use a `requireLegacyIntOrgId(ctx)`-based predicate or a `requireContractInOrg`-style `findFirst`, matching the canonical model.
  - `lib/audit.ts:25` `parseInt(entry.organization_id) || null` — write-side coercion of an audit stamp; if it becomes `null` the row simply loses the Int org column (fail-closed for scope). `getAuditLogs` (`lib/audit.ts:35`) is **dead code** (no callers; the live audit-logs route uses `requireAuditLogInOrg`). Non-auth-critical.
  - `lib/reports.ts:9` / `lib/ai-audit.ts:24` `orgFilter(orgId) = { organization_id: Number(orgId) || orgId }` — legacy-compat coercion used against `releases`/`works`/`artists` (UUID columns, correct) and `contracts` (Int column → passes UUID string → `PrismaClientValidationError` → **500, fail-closed**). This is the root cause of the pre-existing **Observation B** `GET /api/ai/audit` → 500 (documented in r1-r3-step8 §12/§13). It fails closed and predates R1–R3.
  - `ai/contracts/route.ts:47` `parseInt((session.user as any).id) || 1` — user-id stamp fallback; same R6 family. Other routes with `||1/||0` user-id fallbacks (`ai/route.ts:82`, `ai/draft:16`, office routes, `api-keys:48`, `notifications:37/124`, `contracts:176`) are attribution-only (not authorization); org scope is still server-derived. Flagged as R6-family non-critical.
- **Exploit path:** None reachable. Every remnant either falls to `0`/`null`/`NaN` (no row matches) or throws a fail-closed 500. No cross-tenant read, no existence oracle, no global query collapse remains on the audited surfaces (the prior audit-logs `parseInt(UUID)` → global-list collapse was closed by R1–R3 and is asserted by `test:r1-r3-http`).
- **Current production impact:** None (fail-closed by construction).
- **Recommended remediation:** Replace `search/contracts` filter with the canonical Int-scope helper; remove/neutralize dead `getAuditLogs`; document the `orgFilter` Int/UUID coercion (or gate `checkContracts` to fail-closed 404 instead of 500). Low priority.
- **HTTP tests required:** T-R6-1 (search contracts with letter-leading org UUID → 200 empty, no leak), T-R6-2 (search contracts with digit-leading org UUID → 200 empty/no cross-org rows), T-R6-3 (audit-logs list parse-bug regression — both UUID shapes — already covered by `test:r1-r3-http`, confirm retained).

### F-R7 — generated-artifact diff noise (Info / operational)

- `tsconfig.tsbuildinfo` + `next-env.d.ts` are generated on every build; both appear modified/untracked in the working tree. No security impact. Recommended: `gitignore` `tsconfig.tsbuildinfo` and/or accept the noise; `next-env.d.ts` should be committed consistently.
- Not an authorization finding.

---

## 6. Equivalent Surfaces

| Primary finding | Equivalent surfaces searched | Result |
|-----------------|------------------------------|--------|
| R4 (`iam/roles`) | `/api/iam/roles` GET (org-scoped for non-platform, all for platform); `/api/iam/teams`; `/api/organizations/members`; `/api/iam/users` assign-role | **No weaker path.** Roles GET is org-scoped (`route.ts:25-26`); `iam/users` `roles.findUnique` is org-checked (`route.ts:235-245`); teams use org-compound keys. No other route lists all roles for org actors. |
| R5 (`ai/contracts`/`ai/core-write`) | `ai/route.ts` (sessions/messages), `ai/analytics`, `ai/audit`, `ai/draft`, `ai/royalty`, `ai/release-integration`, `export` (`ai_*`), `search` | **No read bypass.** All `ai_*` reads are `organization_id`-scoped; `ai/royalty simulate` and `ai/release-integration plan` already org-probe their references (the model for R5's fix). `ai/analytics` counts are org-scoped (A.9 F4). No global `ai_*` read exists. |
| R6 (parseInt remnants) | `/api/search` (all sections), `/api/export`, `/api/office/audit-logs` list | **No live global collapse.** Search sections are org-scoped; contracts section fails to `0`; export uses `requireLegacyIntOrgId`/global-ref classification (correct); audit-logs list is `requireLegacyIntOrgId`+tenant UUID (R1–R3 closed). |
| R7 (artifacts) | `next-env.d.ts`, `tsconfig.tsbuildinfo` in working tree | Present; operational only. |

**Shared-library/service bypass check:** `lib/reports.ts` (royalties_summary/activity_log), `lib/ai-audit.ts` (royalty anomalies) were the historical bypass surfaces (old R4–R7 numbering); they are now org-scoped (`royaltyOrgScopeWhere`/`activityOrgScopeWhere`/`trackOrgScopeWhere`) and covered by `test:r1-r3-http`. No service reads the R5 registry rows globally.

---

## 7. Client-controlled organization context

Searched the full audited surface for `organization_id` / `tenant_id` / `orgId` / `tenantId` from `req.body`, `request.json()`, `searchParams`, `params`, headers, cookies:

- `iam/roles` POST `body.organization_id` — **authorized platform override only** (`platformOf(user)` gate, `route.ts:57-60`); org actors are session-derived. Correct (A.9 F3).
- `search/route.ts` — org from `ctx`; `parseInt(orgId)||0` is a **server-derived** value coerced for the Int contracts column (not client-controlled).
- `ai/contracts` / `ai/core-write` — org from `ctx`; client supplies only run/resource **ids**, which are org-resolved before reads/writes on the run (R5 gap is per-entity reference ids, not org scope).
- No route on the audited surface derives authorization from a client-supplied `organization_id`/`tenant_id`.

**Verdict:** No unsafe client-controlled org authority on R4–R7 surfaces.

---

## 8. Identifier handling

- `parseInt(...) || 1` / `|| 0` / `|| null` searches (`parseInt.*\|\|`, `Number.*\|\|`, `organization_id.*\|\|`, `tenant_id.*\|\|`): only remaining matches are the R6-family items listed above (all fail-closed or attribution-only). No `|| 1`/`|| 0` org-scope collapse remains on any audited authorization path (the historical `export parseInt(uuid)||1` and `audit-logs ||null` were closed).
- Malformed ids on audited routes: by-id branches on `ai/contracts`/`core-write`/`royalty`/`analytics` use bare `parseInt` (→ `NaN` → Prisma error → 500 fail-closed) rather than `requirePositiveIntId`; this is a fail-closed defect class (R6-family), not a cross-tenant vector, because the id is always AND-ed with the server org predicate on the run/first lookup.
- No malformed identifier can: become another valid org, remove an org predicate, cause a global query, or change authorization semantics on the audited surface.

---

## 9. Global vs tenant-owned data classification

| Model/table | Classification | Evidence |
|-------------|----------------|----------|
| `roles` | **Platform-owned / global reference** (system roles) + **tenant-owned** (org roles). GET is org-scoped for non-platform; mutations org-bound; global name uniqueness is schema-level. | `roles.name @unique`; GET branch at `route.ts:25-26` |
| `ai_contract_resolution_runs/links`, `ai_core_write_proposal_runs/items`, `ai_release_integration_runs/links`, `ai_royalty_simulation_runs`, `ai_sessions`, `ai_messages`, `ai_contract_drafts`, `ai_contract_documents` | **Tenant-owned** | `organization_id` column on every row; all reads org-scoped |
| `labels`, `publishers`, `pros` | **Global reference data** (intentional) | Reads authenticated; mutations require platform authority (A.8 R4-001 accepted design) |
| `contracts`, `artists`, `releases`, `works`, `tracks`, `playlists`, office entities | **Tenant-owned** | Org-scoped reads/mutations throughout |
| `organizations`, `individuals` (network) | **Tenant-owned** (legacy INT org scope) | A.9 F1 org-scoped reads |
| `permissions` | **Global reference** | Authenticated read of global catalog (A.9 correct) |
| Report/audit aggregates | **Tenant-owned** | `royaltyOrgScopeWhere`/`activityOrgScopeWhere` (R1–R3) |

No intentional-global data is being mis-scoped; no tenant-owned data is globally readable on the audited surfaces.

---

## 10. Mutations audit (R4–R7)

- **R4 mutations** (POST/PUT/DELETE `/api/iam/roles`): authenticated (`roles.manage`) + org-bound for org actors (PUT/DELETE use `findFirst({ id, organization_id })` → 404 foreign; `is_system` protected). Platform may cross-org via explicit platform authority. **No owner→platform elevation via payload** (client `is_superuser`/`permissions` are rejected; `platformOf` derives from session roles only).
- **R5 mutations** (POST `ai/contracts resolve`, `ai/core-write propose/apply`, `ai/release-integration attach`): authenticated + org-bound on the run row; reference ids unvalidated (the R5 gap). `apply` records an event without mutating the referenced entity. **No cross-org mutation occurs today.**
- Bulk operations: `Promise.all` link creates are bounded by the org-scoped run; `DELETE /api/reports` is org-bound (R1–R3). No bulk endpoint on the audited surface bypasses org scope.

---

## 11. Read paths and information leakage

- Foreign `run_id`/`id` on `ai/contracts`, `ai/core-write`, `ai/royalty`, `ai/release-integration` → **404 NOT_FOUND** (non-leaking).
- `iam/roles` GET foreign org → filtered out (org-scoped), not 404/403 distinction issue.
- R4 pre-check: `400 Role already exists` (boolean oracle, Low) — the only 4xx distinction that carries existence information, and it is confined to role names.
- No 500 vs 404 divergence leaks existence on the audited surface (except fail-closed 500s on malformed ids, which leak nothing).

---

## 12. Aggregate/count/search/export surfaces

- `ai/analytics` `overview`/`catalog` counts: org-scoped (`organization_id`/`trackOrgScopeWhere`) — A.9 F4 confirmed.
- `reports` definitions/runs/`[runId]/data`: org-scoped; re-runs pass `ctx` (R1–R3).
- `search`: all tenant sections org-scoped; contracts section fails-closed to `0`; global-reference tables (`labels`/`publishers`/`pros`) intentionally global (A.9-accepted).
- `export`: `requireLegacyIntOrgId` for INT entities; global-ref classification for labels/publishers/pros; org UUID for catalog.
- No aggregate returns cross-tenant counts.

---

## 13. Legacy / dual-stack surfaces

- **`/api/v1/*` (catalog, contracts, royalties):** API-key auth with `withApiAuth(orgId)` deriving org from the validated key row only; contracts v1 is org-scoped. Not weaker.
- **Legacy `iam/users` by-id read / `iam/audit`:** permission/org-gated (A.8/A.9); `iam/users` assign-role is org-checked on the role (`route.ts:235-245`).
- **`roles` table (legacy) vs `iam_roles` (IAM):** the `roles` table is the org-facing RBAC table used by `iam/roles`; system templates live in `iam_roles`. No weaker legacy path reaches `roles` globally.
- **`lib/audit.ts` `getAuditLogs`:** dead code (no callers) — legacy helper, no live exposure.
- **Conclusion:** No R4–R7 surface has a weaker legacy path. Documented, not remediated.

---

## 14. HTTP test-gap analysis

No existing suite covers the R4–R7 authorization contracts (verified: `test:a8-http`, `test:a9-http`, `test:r1-r3-http`, `test:a8-step5` do not reference `iam/roles` POST name pre-check, `ai/contracts` resolve, `ai/core-write` propose, or `search` contracts). Required contracts (to be added in the remediation step — **not created here**):

| Test ID | Route | Scenario | Expected result |
|---------|-------|----------|-----------------|
| T-R4-1 | POST `/api/iam/roles` | same-org role name already exists | 400 `Role already exists` |
| T-R4-2 | POST `/api/iam/roles` | role name exists only in a foreign org; org actor creates it | 201 (own-org create allowed) |
| T-R4-3 | POST `/api/iam/roles` | unauthenticated | 401 |
| T-R4-4 | POST `/api/iam/roles` | missing name / malformed body | 400 |
| T-R4-5 | POST `/api/iam/roles` | client-supplied `organization_id` by org actor (foreign) | org derived from session (201 in own org) |
| T-R4-6 | PUT/DELETE `/api/iam/roles` | foreign or non-existent role id | 404 (non-leaking) |
| T-R5-1 | POST `/api/ai/contracts?action=resolve` | `links[].entity_id` references a foreign-org entity | 404 (after fix) |
| T-R5-2 | POST `/api/ai/contracts?action=resolve` | `links[].entity_id` references own-org entity | 201 |
| T-R5-3 | POST `/api/ai/contracts?action=resolve` | foreign `run_id` | 404 |
| T-R5-4 | POST `/api/ai/core-write?action=propose` | foreign `contract_id` | 404 (after fix) |
| T-R5-5 | POST `/api/ai/core-write?action=propose` | own `contract_id` | 201 |
| T-R5-6 | POST `/api/ai/release-integration?action=attach` | foreign `entity_id` | 404 (after fix) |
| T-R5-7 | POST `/api/ai/*` audited actions | unauthenticated | 401 |
| T-R5-8 | POST `/api/ai/core-write?action=apply` | foreign `run_id` | 404 |
| T-R6-1 | GET `/api/search?q=...` | letter-leading org UUID; contracts section | 200, empty contracts (no cross-org rows) |
| T-R6-2 | GET `/api/search?q=...` | digit-leading org UUID; contracts section | 200, empty contracts (no cross-org rows) |
| T-R6-3 | GET `/api/office/audit-logs` list | parse-bug regression, both UUID shapes | org-scoped rows only (retain existing `test:r1-r3-http` coverage) |
| T-R6-4 | GET `/api/office/audit-logs?id=` | foreign id | 404 (retain) |

Coverage gaps to close in remediation: existence-oracle for R4 (cross-org role name), R5 foreign-reference rejection, R6 search contracts fail-closed behavior.

---

## 15. Production impact

**Evidence basis (read-only, no live probes):** committed evidence from A.8 Step 9, A.9 Step 8, R1–R3 Step 7/8 reports; rehearsal baseline snapshot. No direct DB access (`.env.production.local` sanitized), no `VERCEL_TOKEN`/`NEON_TOKEN`/`NEON_API_KEY`, no authenticated app session (logging in would write audit rows). No production credentials available → production statements below rely on prior-milestone evidence and are flagged accordingly. **No production evidence was fabricated.**

| Question | Determination |
|----------|---------------|
| Affected tables contain production data? | **Roles:** empty (A.8 Step 9). **AI registry tables:** empty (rehearsal baseline all `ai_*` = 0; production catalog empty). **search contracts:** contracts empty. |
| Affected organizations contain production data? | Single org (OTTO); catalog empty (0 artists/releases/tracks/works/contracts). |
| One or multiple organizations? | **One.** No second tenant exists in production. |
| Exploitable against actual production data? | **No.** R4 oracle needs role rows; R5 needs AI registry data and a downstream consumer; R6 is fail-closed. All absent. |
| Production empty in affected domain? | Yes (roles, AI registry, contracts). |

**Architectural exploitability vs current impact:** An empty production table does not make the R4/R5 boundaries safe for future onboarding. R5 in particular is a **write-side reference-validation gap** that becomes a cross-tenant vector the moment AI registry data is populated and any consumer trusts stored `entity_id`s; R4's global existence oracle becomes meaningful once org roles exist.

---

## 16. Risk classification & severity

| ID | Risk class | Severity | Production impact today |
|----|------------|----------|-------------------------|
| R4 | C (information disclosure — boolean existence oracle) + E component (schema global-uniqueness is intentional) | Low | None (roles empty) |
| R5 | B (platform-authority-adjacent write integrity) / latent A — write-side reference validation | Medium | None (AI registry empty; no consumer) |
| R6 | D (fail-closed defect) | Low | None |
| R7 | G (operational/test-doc) | Informational | None |

No Critical or High finding in the R4–R7 scope. No active exploitable tenant-isolation breach exists at this baseline.

---

## 17. Proposed remediation architecture (design only — no implementation code)

Reuse the existing A.8/A.9/R1–R3 model; no new authorization framework; no schema change required for any of R4–R7 (optional schema note for R4 only).

1. **R4** — Make the role-name existence pre-check org-scoped for org actors (existence within `{ name, organization_id: ctx.organizationId }` or system roles), while platform authority may keep the global check. Optionally re-document the global `roles.name @unique` as an intentional platform-level naming constraint.
2. **R5** — On `ai/contracts resolve`, `ai/core-write propose`, and `ai/release-integration attach`, before creating each registry link/item, resolve the client-supplied reference via the **existing** `require*InOrg` helper matching `entity_type` (`requireContractInOrg`, `requireReleaseInOrg`, `requireArtistInOrg`, `requireTrackInOrg`, `requireAIContractDocumentInOrg`, …); foreign or non-existent → 404. Optional nullable references remain valid only when the value is `null`. Replace `parseInt(session.user.id)||1` with `requireActorUserId(ctx)` on `ai/contracts`. This mirrors the already-correct `ai/royalty simulate` and `ai/release-integration plan` paths.
3. **R6** — Replace `app/api/search/route.ts:105` `parseInt(orgId)||0` with a `requireLegacyIntOrgId(ctx)`-based predicate (or `requireContractInOrg`-style scoped `findFirst`). Remove dead `lib/audit.ts getAuditLogs`. Gate `checkContracts`/`orgFilter` Int-coercion so `ai/audit` returns a clean fail-closed response (404/400) instead of 500.
4. **R7** — `gitignore` `tsconfig.tsbuildinfo`; keep `next-env.d.ts` committed consistently.
5. **Tests** — add the §14 HTTP contracts as a `test:r4-r7-http` suite following the A.8/A.9 404/403 status model.

**Smallest safe footprint:** R5 (2 routes + 1 sibling attach) and R4 (1 route) use only existing helpers; R6 is a 1-line + dead-code removal; R7 is a `.gitignore` entry. No schema or migration.

---

## 18. Scope exclusions (do NOT pull into R4–R7)

- **Observation B (`GET /api/ai/audit` → 500 via `checkContracts`)** — pre-existing, out-of-scope, fails closed; tracked in R1–R3 reports; related to R6 remediation but not an R4–R7 authorization finding itself.
- **`scripts/reconcile-iam-owner-platform-admin.ts` working-tree diff** — operational leftover; not authorization.
- **`iam/users` by-id read / `iam/audit`** — permission/org-gated; A.8/A.9 scope, not R4–R7.
- **`/api/v1/*` API-key surface** — org-scoped; not R4–R7.
- **`organizations/members` under-permissioned member-admin note (A.8 R4-024 class)** — pre-existing tracked debt from A.8; separate from R4–R7 numbering; out of scope here.
- **Working-tree docs/artifacts** — R1–R3 uncommitted documentation and generated artifacts; not security findings.

---

## 19. Final verdict

**`FINDINGS REQUIRE REMEDIATION`**

Rationale: R4 (global role-name existence pre-check) and R5 (client-supplied `entity_id` registry writes without per-entity org probe) are confirmed present at baseline `911c483`. Neither is exploitable against the current single-org, empty production footprint, and no live cross-tenant breach exists — but both are authorization-boundary defects that **must be remediated before any multi-tenant roles or AI registry data are onboarded**. R6/R7 are fail-closed/operational. Verdict is NOT "PASS": production emptiness does not make the R4/R5 boundaries safe for future onboarding.

**Stop — Step 1 complete.** Read-only audit only; no source, tests, schema, migrations, Neon, IAM, Vercel, or deployment changes were made; nothing was committed or pushed. **Step 2 (remediation) must not begin automatically.**
