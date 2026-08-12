# A.9 Step 2 — Residual Authorization Remediation Design

**Mode:** Read-only design. No source/database/Neon/Vercel/environment modifications. No commit, push, deploy, or migration.

**Inputs:** `docs/platform/identity/a9-step1-residual-boundary-audit.md`; Prisma schema (`prisma/schema.prisma`, 4341 lines); canonical A.8 helpers (`lib/auth/resource-authorization.ts`, `lib/auth/organization-context.ts`, `lib/auth/privilege-authorization.ts`, `lib/auth/migration-compat.ts`); route handlers under `app/api/{network,ai,iam,admin}/`.

---

## 1. Final Verdict

> **`IMPLEMENTATION READY`**

- No schema change is required. Every fix reuses existing ownership columns and the existing A.8 authorization helper family; no new columns, tables, or migrations.
- All changes are additive, org-scope/fail-closed conversions on existing read/write paths.
- Two entities (`platforms`, `network_relationships`) have **no ownership column**; they are classified **platform-authority-gated reference/relationship data**, which closes the cross-tenant write without inventing columns (documented in §4, not implemented).

---

## 2. Finding Inventory (from A.9 Step 1)

| ID | Finding | Primary routes | Severity (architectural) |
|----|---------|----------------|--------------------------|
| F1 | Network directory global read/write | `network/organizations`, `network/platforms`, `network/relationships`, `network/all`, `admin/orgs` | High (write) / Medium (read) |
| F2 | AI cross-tenant release/contract reads | `ai/royalty?action=simulate`, `ai/release-integration?action=plan` | High (read + oracle) |
| F3 | IAM/legacy catalog global reads + cross-org writes | `iam/roles`, `iam/teams?action=members`, `iam/permissions` | Medium–High |
| F4 | Global aggregate counts | `ai/analytics`, `network/health` | Low |
| F5 | Cross-tenant global search | `api/search` (tracks, playlists, organizations, individuals) | High (read) |

---

## 3. Root Cause

Shared root cause: **routes query multi-tenant tables without applying the session-derived organization context**, and several **mutation routes authenticate with `getServerSession()` only** (no `requireOrganization()`, no org predicate, no platform-authority gate). It is an *omission* of scoping, not an overridable context (client-supplied ids are never used to *narrow* the actor; they select un-scoped rows directly).

Secondary root cause: inconsistent treatment of "global" tables. `labels`/`publishers`/`pros` were correctly given **authenticated reads + platform-authority mutations** in A.8, but sibling tables (`platforms`, `network_relationships`, legacy `organizations`) received no equivalent treatment.

---

## 4. Ownership Model (established from schema)

| Table | Ownership columns | Intended model |
|-------|-------------------|----------------|
| `organizations` | `organization_id Int` owner; `id` (pk) | **Tenant-owned directory rows** → org-scoped reads/mutations by `organization_id = legacyIntOrgId`; platform sees all |
| `individuals` | `organization_id Int` | **Tenant-owned** → org-scoped (already scoped; only the junction `individual_organizations` needs same-org constraint) |
| `individual_organizations` | composite `(individual_id, organization_id)` no owner | Junction; constrain linked `organization_id` to actor's org on create |
| `platforms` | **none** | **Global reference data** (like `labels`) → authenticated read, platform-authority mutation |
| `network_relationships` | **none** | Polymorphic relationship graph, no boundary column → **platform-authority-only** read+write (no tenant-facing need in current UI; `network/all` is the actual surface) |
| `releases` | `organization_id UUID`, `tenant_id UUID?` | Tenant-owned → org-scoped resolution |
| `ai_contract_documents` | `organization_id Int`, `tenant_id UUID?` | Tenant-owned → org-scoped resolution |
| `tracks` | `tenant_id UUID?` + relations | Tenant-scoped via `trackOrgScopeWhere` |
| `playlists` | `tenant_id UUID?`, `created_by Int?` | Tenant/user-scoped via `playlistOrgScopeWhere` |
| `roles` | `organization_id UUID?`, `is_system` | **Org-visible roles** (`organization_id = ctx`); **system/global roles** (`is_system`, `organization_id null`) are platform-view |
| `permissions` | none (static catalog) | Static reference data — safe to expose to authenticated users |
| `teams` / `team_members` | `teams.organization_id UUID` | Org-owned → gate member reads/mutations by the team's org |
| `ai_royalty_simulation_runs`, `ai_release_integration_runs` | `organization_id Int` | Tenant-owned (used to scope reads; create already stamps org) |

