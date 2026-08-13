# R1–R3 STEP 1 — RESIDUAL AUTHORIZATION-BOUNDARY AUDIT

**Mode:** Strictly read-only. No source code, Prisma schema, migrations, database state, IAM state, environment variables, Vercel configuration, deployments, or Git history were modified. No commits, pushes, deploys, seeds, or production writes.

**Scope:** `GET/POST/PATCH/PUT/DELETE` routes under `/api/royalties/**`, `/api/office/activities/**`, `/api/office/audit-logs/**` — plus equivalent surfaces that could bypass an R1/R2/R3 fix.

---

## 1. Verdict

> **`FINDINGS REQUIRE REMEDIATION`** — confirmed exploitable cross-tenant read paths in code.
> **Safe to defer for the current single-org production footprint** (no second tenant exists; affected tables are empty-to-minimal), **but must be remediated before any multi-tenant catalog / audit / activity data is onboarded.**

Rationale:

- **R1, R2, R3 are confirmed in committed code at the audit baseline.** Each is an *omission of org scoping* on a read path (not an overrideable context), consistent with the root cause established in A.9 Step 1–2.
- Three additional **equivalent bypass surfaces** were found: `/api/reports` (royalties_summary, activity_log), `/api/office/reports/runs/[runId]/data` (same two report types), and `/api/ai/audit` (royalty anomalies). A fix on the primary routes alone would be bypassed through these paths.
- **One correction to prior tracking:** A.9 Step 4 tagged R3 as "GET by-id unscoped (list path org-filtered)". The list path's org filter is **broken** — it runs `parseInt(ctx.organizationId)` against a UUID, yielding `null` (→ **no filter = global list**) for letter-leading UUIDs or a truncated random integer for digit-leading UUIDs. The list is therefore not org-filtered either.
- Every finding is an **omission**, so the canonical A.8/A.9 primitives already exist and can be reused without introducing a second authorization model (see §8).

---

## 2. Baseline Commit / Deployment

| Item | Value |
|------|-------|
| Repo branch | `main` |
| Repo commit (HEAD) | `2a2ecfdd7b44b61e90c2d50e40325d82b6cae512` (`feat(security): harden residual authorization boundaries` = A.9 closure) |
| `origin/main` | `2a2ecfdd7b44b61e90c2d50e40325d82b6cae512` — identical to HEAD |
| Parent | `76c038b` (A.8 closure) |
| Deployment | Commit `2a2ecfd` runtime-verified serving at `https://otto-cloud.vercel.app` (A.9 Step 8 report). **Vercel deployment ID / dashboard build status were not independently re-verifiable** in this step (no authenticated Vercel CLI/token in the environment; not guessed). |
| Database target | Production Neon `ep-little-breeze-apih3wtz` (established by A.8 Step 7/8 method). IAM-lab `ep-flat-moon-appwkffr` excluded. |
| Audit basis | The exact committed tree at `2a2ecfd` (== deployed tree). |

**Audit-basis integrity:** `git rev-parse HEAD` == `git rev-parse origin/main` == `2a2ecfd`. Working tree contains only the documented pre-existing leftovers (A.8/A.9 report docs, `next-env.d.ts`, `tsconfig.tsbuildinfo`, `scripts/reconcile-iam-owner-platform-admin.ts`) — none touch the audited routes.

---

## 3. Route Inventory

### 3.1 `/api/royalties/**` (12 route files)