**Conclusion:** the schema already distinguishes tenant-owned vs global; no column invention is necessary. `platforms` and `network_relationships` are the only true "no owner" cases and are handled as **platform-gated** (matching the `labels` precedent), not org-scoped.

---

## 5. F1 — Network boundary remediation

### Current behavior
- `GET/POST/PUT/DELETE /api/network/organizations`: GET returns all `organizations` (by id: also `individual_organizations` → `individuals`); PUT/DELETE authenticate **session-only**, mutate any row.
- `GET/POST/PUT/DELETE /api/network/platforms`: **session-only** all operations, global rows.
- `GET/POST/DELETE /api/network/relationships`: **session-only**, global.
- `GET /api/network/all`: **session-only**, merged global orgs+individuals+platforms.
- `GET/PUT /api/admin/orgs`: `requireAdmin` (org-admin level), global read + update by id.
- `network/individuals`: org-scoped (int org), but `body.organization_ids` creates `individual_organizations` junctions to arbitrary orgs.

### Desired behavior
| Route | Read | Write |
|-------|------|-------|
| `network/organizations` | Org-scoped: `where: { organization_id: intOrgId }`; by-id uses `findFirst({ id, organization_id: intOrgId })` | `requireOrganization()` + same-org bound (`findFirst`); platform authority may target any org |
| `network/platforms` | authenticated (global reference) | `platformAuthorityFromSession`/`requirePlatformAdmin` on POST/PUT/DELETE |
| `network/relationships` | platform-authority-only (global graph; no tenant column) | platform-authority-only (POST/DELETE) |
| `network/all` | org-scope `organizations`+`individuals` filters; `platforms` as global reference | read-only endpoint |
| `admin/orgs` | `requirePlatformAdmin` | `requirePlatformAdmin` + verify target row (still same-org blind otherwise) |
| `network/individuals` | keep org-scoped | reject `organization_ids` not in actor's legacy int org (or drop junction writes; the junction remains readable for linked rows) |

### Files likely to change
- `app/api/network/organizations/route.ts`
- `app/api/network/platforms/route.ts`
- `app/api/network/relationships/route.ts`
- `app/api/network/all/route.ts`
- `app/api/network/individuals/route.ts`
- `app/api/admin/orgs/route.ts`

### Helpers to reuse
- `requireOrgAuth()` / `requireOrganization()` → server-derived `OrganizationContext`
- `requireLegacyIntOrgId(ctx)` (fail-closed int owner id)
- `orgWhereInt(ctx)` / `orgWhere(ctx)` predicates
- `platformAuthorityFromSession(user)` / `requirePlatformAdmin()` / `isPlatformAuthority(...)`

---

## 6. F2 — AI cross-tenant reads

### Current behavior
- `ai/royalty?action=simulate`: `releases.findFirst({ where: { id } })` (unscoped) and `ai_contract_documents.findFirst({ where: { id } })` (unscoped) → metadata + existence oracle; results persisted into actor-org run.
- `ai/release-integration?action=plan`: `releases.findFirst({ where: { id: parseInt(release_id) } })` (unscoped) → artist/track names + oracle.

### Desired behavior
Resolve every release/contract artifact **before** producing output, via org-bound lookups that 404 on foreign rows:

- `release_id` → `requireReleaseInOrg(id, ctx)` (returns release incl. `artists`/`tracks`), i.e. `releases.findFirst({ where: { id, organization_id: ctx.organizationId, is_deleted: false } })`.
- `contract_document_id` → new `requireAIContractDocumentInOrg(id, ctx)` modeled on `requireContractInOrg`: `ai_contract_documents.findFirst({ where: { id, OR: [{ organization_id: intOrgId }, { tenant_id: ctx.organizationId }] } })`.

Same-organization behavior is preserved unchanged (own org ids resolve identically; only foreign ids now 404).

### Files likely to change
- `app/api/ai/royalty/route.ts`
- `app/api/ai/release-integration/route.ts`
- `lib/auth/resource-authorization.ts` (add `requireAIContractDocumentInOrg`) — single shared primitive (keeps the main org predicates in one module)

### Helpers to reuse
- `requireReleaseInOrg`, `requireContractInOrg`, `requireLegacyIntOrgId`, `notFound` (404 `NOT_FOUND`), `requirePositiveIntId`, `resourceAuthErrorResponse`