| # | Route | Method | Auth | Org context | Ownership predicate | Client-supplied ids trusted? | Resolved globally before auth? |
|---|-------|--------|------|-------------|---------------------|------------------------------|--------------------------------|
| 1 | `/api/royalties` | GET (`action=summary`, list) | `requireOrgAuth` (session+org) | `ctx.organizationId` | `royaltyOrgScopeWhere(ctx)` in `buildWhere` (tenant_id OR linked artist/work/track) | Query `artist_id/work_id/track_id/source/dates` are filter-only, AND-ed under scope | No (scoped) |
| 2 | `/api/royalties` | **GET by `?id=`** | `requireOrgAuth` | derived but **unused** | **None — `findUnique({ where: { id } })`** | **Yes — `id` is the sole predicate** | **Yes (global)** |
| 3 | `/api/royalties` | **GET `action=validate-splits&contract_id=`** | `requireOrgAuth` | derived but **unused** | **None — `contracts.findFirst({ where: { id } })`; then royalties by foreign entity ids** | **Yes — `contract_id` and derived entity ids are sole predicates** | **Yes (global)** |
| 4 | `/api/royalties` | POST | `requireOrgAuth` | `ctx.organizationId` | Create stamps `tenant_id`; **linked `artist_id/work_id/track_id` NOT org-validated** | `artist_id/work_id/track_id` accepted without existence/org check | Write path (see §5 note) |
| 5 | `/api/royalties` | PUT | `requireOrgAuth` | `ctx` | `requireRoyaltyInOrg(id, ctx)` | `id` validated via `requireRoyaltyInOrg` (404 foreign) | No |
| 6 | `/api/royalties` | DELETE | `requireOrgAuth` | `ctx` | `requireRoyaltyInOrg(id, ctx)` | `id` validated via `requireRoyaltyInOrg` | No |
| 7 | `/api/royalties/entitlements` | GET | `requireOrganization` | `ctx.organizationId` | `royaltyEntitlement.organizationId` in service `list`/`search` | `rightId/beneficiary/territory` filter-only under org scope | No |
| 8 | `/api/royalties/entitlements/search` | GET | `requireOrganization` | `ctx.organizationId` | `royaltyEntitlement.organizationId` in `search-service` | filter-only under org scope | No |
| 9 | `/api/royalties/entitlements/[id]` | GET, PATCH | `requireOrganization` | `ctx.organizationId` | `getById`/`update` use `findFirst({ id, organizationId })`; PATCH requires `canManageEntitlements` | `:id` (path) scoped to org; body fields not org-typed | No |
| 10 | `/api/royalties/entitlements/[id]/timeline` | GET | `requireOrganization` | `ctx.organizationId` | `getById` gate then `entitlementTimelineEntry/entitlementHistory` by org+id | `:id` scoped to org | No |
| 11 | `/api/royalties/entitlements/[id]/provenance` | GET | `requireOrganization` | `ctx.organizationId` | `getProvenance` via scoped `getById` + `right.findFirst({ id, organizationId })` | `:id` scoped to org | No |
| 12 | `/api/royalties/dashboard` | GET | `requireOrganization` | `ctx.organizationId` | service aggregates under org | — | No |
| 13 | `/api/royalties/promote` | POST | `requireOrganization` + `canManageEntitlements` | `ctx.organizationId` | `right.findFirst({ id, organizationId })` | `body.rightId` resolved org-scoped (404 foreign) | No |
| 14 | `/api/royalties/replay` | POST | `requireOrganization` + `assertCanReplay` | `ctx.organizationId` | same `promoteFromRight` org-scoped right resolution | `body.rightId` resolved org-scoped | No |
| 15 | `/api/royalties/review` | GET, POST | `requireOrganization` (+ `canReviewEntitlements` on decide) | `ctx.organizationId` | `entitlementCandidate`/`royaltyEntitlement` by org | `candidateId` resolved org-scoped | No |
| 16 | `/api/v1/royalties` | GET | API key `royalties:read` | `result.key.organization_id` (server-derived) | `orgScope` OR on tenant_id / artist / work / track | — | No |

### 3.2 `/api/office/activities/**` (1 route file)

| # | Route | Method | Auth | Org context | Ownership predicate | Client-supplied ids trusted? | Resolved globally before auth? |
|---|-------|--------|------|-------------|---------------------|------------------------------|--------------------------------|
| 17 | `/api/office/activities` | **GET by `?id=`** | `getServerSession()` only (no org required) | **None** | **None — `activities.findUnique({ where: { id } })`** | **Yes — `id` sole predicate** | **Yes (global)** |
| 18 | `/api/office/activities` | **GET list** | `getServerSession()` only | **None** | **None — `activities.findMany({ where })` with no org/user bound** | Query `action/entity_type/entity_id/user_id/dates` applied without owner bound | **Yes (global)** |

### 3.3 `/api/office/audit-logs/**` (1 route file)

| # | Route | Method | Auth | Org context | Ownership predicate | Client-supplied ids trusted? | Resolved globally before auth? |
|---|-------|--------|------|-------------|---------------------|------------------------------|--------------------------------|
| 19 | `/api/office/audit-logs` | **GET by `?id=`** | `getServerSession()` + `requireOrganization` | derived but **unused** | **None — `audit_logs.findUnique({ where: { id } })`** (`requireAuditLogInOrg` exists but is not called) | **Yes — `id` sole predicate** | **Yes (global)** |
| 20 | `/api/office/audit-logs` | **GET list** | `getServerSession()` + `requireOrganization` | **broken filter** | `where.organization_id = parseInt(ctx.organizationId) \|\| null` — `ctx.organizationId` is a UUID → `NaN`→`null` (letter-leading UUID → **no filter, global**) or a truncated integer (digit-leading UUID → wrong int filter). Correct predicate is `requireAuditLogInOrg`-style: `organization_id = legacyIntOrgId` OR `tenant_id = ctx.organizationId`. | Query `action/entity_type/entity_id/user_id` applied without owner bound; org filter is inert | **Yes (effectively global)** |

**Status-code / existence inference:** on every unscoped by-id read, a foreign row that exists returns `200` with full data (disclosure, not merely an oracle); a non-existent id returns `404`. Foreign-entity existence is therefore trivially inferable and, more importantly, the record itself is exfiltrated.

---

## 4. Authorization-Flow Analysis (route → helper → Prisma)

### 4.1 Canonical A.8/A.9 primitives (single authorization model — to be reused, not duplicated)

| Primitive | Location | Role |
|-----------|----------|------|
| `requireOrganization()` / `requireOrgAuth()` | `lib/auth/organization-context.ts:460` / `resource-authorization.ts:42` | Authenticate + resolve org context **server-side only** |
| `requireLegacyIntOrgId(ctx)` | `resource-authorization.ts:50` | Fail-closed int owner id (legacy INT tables) |
| `requirePositiveIntId(raw, label)` | `resource-authorization.ts:66` | Fail-closed positive-int id validation |
| `requireActorUserId(ctx)` | `resource-authorization.ts:94` | Actor user id (fail-closed) |
| `royaltyOrgScopeWhere(ctx)` | `resource-authorization.ts:314` | Royals scope: `tenant_id` OR `artists.organization_id` OR `works.organization_id` OR `tracks`(trackOrgScopeWhere) |
| `requireRoyaltyInOrg(id, ctx)` | `resource-authorization.ts:329` | Org-bound royalty resolution → 404 `NOT_FOUND` |
| `requireAuditLogInOrg(id, ctx)` | `resource-authorization.ts:371` | Org-bound audit log resolution (`organization_id = legacyIntOrgId` OR `tenant_id = ctx.organizationId`) — **defined, currently unused** |
| `requireContractInOrg(id, ctx)` | `resource-authorization.ts:238` | Org-bound contract resolution (INT org OR tenant UUID) |
| `requireTask/Event/Document/StatusQuoInOrg` | `resource-authorization.ts:339–385` | Sibling office-entity org-bound resolvers (already used by their routes) |
| `resourceAuthErrorResponse(err)` | `resource-authorization.ts:31` | 401/403/404 mapping |