---

## 7. F3 — IAM boundaries

### Current behavior
- `iam/roles` GET: session-only, all roles + `role_permissions`→`permissions` + `user_roles` counts. POST accepts `body.organization_id`; PUT/DELETE act on global ids with `roles.manage`.
- `iam/teams?action=members`: org ctx required but team membership read is **un-scoped by `team_id`** → cross-tenant roster read (emails/names). `add-member`/`remove-member`/`DELETE` un-scoped.
- `iam/permissions` GET: session-only, full static catalog.

### Desired behavior
- `iam/roles` GET: org-visible = `where: { OR: [{ organization_id: ctx.organizationId }, { is_system: true }] }` for org admins; **platform sees all**. Count `user_roles` org-scoped via `some: { users: { organization_id: ctx.organizationId } }`.
- `iam/roles` POST: `organization_id` derived from session (`ctx.organizationId`) for tenant roles; platform may set explicit org or create system roles. Keep `requirePermission("roles.manage")`.
- `iam/roles` PUT/DELETE: fetch role, `assertOrganizationTarget(role.organization_id, ctx)` before mutating (reuse `assertOrganizationTarget`); `is_system` roles are platform-only.
- `iam/teams?action=members` (and `add-member`/`remove-member`/`DELETE`): gate on `teams.findFirst({ where: { id: teamId, organization_id: ctx.organizationId } })` → 404 foreign; mutate only same-org teams; `DELETE` verify org.
- `iam/permissions` GET: **leave as authenticated read** — it is harmless static permission metadata (classify as "safe to expose"); optionally restrict to `requirePermission("roles.manage")`/org-admin if product prefers, but no security requirement to hide.

### Files likely to change
- `app/api/iam/roles/route.ts`
- `app/api/iam/teams/route.ts`
- (optional) `app/api/iam/permissions/route.ts`
- `lib/auth/privilege-authorization.ts` already exports `assertOrganizationTarget` (reuse; no new code unless a small wrapper is desired)

### Helpers to reuse
- `requireOrganization`, `assertOrganizationTarget`, `assertLegacyUserInActorOrg` (for member user checks), `requirePermission("roles.manage")`/`teams.manage`, `isPlatformAuthority`

---

## 8. F4 — Global aggregates

### Current behavior
- `ai/analytics`: `tracks.count()` **unscoped** in `overview` and `catalog` (other metrics already org-scoped).
- `network/health`: 4 unscoped counts + hardcoded `missing_contracts: 5`, `expired_agreements: 2`.

### Desired behavior (classification)
| Endpoint | Classification | Change |
|----------|----------------|--------|
| `ai/analytics` (tracks) | **organization-scoped** | add `trackOrgScopeWhere(ctx)` to the two `tracks.count()` calls; keep other counts as-is |
| `network/health` | **platform-authority-only** (operational health) | `requirePlatformAdmin()`; drop `missing_contracts`/`expired_agreements` hardcoded values (or derive) |
| `labels`/`publishers`/`pros` counts (via `GET /api/{labels,publishers,pros}`) | **intentionally global** reference reads | no change (already gated reads; mutations platform-only) |
| `platform/events?view=registry` | **intentionally global** schema catalog | no change |
| `v1/catalog?entity=labels` | fail-closed empty | no change |

### Files likely to change
- `app/api/ai/analytics/route.ts`
- `app/api/network/health/route.ts`

### Helpers to reuse
- `trackOrgScopeWhere`, `requirePlatformAdmin`/`platformAuthorityFromSession`, `orgContextErrorResponse`

---

## 9. F5 — `/api/search` (first-class finding)

### Current behavior (verified)
`requireOrganization()` then unscoped `tracks` (title/isrc/track_id), `playlists` (name/description), `organizations` (name), `individuals` (first/last name). Artists/releases/works/contracts/documents/notes are already org-scoped and **must not change**.

### Desired behavior
| Entity | Current | Desired scope |
|--------|---------|----------------|
| `tracks` | unscoped | `trackOrgScopeWhere(ctx)` (reuse canonical predicate; covers tenant_id + release/work/track_releases) |
| `playlists` | unscoped | `playlistOrgScopeWhere(ctx)` (tenant_id OR same-user created, fail-closed) |
| `organizations` | unscoped | `where: { name, organization_id: intOrgId }` (legacy int owner) |
| `individuals` | unscoped | `where: { name…, organization_id: intOrgId }` |
| artists/releases/works/contracts/documents/notes | scoped | **unchanged** |