The sibling office routes **already follow this model**: `office/tasks`, `office/events`, `office/notes`, `office/status-quo` all bind `organization_id = ctx.organizationId` on GET (list and by-id) and use `require*InOrg` on PUT/DELETE. `activities` and `audit-logs` are the only office routes that do not.

### 4.2 Trace — R1 (`GET /api/royalties?action=&id=`)

```
HTTP GET /api/royalties?id=<n>
  → requireOrgAuth()                       // session + org ctx (auth OK)
  → prisma.royalties.findUnique({ where: { id }, include: artists|tracks|works })
      // NO royaltyOrgScopeWhere(ctx) on this branch        ← Omission
  → 200 <full row + linked artists/tracks/works>            // foreign rows included
```

Same file, `action=validate-splits`:

```
HTTP GET /api/royalties?action=validate-splits&contract_id=<n>
  → requireOrgAuth()
  → prisma.contracts.findFirst({ where: { id }, include: split_groups/splits/track_links/assets/parties })
      // NO requireContractInOrg()                          ← Omission (contract is INT-org owned)
  → royalties.findMany({ OR: [artist_id IN …, work_id IN …, track_id IN …] })
      // NO org scope                                       ← Omission
  → 200 discrepancies with expected/actual amounts          // foreign contract financial structure + foreign royalties
```

### 4.3 Trace — R2 (`GET /api/office/activities`)

```
HTTP GET /api/office/activities[?id=<n>|…filters]
  → getServerSession() only               // no requireOrganization() at all
  → prisma.activities.findUnique({ where: { id } })   |  findMany({ where: <filters> })
      // activities has NO organization_id column (schema.prisma:70) → nothing to scope by
      // no user_id = actor bound either
  → 200 rows for any authenticated user, any tenant
```

### 4.4 Trace — R3 (`GET /api/office/audit-logs`)

```
HTTP GET /api/office/audit-logs?id=<n>
  → getServerSession() + requireOrganization()    // auth OK
  → prisma.audit_logs.findUnique({ where: { id } })
      // NO requireAuditLogInOrg() (helper exists, unused)  ← Omission
  → 200 <row incl. action/entity/user_id/ip_address/user_agent/changes JSON>

HTTP GET /api/office/audit-logs?action=…&entity_type=…&user_id=…   (list)
  → ctx = requireOrganization()
  → orgId = parseInt(ctx.organizationId) || null   // UUID → NaN → null (letter-led)  ← Bug
  → if (orgId) where.organization_id = orgId       // inert for null → global findMany
```

### 4.5 Equivalent bypass surfaces (route → lib → Prisma)

| Surface | Trace | Finding |
|---------|-------|---------|
| `POST /api/reports` (`report_type=royalties_summary`) | `requireOrganization` → `runReport(orgId,…)` → `def.run(String(orgId),…)` → `prisma.royalties.findMany({ where: {} })` — **orgId ignored** (`lib/reports.ts:117-119`) | Global royalties read incl. amounts — **R1 bypass** |
| `GET /api/office/reports/runs/[runId]/data` (`report_type=royalties_summary`) | run row org-scoped, then re-runs `def.run(String(orgId),…)` → global royalties (`lib/reports.ts:119`) | Same — **R1 bypass** |
| `POST /api/reports` / `…/data` (`report_type=activity_log`) | `def.run` → `prisma.activities.findMany({ orderBy, take })` — **orgId ignored** (`lib/reports.ts:241`) | Global activities read — **R2 bypass** |
| `GET|POST /api/ai/audit` (`scope=royalty_anomalies`) | `requireOrganization` → `runAllAudits(orgId)` → `checkRoyaltyAnomalies(orgId)` → `prisma.royalties.findMany({ take: 500 })` — **orgId ignored** (`lib/ai-audit.ts:162`) | Global royalties anomalies with `$` amounts — **R1 bypass** |
| `GET /api/reports` (run list) / `DELETE /api/reports?id=` | `report_runs` filtered by `organization_id = ctx.organizationId` (GET); **DELETE deletes by global id with no org check** (`app/api/reports/route.ts:74-75`) | DELETE = cross-org report-run deletion (write; adjacent, not a read) |

**Contrast (already correct, no change needed):** `GET /api/v1/royalties` (API-key org scope), all `/api/royalties/entitlements/**`, `/api/royalties/dashboard|promote|replay|review` (service-level `organizationId` filters), `GET /api/iam/audit` (`tenant_id` from session), office tasks/events/notes/status-quo.

---

## 5. Prisma Ownership Analysis (schema at `prisma/schema.prisma`)

| Table | Lines | Ownership columns | Consequence for scoping |
|-------|-------|-------------------|-------------------------|
| `royalties` | 1192 | `tenant_id UUID?`; FK links `artist_id/work_id/track_id` (no `organization_id`) | Scope via `royaltyOrgScopeWhere` (tenant OR linked artist/work/track). Canonical predicate exists. |
| `activities` | 70 | **none** — `user_id Int` only | Cannot be org-scoped without schema change. Options within the current model: **actor-user scope** (`user_id = requireActorUserId(ctx)`) or **platform-authority gate** (matching the `network/health`/`labels` precedent). Product decision; no second model introduced. |
| `audit_logs` | 546 | `organization_id Int?`, `tenant_id UUID?` | Scope via `requireAuditLogInOrg`-style predicate (`organization_id = legacyIntOrgId` OR `tenant_id = ctx.organizationId`). Helper exists; route never calls it. |
| `contracts` | 690 | `organization_id Int` (NOT NULL), `tenant_id UUID?` | `requireContractInOrg` exists; `validate-splits` reads it unscoped. |

**Cross-resource inference:** a foreign royalty can only be returned by the unscoped by-id/validate-splits/reports/ai-audit paths. Scoped paths (`buildWhere`, `royaltyOrgScopeWhere`) correctly exclude cross-org rows even when `artist_id/work_id/track_id` filters are supplied (AND-ed under scope).

---

## 6. Confirmed Findings

### R1 — `GET /api/royalties?id=` cross-tenant read (High)
**Status: confirmed exploitable (code).** `app/api/royalties/route.ts:193-202` resolves `id` with unscoped `findUnique`. Returns the foreign royalty row including `amount/fees/advances/currency/statement_date` and the linked `artists/tracks/works` records. Foreign id that exists → `200` full data; non-existent → `404`. Cross-tenant read + existence oracle.

### R1b — `GET /api/royalties?action=validate-splits` cross-tenant read (High)
**Status: confirmed exploitable (code).** `route.ts:109-191` reads `contracts` by global id (with `contract_split_groups → contract_splits` percentages, `contract_track_links → tracks`, `contract_assets`, `contract_parties`) and then royalties by the derived foreign entity ids — all unscoped. Discloses another org's contract financial structure and royalty totals.

### R2 — `GET /api/office/activities` global feed (High)
**Status: confirmed exploitable (code).** `app/api/office/activities/route.ts:12-44`. Auth = `getServerSession()` only (no org requirement). By-id `findUnique` and list `findMany` are unscoped; `activities` has no org column. Any authenticated user reads every tenant's activity feed (actions/entity ids/entity names/user ids/timestamps).

### R3 — `GET /api/office/audit-logs` by-id + list cross-tenant read (High as found)
**Status: confirmed exploitable (code).** By-id: `audit_logs.findUnique` unscoped (`route.ts:17`). List: org filter is **inert** — `parseInt(ctx.organizationId)` on a UUID yields `null` (letter-leading org ids → global list) or a truncated integer (digit-leading → wrong filter) (`route.ts:41-42`). Records include `action/entity/user_id/ip_address/user_agent/changes` — PII and diff data.