Response shape is preserved (`results` keys identical); foreign orgs simply stop appearing.

### Files likely to change
- `app/api/search/route.ts` (add the four scope predicates; no schema/response change)

### Helpers to reuse
- `trackOrgScopeWhere`, `playlistOrgScopeWhere`, `requireOrganization`, `requireLegacyIntOrgId`

---

## 10. Duplicate/legacy routes needing the same fix (sweep results)

Verified in Step 1; no additional surfaces beyond those listed:

- `network/platforms`, `network/relationships`, `network/all` — platform/session issue (F1 family).
- `admin/orgs` — cross-org admin surface (F1 family).
- `iam/teams` members/add/remove — cross-org roster (F3 family).
- `ai/release-integration?action=plan` — same unscoped release read as F2.
- `v1/catalog`/`v1/royalties`/`v1/contracts` — already org-scoped via API key; **no change**.
- Global-search `search` is the only additional high-value cross-tenant read surface.

No other `findMany`/`count` without org filter surfaced beyond the tables covered here (verified by the full `app/api` count/findMany sweep in Step 1).

---

## 11. Schema Changes Required

**None.** Documented (not implemented):

- `platforms` and `network_relationships` have **no ownership column**. Option chosen: **platform-authority gating** (no schema change). Alternative (e.g., adding `organization_id`/`tenant_id` to `network_relationships`) is **not required** and deferred; document only if multi-tenant network relationships become a real product surface.
- No new unique constraints, indexes, or migrations are needed for the designs above (existing indexes `ix_organizations_organization_id`, `ix_individuals_organization_id`, `ix_ai_contract_documents_organization_id`, `ix_roles_organization_id`, `ix_teams_organization_id` cover the new predicates).

---

## 12. HTTP Regression-Test Plan

Extend `lib/auth/__tests__` with a new suite (e.g. `residual-boundary-http.test.ts`) following the A.8 handler-level mocking pattern. Matrix (status contracts consistent with A.8: **404 non-leaking for resource resolution, 403 with explicit code for authority**):

| # | Test | Expected |
|---|------|----------|
| T1 | unauthenticated → every route under audit | 401 |
| T2 | `GET /api/search` Org A member → own artists/releases/tracks/… returned | 200 (own only) |
| T3 | `GET /api/search?isrc=<org B track>` Org A member → no tracks/entries for Org B | 200, empty track/playlist/network arrays |
| T4 | `GET /api/search` — scoped entities (artists/releases/works/contracts/documents/notes) still return | 200 (unchanged behavior preserved) |
| T5 | `POST /api/ai/royalty?action=simulate` with own `release_id` | 200; run persisted under actor org |
| T6 | … with Org B `release_id` | **404** `NOT_FOUND`, no run persisted |
| T7 | … with Org B `contract_document_id` | **404** `NOT_FOUND` |
| T8 | `POST /api/ai/release-integration?action=plan` with Org B `release_id` | **404** |
| T9 | `GET /api/network/organizations` Org A member | 200; only rows with `organization_id = intOrg A` |
| T10 | Org A member reads Org B org by id | **404** |
| T11 | Org A member `PUT`/`DELETE `org B row | **403** `ORG_SCOPE_DENIED` (or 404); platform actor → 200/204 |
| T12 | Org A member `POST/PUT/DELETE /api/network/platforms` | **403** `PLATFORM_AUTHORITY_REQUIRED` |
| T13 | `GET /api/network/platforms` as member | 200 (global reference read preserved) |
| T14 | Org A member `POST/DELETE /api/network/relationships` | **403** `PLATFORM_AUTHORITY_REQUIRED` |
| T15 | `GET /api/network/all` — only own orgs/individuals + platforms ref | 200, no Org B orgs/individuals |
| T16 | `network/individuals` with `organization_ids` containing foreign org | **403** / junction rejected |
| T17 | `GET /api/admin/orgs` as org admin | **403** `PLATFORM_AUTHORITY_REQUIRED`; platform → 200 |
| T18 | `GET /api/iam/roles` as member | 200; only roles with `organization_id = ctx` (+ assigned system roles); no `platform.admin`/super-admin role structure |
| T19 | `POST /api/iam/roles` with foreign `organization_id` | **403**/derived-from-session (foreign ignored; role created in actor org) |
| T20 | Org A admin `PUT`/`DELETE` org B role / system role | **403** `PLATFORM_AUTHORITY_REQUIRED` |
| T21 | `GET /api/iam/teams?action=members&team_id=<org B team>` | **404** |
| T22 | Org A `add-member`/`remove-member`/`DELETE` on org B team | **404**/403 |
| T23 | `GET /api/iam/permissions` as member | 200 (catalog unchanged) |
| T24 | `GET /api/ai/analytics?action=catalog` Org A → `total_tracks` excludes Org B tracks | 200 scoped |
| T25 | `GET /api/network/health` as member | 403; platform → 200; no hardcoded fields |
| T26 | Client-supplied `organizationId`/`orgId`/`tenant` in body cannot change scope on any audited route | 403/404 (server context wins) |
| T27 | Existence non-leak: foreign resources consistently 404 (no matrix of 200/404 differing from own-resource behavior) | 404 |

---

## 13. Compatibility Considerations

- **Search**: response shape and keys unchanged; only foreign entries disappear. UI that renders `results.tracks`/`results.network` remains compatible.
- **AI**: successful same-org flows unchanged; foreign ids now 404 — any client relying on cross-org simulation output is already in (mis)use and will break by design.
- **Network reads**: org-scoped reads mean the network UI shows the tenant's own directory rows plus global reference data (platforms); platform-level views use the platform account.
- **IAM**: org admins still manage their own roles/teams; `iam/permissions` unchanged (harmless). Platform role/superadmin structure no longer leaks to tenants.
- **`network/health`/`admin/orgs`**: become platform surfaces; adjust UI navigation for non-platform users.
- **No data migration**; empty production tables mean no backfill concerns.

---

## 14. Migration / Deployment Considerations

- **No schema migration.** Code-only change.
- Single Vercel deployment after implementation + full suite pass (deployment itself is out of scope for Step 2 and will be handled in Step 5 only).
- No environment variable changes.
- Rollback is a single deployment revert (no data/DDL to unwind).

---

## 15. Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Org-scoping a shared directory breaks a legit cross-org feature | Low (no such feature exists; schema is tenant-owned) | Medium | Confirmed no `organizations` cross-org reads required; platform path retained |
| Platform gating removes functionality for members | Low (relationships/health/admin-orgs were empty/ops-only) | Low | Platform account retains full access |
| Search predicate adds complexity and slows queries | Low | Low | Reuses indexed columns (`organization_id`, `tenant_id`, relation FKs) |
| Inconsistent partial fix (e.g., search fixed, ai not) | Guarded by implementation order (§16) | Medium | Order: core primitive → search → F2 → F3 → F1 → F4 → suite |
| 404-vs-403 confusion for downstream clients | Low | Low | Consistent A.8 contract: 404 for resource resolution, 403 with code for authority |

---

## 16. Recommended Implementation Order (prevents partial-fix inconsistency)

1. **Shared authorization/search primitives** (foundation):
   - `lib/auth/resource-authorization.ts` → add `requireAIContractDocumentInOrg`; confirm `trackOrgScopeWhere`, `playlistOrgScopeWhere`, `requireReleaseInOrg`, `assertOrganizationTarget` cover all consumers (single source of truth; anything F1–F5 needs lands here first).
2. **`/api/search`** (largest/internet-facing cross-tenant surface) using primitives from (1).
3. **F2 — AI resource resolution** (`ai/royalty`, `ai/release-integration`) using `requireReleaseInOrg` + new contract-doc helper.
4. **F3 — IAM/teams/roles/permissions** (independent of (2)/(3); uses `assertOrganizationTarget`).
5. **F1 — network surfaces** (`organizations`, `platforms`, `relationships`, `all`, `individuals`, `admin/orgs`).
6. **F4 — aggregates** (`ai/analytics`, `network/health`).
7. **HTTP regression suite** (T1–T27) — written per-group alongside steps 2–6, full run after step 6.

Each group ends with its portion of the suite green, so a partial deploy anywhere in the sequence cannot leave an unguarded route.

---

## 17. Deliverable

Design document: `docs/platform/identity/a9-step2-residual-boundary-remediation-plan.md`.

**STOP — Step 2 complete.** No source, schema, environment, or production modifications were made; nothing committed, pushed, or deployed.