### R1-bypass — reports `royalties_summary` (High, equivalent surface)
`lib/reports.ts:117-119` ignores the org argument; reachable via `POST /api/reports` and `GET /api/office/reports/runs/[runId]/data`.

### R2-bypass — reports `activity_log` (High, equivalent surface)
`lib/reports.ts:241` ignores the org argument; same two routes.

### R1-bypass — `GET|POST /api/ai/audit` royalty anomalies (High, equivalent surface)
`lib/ai-audit.ts:162` reads up to 500 royalties globally; findings include foreign `$` amounts and royalty ids.

### Related observations (adjacent, tracked separately — not part of R1–R3 fix)
- **`POST /api/royalties` accepts unvalidated foreign references** (`route.ts:233-248`): `artist_id/work_id/track_id` are not existence/org-checked before create. Stamps `tenant_id` from ctx (own-org visible), but linked foreign rows would surface via the `include` on read-back. Write-path data-integrity issue.
- **`DELETE /api/works` cascade** (`app/api/works/route.ts:145`): org-scoped work delete cascades `royalties.deleteMany({ where: { work_id } })` — deletes royalty rows referencing the work across tenants. Write-path; org gate is on the work, not the royalties.
- **R6 family (Low):** by-id branches use bare `parseInt` (e.g. `royalties` route `id`, `activities`, `audit-logs`) rather than `requirePositiveIntId`; `?id=1abc` parses to `1`, `?id=abc` → `NaN` → Prisma error → `500`.

---

## 7. False Positives / Closed Findings

| Candidate | Verdict | Evidence |
|-----------|---------|----------|
| `/api/royalties/entitlements/**` (list/search/[id]/timeline/provenance) | **False positive — org-scoped** | service `findFirst`/`findMany` include `organizationId: ctx.organizationId` (`registry-service.ts:35,61,130,203`; `search-service.ts:16`; `review-service.ts:24,47`) |
| `/api/royalties/dashboard`, `promote`, `replay`, `review` | **False positive — org-scoped + permission-gated** | `right.findFirst({ id, organizationId })`; `assertCanManage/ReviewEntitlements`, `assertCanReplay` |
| `/api/royalties` PUT / DELETE | **Already mitigated** | `requireRoyaltyInOrg(id, ctx)` at `route.ts:271,313` → 404 foreign (canonical primitive in use) |
| `/api/royalties` GET list / `action=summary` | **Already mitigated** | `buildWhere` AND-ed with `royaltyOrgScopeWhere(ctx)` (`route.ts:19,206`) |
| `/api/v1/royalties` (API-key feed) | **Already mitigated** | org derived from validated key row; `orgScope` OR predicate (`v1/royalties/route.ts:16-52`; `v1/helpers.ts:32`) |
| `GET /api/iam/audit` | **Already mitigated** | `where: { tenant_id: tenantId }` from session + `requirePermission("audit.view")` |
| `GET /api/office/activities` — "organ-level activity is intended to be global" | **False positive (assumption rejected)** | No product doc claims cross-tenant activity; sibling office routes are all org-scoped; `activities` is an internal event feed |
| `lib/audit.ts getAuditLogs` | **No finding** | Dead code (no callers); `recordAudit` writes org id |
| `GET /api/office/audit-logs` list "org-filtered" (A.9 Step 4 claim) | **Corrected — broken filter** | `parseInt(UUID)` → `null`/truncated int (see §4.4/§6 R3) |
| `reports` `catalog_summary`/`contracts_audit`/`tasks_progress`/`status_quo` | **False positive** | `orgFilter(orgId)` applied; `contracts_audit` filters INT column by UUID → zero rows (fail-closed by accident, not a leak); catalog tracks count global is F4-class (Low, previously tracked) |

---

## 8. Proposed Remediation Boundaries (design only — NOT implemented)

Reuse the canonical A.8/A.9 primitives; **no new authorization model, no schema change required** for R1/R3 (both use existing columns/helpers). R2 (`activities`, no org column) needs a product decision between the two existing-model options.

1. **R1** — `app/api/royalties/route.ts`
   - GET by-id → resolve via `requireRoyaltyInOrg(id, ctx)` (already used by PUT/DELETE); foreign/non-existent → 404 `NOT_FOUND`.
   - `action=validate-splits` → resolve `contract_id` via `requireContractInOrg(id, ctx)` before reading; royalties aggregation bound with `royaltyOrgScopeWhere(ctx)`.
   - Optionally harden id parsing with `requirePositiveIntId`.
2. **R1-bypass (reports)** — `lib/reports.ts` `royalties_summary.run` must apply `royaltyOrgScopeWhere` (needs an org-context argument, not just a string id); `activity_log.run` must be scoped/gated.
3. **R1-bypass (ai-audit)** — `lib/ai-audit.ts checkRoyaltyAnomalies` must apply `royaltyOrgScopeWhere(ctx)`.
4. **R2** — `app/api/office/activities/route.ts`
   - Option A (user-scope, no schema change): filter by `user_id = requireActorUserId(ctx)` for by-id and list; users only see their own activity.
   - Option B (platform-gate, matches `network/health` precedent): `isPlatformAuthority` → 403 `PLATFORM_AUTHORITY_REQUIRED` for non-platform actors.
   - Pick one and document; do **not** invent a second model.
5. **R3** — `app/api/office/audit-logs/route.ts`
   - By-id → `requireAuditLogInOrg(id, ctx)` (helper already exists and is unused).
   - List → replace the broken `parseInt(ctx.organizationId)` with `requireLegacyIntOrgId(ctx)`-based predicate (`organization_id = legacyIntOrgId` OR `tenant_id = ctx.organizationId`), matching `requireAuditLogInOrg`; optionally require `audit.view` (consistent with `iam/audit`).
   - Fix error mapping: `requireOrganization` failures currently surface as `500` (should be `403 NO_ORGANIZATION`) — route does not route `orgContextErrorResponse`.
6. **Consistency** — keep the A.8 status contract: 404 (non-leaking) for resource resolution, 403 with explicit code for authority/permission failures.

---

## 9. Production-Risk Assessment

- **Data volume (affected tables):**
  - `audit_logs`: **non-zero** — authentication/session artifacts accumulate from every login (the A.8/A.9 verification steps performed valid+invalid logins). Rehearsal copy baseline: `audit_logs = 0` (`production-rehearsal-report.md:166`); production has since grown by milestone-test artifacts.
  - `royalties`: **likely 0–minimal** (catalog is empty: 0 artists/releases/tracks/works/contracts per A.8 Step 9); not independently verifiable here.
  - `activities`: **likely 0–minimal** (event-driven writes from document/contract/intelligence events; no such workload).
  - **Not independently verifiable** in this audit (see §10) — a read-only `COUNT` per table is required at remediation time.
- **Exploitability today:** the code paths are confirmed exploitable, but there is **no second tenant** in production, so no foreign-org record can currently be enumerated. The realistic current exposure is limited to the **single org's own records read back to that org** — not a live cross-tenant breach.
- **Why not SAFE-TO-DEFER-forever:** `audit_logs` is non-empty and grows with normal use; the moment a second organization (or multi-tenant onboarding) exists, R1/R2/R3 and their bypasses expose financial and PII/audit data. This matches the A.9 Step 1/2 deferral framing: **must remediate before multi-tenant onboarding.**
- **R2 caveat:** `activities` has no org column; if it is ever populated with multi-tenant activity, option B (platform gate) or A (user scope) must be decided **before** that data exists.

---

## 10. Production Probe Limitations (read-only)

- **No direct DB access:** `.env.production.local` is a sanitized snapshot (`DATABASE_URL="[SENSITIVE]"`); `.env.local` targets IAM-lab `ep-flat-moon-appwkffr` (excluded). No `VERCEL_TOKEN`/`NEON_TOKEN`/`NEON_API_KEY`, no Vercel/Neon CLI installed.
- **No authenticated app session** was available; logging into production would **write `audit_logs` rows** (the audited resource), which is prohibited by this step's "do not mutate production data" constraint.
- Consequently, **no live probes and no independent row-count verification were performed.** Production-volume statements in §9 are based on prior-milestone evidence and are flagged accordingly. Deployment identity rests on the A.9 Step 8 runtime verification of commit `2a2ecfd`.

---

## 11. HTTP Test Gaps (existing suites do not cover R1–R3)

Verified: `test:a8-idor` (13), `test:a8-privilege` (27), `test:a8-step5` (27), `test:a8-http` (27), `test:a9-http` (47, re-run green 47/47 this step). None reference `royalties`, `office/activities`, or `office/audit-logs`. Missing HTTP-level authorization contracts (to be added in the remediation step):

1. `GET /api/royalties?id=<org B royalty>` as org A member → **404**; own id → 200; non-existent → 404 (no 200/404 matrix).
2. `GET /api/royalties?action=validate-splits&contract_id=<org B>` → **404**; own → 200.
3. `GET /api/office/activities?id=<foreign>` / list as org A member → **403** (platform-gate) or **empty/own-only** (user-scope) per chosen R2 option; non-member → 401.
4. `GET /api/office/audit-logs?id=<foreign>` → **404**; **list excludes org B rows** (assert the parse-bug regression — both letter- and digit-leading org UUID cases).
5. `POST /api/reports` with `report_type=royalties_summary` / `activity_log` as org A member → only org A rows.
6. `GET /api/office/reports/runs/[runId]/data` re-run of `royalties_summary`/`activity_log` → org-scoped only.
7. `GET|POST /api/ai/audit` royalty anomalies → no org B royalty ids/amounts.
8. Unauthenticated on all audited routes → **401**; authenticated-without-org → **403** (fix the current `500` for `office/audit-logs`).
9. `POST /api/royalties` with foreign `artist_id/work_id/track_id` → rejected (404/400) once reference validation is added.

---

## 12. Recommendation for Next Step

1. **Step 2 (design + implement):** Scope R1/R1b/R3 with the existing helpers (`requireRoyaltyInOrg`, `requireContractInOrg`, `requireAuditLogInOrg`, `royaltyOrgScopeWhere`, `requireLegacyIntOrgId`); decide R2 option A (user-scope) vs B (platform-gate); close the three bypass surfaces (`lib/reports.ts`, `lib/ai-audit.ts`); add the HTTP contracts in §11 following the A.8 404/403 status model. No schema or migration change is expected (R1/R3); R2 is a route-only decision.
2. **Before merge:** re-run `test:a8-idor/privilege/step5/http` + `test:a9-http` for regression; run the new R1–R3 suite; run a read-only production `COUNT` of `royalties`, `activities`, `audit_logs` to ground the risk assessment.
3. **Precedent discipline:** keep the canonical A.8/A.9 primitives as the only authorization model; do not add ad-hoc `organization_id` parsing in routes.

---

## 13. Final Verdict

**`FINDINGS REQUIRE REMEDIATION`** — confirmed exploitable cross-tenant read paths (R1, R1b, R2, R3 plus three bypass surfaces) in committed code at baseline `2a2ecfd`. They are currently **non-impactful in production** (single org, mostly-empty affected tables) and **safe to defer for the present footprint**, but **must be remediated before any multi-tenant catalog/audit/activity data is onboarded**, consistent with the A.9 deferral framing.

**Stop — Step 1 complete.** Read-only audit only; no source, schema, database, IAM, environment, Vercel, or deployment changes were made; nothing was committed or pushed. **Proceeding to Step 2 (remediation) requires explicit authorization.**
