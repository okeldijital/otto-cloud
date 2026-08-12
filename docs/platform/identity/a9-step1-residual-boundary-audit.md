# A.9 Step 1 — Residual Authorization & Read-Boundary Audit

**Mode:** Strictly read-only. No code changes, commits, pushes, deploys, environment changes, migrations, IAM writes, business-data writes, password operations, or Vercel changes were performed.

**Scope:** F1 (`network/organizations`), F2 (`ai/royalty`), F3 (`iam/roles`), F4 (global aggregate/count endpoints) — plus equivalent surfaces surfaced by the duplicate-route sweep (Step 11).

---

## 1. Verdict

> **`FINDINGS REQUIRE REMEDIATION`** — as **multi-tenant architectural risk**, and **`PASS`/safe to defer for the current single-org empty-catalog production footprint**.

Rationale:

- The audit found the original F1–F4 gaps confirmed **and** discovered additional equivalent surfaces (`/api/search`, `/api/network/platforms`, `/api/network/relationships`, `/api/network/all`, `/api/admin/orgs`, `/api/iam/teams`, `/api/iam/permissions`) with the same weakness: **global data reachable or mutable by any authenticated org member**.
- Every affected table is **currently empty in production** (verified live: 0 organizations, 0 platforms, 0 network relationships, 0 individuals, 0 teams, 0 roles, 0 permissions, 0 tracks/playlists). No cross-tenant data can be exposed today.
- Therefore remediation is **not a blocker for current single-org operation**, but **must be completed before onboarding multi-tenant catalog/directory data**.
- No Critical/High finding applies to the **current** production data plane; the High/Medium ratings below are architectural (multi-tenant).

---

## 2. Baseline

| Item | Value |
|------|-------|
| Repo branch | `main` |
| Repo commit | `76c038b33c65228d702fae170b561309fe27d67e` (`76c038b`) |
| Repo state | `main` == `origin/main`; working tree has only pre-existing uncommitted leftovers (Step-7/8 docs, `next-env.d.ts`, `tsconfig.tsbuildinfo`, `scripts/reconcile-iam-owner-platform-admin.ts`) |
| Deployment | `dpl_5Rh44xtHLmiKR1B4uvDbkgmzWnkb` — READY / PROMOTED, target `production`, source `git`, ref `main`, sha `76c038b33c65…` |
| Aliases | `otto-cloud.vercel.app` (probes), `otto.okeldijital.africa`, `otto-cloud-okeldijitals-projects.vercel.app`, `otto-cloud-git-main-okeldijitals-projects.vercel.app` |
| Build | Clean (0 stderr/error events) |
| DB target | Neon production (`ep-little-breeze-apih3wtz`) — same artifact as A.8 Step 9 |

**Audit basis = the exact source tree deployed to production.**

---

## 3. Complete Route & Helper Inventory

### Authorization helpers in play

| Helper | Behavior |
|--------|----------|
| `getServerSession()` (`lib/auth/session`) | Authenticates; returns session user |
| `requireOrganization()` (`lib/auth/organization-context`) | IAM-first; returns org context **derived from session only** (catalog-UUID org + `legacyIntOrgId`); superadmin special path; membership validated |
| `requireLegacyIntOrgId(ctx)` (`lib/auth/resource-authorization`) | Fail-closed int org id (for INT-column tables) |
| `requirePermission(...)` (`lib/iam`) | Legacy permission check on session permissions |
| `requireAdmin()` (`lib/permissions`) | Org-admin level (users/security/organizations manage or superuser) — **not** platform authority |
| `platformAuthorityFromSession` / `isPlatformAuthority` | Platform-superuser / platform-admin gated |
| `requireUploadEntityInOrg` / `requireAttachmentInOrg` | Org-bound resource lookups (fail-closed) |

### Routes classified (63 total candidates scanned via full `app/api` sweep)

| Group | Route | Auth | Org scoping | Classification |
|-------|-------|------|-------------|----------------|
| F1 | `GET /api/network/organizations` | session | **None** (global) | Global read (any authenticated) |
| F1 | `POST /api/network/organizations` | `requireOrganization` | Stamps `organization_id` from ctx | Weak write (auto-scoped) |
| F1 | `PUT /api/network/organizations` | **session only** | **None** | **Global write (any authenticated)** |
| F1 | `DELETE /api/network/organizations` | **session only** | **None** | **Global write (any authenticated)** |
| F1 | `GET /api/network/platforms` | **session only** | None (global) | Global read |
| F1 | `POST/PUT/DELETE /api/network/platforms` | **session only** | None | **Global write (any authenticated)** |
| F1 | `GET /api/network/relationships` | **session only** | None (global) | Global read |
| F1 | `POST/DELETE /api/network/relationships` | **session only** | None | **Global write (any authenticated)** |
| F1 | `GET /api/network/all` | **session only** | None (global) | Global bulk read (orgs+individuals+platforms) |
| F1 | `GET/POST/PUT/DELETE /api/network/individuals` | `requireOrganization` | Org-scoped by `legacyIntOrgId` | Mostly tight; client junction `organization_ids` |
| F1 | `GET /api/admin/orgs`, `PUT /api/admin/orgs` | `requireAdmin` (org-admin) | **None** on query/update target | **Global read + admin write** |
| F1-equiv | `GET /api/search` | `requireOrganization` | **tracks/playlists/orgs/individuals unscoped** | **Largest cross-tenant read surface** |
| F2 | `POST /api/ai/royalty?action=simulate` | `requireOrganization` | Reads `releases`/`ai_contract_documents` **by global id** | **Cross-tenant read + existence oracle** |
| F2 | `POST /api/ai/release-integration?action=plan` | `requireOrganization` | Reads `releases` **by global id** | **Cross-tenant read + existence oracle** |
| F2 | `GET /api/ai/royalty`/, `ai/release-integration`, `ai/contracts`, `ai/core-write`, `ai/draft`, `ai/audit`, `ai` | `requireOrganization` | Runs org-scoped | OK |
| F3 | `GET /api/iam/roles` | **session only** | **None (global)** | **Global role/permission-structure read** |
| F3 | `POST /api/iam/roles` | `requirePermission("roles.manage")` | Uses **client `body.organization_id`** | Cross-org role creation target |
| F3 | `PUT/DELETE /api/iam/roles` | `requirePermission("roles.manage")` | **None** on target id | Cross-org role mutate |
| F3 | `GET /api/iam/permissions` | **session only** | None (global) | Global permission catalog read |
| F3 | `GET /api/iam/teams?action=members` | `requireOrganization` | **None** on `team_id` | **Cross-tenant roster read (email/name)** |
| F3 | `POST /api/iam/teams` (add-member), `PUT` (remove-member), `DELETE` | `requirePermission("teams.manage")` | **None** on team/user ids | Cross-org team mutations |
| F3 | `GET /api/iam/teams` (list), `PUT` (update team) | org-gated | Org-scoped | OK |
| F3 | `GET /api/iam/audit` | `requirePermission("audit.view")` | Tenant-scoped | OK |
| F4 | `GET /api/ai/analytics?action=overview|catalog` | `requireOrganization` | **`tracks.count()` global** (×2); rest org-scoped | Global aggregate (count) |
| F4 | `GET /api/network/health` | `requireOrganization` | **4 × global count**; hardcoded values | Global aggregate + stale constants |
| F4 | `GET /api/labels`, `/api/publishers`, `/api/pros` | `requireOrganization`/session | Intentionally global ref data | **Intentionally global** (documented); mutations platform-gated (OK) |
| F4 | `GET /api/platform/events?view=registry` | `requireOrganization` | Global event-schema definitions | **Intentionally global** (schema doc); metrics/list org-scoped (OK) |
| — | `/api/v1/catalog`, `/api/v1/royalties`, `/api/v1/contracts` | API key | Org-scoped from key | OK |

---

## 4. F1 — Network directory (per instruction set)

**Q: Who can list organizations?**
Any authenticated user (`GET /api/network/organizations`, `network/all`, `search`). No org constraint.

**Q: Who can read another organization's metadata?**
Any authenticated user — `GET /api/network/organizations?id=<n>` returns the legacy directory row plus `individual_organizations` → `individuals` (names). `network/all`, `search` also return other org names.

**Q: Who can create / update / delete organizations?**
- Create: any authenticated user with org context (row is stamped with actor's legacy int org id).
- Update / delete: **any authenticated user** (`PUT`/`DELETE` have no org check and no platform-authority check). An owner of org A can modify or delete a directory entry belonging to org B.

**Q: Do mutations require platform authority?**
No. This is inconsistent with the global-reference-data gate applied to `labels`/`publishers`/`pros` (which require `platformAuthorityFromSession` for mutations).

**Q: Can an ordinary owner/admin enumerate organizations outside their active org?**
Yes — directly via `network/organizations`, `network/all`, `search`, and `admin/orgs` (org-admin level).

**Authorization flow (F1):**
```
HTTP → getServerSession/requireOrganization → (no org filter on WHERE)
     → SELECT * FROM organizations|platforms|network_relationships
```
The org context is derived but **not applied** to the query for these tables; PUT/DELETE skip even the context.

**Equivalent surfaces found:** `network/platforms`, `network/relationships`, `network/all`, `admin/orgs` (org-admin), `search` (`organizations`, `individuals`, `playlists`, `tracks`).

---

## 5. F2 — AI royalty / release-integration (per instruction set)

**Q: Are release/contract records resolved through organization-scoped queries?**
No.
- `/api/ai/royalty` `simulate`: `prisma.releases.findFirst({ where: { id } })` and `prisma.ai_contract_documents.findFirst({ where: { id } })` — **global id lookups, no `organization_id`/`tenant_id` filter**.
- `/api/ai/release-integration` `plan`: `prisma.releases.findFirst({ where: { id: parseInt(release_id) } })` — **global id lookup, no org filter**.

**Q: Can simulation read another organization's financial/catalog data?**
Catalog metadata yes: the simulated `parties`/`links` resolve `release.artists.name` and `release.tracks[].title` from whichever org owns the id. Financial figures (`amount` splits) are computed from **client-supplied** `gross_revenue`, not from tenant DB rows — so no financial records from other orgs are returned directly, but the **existence oracle** and **artist/track metadata** of foreign rows are disclosed and then persisted into the actor's own run.

**Q: Does the endpoint leak data through errors, calculated outputs, or existence checks?**
- Existence oracle: a foreign `release_id`/`contract_document_id` that exists returns 200 with output; a non-existent id returns `404 Release not found` — direct cross-tenant enumeration.
- Calculated output: foreign artist/track names leak into `computed_splits[].party_display_name` and `links[].display_name`.
- Run persistence remains org-scoped (only the reads are unscoped).

**Equivalent surfaces found:** `ai/release-integration?action=plan` (same unscoped `releases` read); `ai/royalty` GET on own runs is correctly scoped.

---

## 6. F3 — Legacy IAM catalog (per instruction set)

**Q: Does `/api/iam/roles` expose system/global roles?**
`GET` returns **all** rows of the `roles` table (global) for any authenticated user, including `role_permissions` → `permissions` bindings and `user_roles` counts.

**Q: Does role metadata contain permissions or platform-sensitive information?**
Yes — `role_permissions` include the full permission bindings for every role, plus member counts. It reveals the org authorization structure platform-wide to any authenticated user.

**Q: Does an ordinary organization owner/admin need this endpoint?**
A legitimate org admin needs **their own org's** roles only. The current endpoint returns every org's roles (and `POST` accepts a client `organization_id` to create a role in any org; `PUT`/`DELETE` act on global ids with only `roles.manage`).

**Q: Should the response be organization-scoped, permission-gated, or platform-only?**
Organization-scoped for org admins (`organization_id = ctx`), full catalog + cross-org mutations platform-only.

**Equivalent surfaces found (all more severe for some paths):**
- `iam/permissions` GET — global permission catalog (session-only, live count 0).
- `iam/teams?action=members` — **un-scoped `team_members` read by `team_id`** returning user email/name/role of any team (PII, cross-tenant); `add-member`/`remove-member`/`DELETE` also un-scoped on team/user ids.

---

## 7. F4 — Global aggregate/count endpoints (classification)

| Endpoint | Observed call | Classification |
|----------|---------------|----------------|
| `GET /api/ai/analytics?action=overview` | `tracks.count()` global; others org-scoped | **Global aggregate leak (Low)** — cross-tenant track count only |
| `GET /api/ai/analytics?action=catalog` | `tracks.count()` global | **Global aggregate leak (Low)** |
| `GET /api/network/health` | `organizations/individuals/platforms/network_relationships.count()` global + hardcoded `missing_contracts:5`,`expired_agreements:2` | **Global aggregate leak (Low)** + stale constants |
| `GET /api/labels`, `/publishers`, `/pros` | `count()` global | **Intentionally global** (authenticated; reference data documented in `docs/architecture/multi-tenant-model.md` §4.3); mutations correctly platform-gated |
| `GET /api/platform/events?view=registry` | global registry definitions | **Intentionally global** (non-secret schema catalog); metrics/events org-scoped |
| `/api/v1/catalog?entity=labels` | explicit empty response | **Fail-closed** (correct) |
| `GET /api/search` (aggregate of many scopes) | `tracks`, `playlists`, `organizations`, `individuals` unscoped | **Cross-tenant search/aggregate (High architectural)** |

Live read-only confirmation (production, authenticated owner): `ai/analytics` 200 (`total_tracks:0`), `network/health` 200 (all zeros + hardcoded), `iam/permissions` 200 (`permissions:[]`), `search?q=zzqq` 200 (empty arrays), `iam/teams`/`network/*`/`admin/orgs` 200 (`[]`).

---

## 8. Client-Supplied Identifier Override Analysis

For every operation traced, the **authoritative org context is session-derived**; no client-supplied `organizationId` overrides server-derived context to *narrow* or *widen* it. The identified problems are **absence of scoping**, not override:

| Client-supplied value | Where read | Effect |
|-----------------------|------------|--------|
| `organizationId` (body) | `iam/roles` POST `body.organization_id` | Target org for role creation (any org) — cross-org write target |
| `organization_ids` (body) | `network/individuals` POST/PUT | Junction `individual_organizations` rows to arbitrary ids |
| `id` (query/body) on global tables | `network/organizations`, `platforms`, `relationships`, `iam/roles`, `iam/teams` PUT/DELETE | Global row target without owner check |
| `release_id`, `contract_document_id` | `ai/royalty`/`ai/release-integration` | Global entity target for unscoped reads |
| `team_id` (query) | `iam/teams?action=members` | Global team target for roster read |

No route validates the client-supplied id against the actor's org **before use on these unscoped paths**. (Correctly-scoped equivalents that DO bind first: `requireAttachmentInOrg`, `requireUploadEntityInOrg`, org-scoped `findFirst({ id, organization_id })` across A.8-hardened routes.)

---

## 9. Cross-Tenant Attack Paths (architectural — no live data today)

1. **Search disclosure** — org A member calls `GET /api/search?q=<isrc_or_name>` → matches org B tracks (title/isrc/`release_id`), playlists, directory org names, individual names.
2. **Directory sabotage** — org A member `DELETE /api/network/organizations?id=<org B row>` or `PUT` to change its metadata; `network/platforms`/`relationships` same with only session auth.
3. **AI oracle + metadata copy** — org A member `POST ai/royalty?action=simulate` with org B `release_id` → 200/404 oracle plus B's artist/track names persisted into A's runs; same via `ai/release-integration?action=plan`.
4. **Role/team reconnaissance** — org A member reads all org roles/permissions (`iam/roles`) and any org's team roster incl. emails (`iam/teams?action=members`).

---

## 10. Data Exposure Classification

| Finding | Data class | Sensitivity | Current production data |
|---------|-----------|-------------|-------------------------|
| F1 (network/*, admin/orgs, search orgs/individuals) | Directory org metadata + individual names + platform `account_reference` | Low–High (PII names; semi-sensitive account ref) | **Empty (no rows)** |
| F1 search tracks/playlists | Catalog titles, ISRC, ids | Medium | **Empty** |
| F2 (ai royalty/release-integration) | Artist/track metadata + existence oracle | Medium | **Empty** |
| F3 (iam/roles, permissions, teams) | Role/permission structure; team rosters (email/name) | Low–High | **Empty (0 roles/permissions/teams)** |
| F4 (ai/analytics, network/health) | Global aggregate counts | Low | **All zero** |

---

## 11. Recommended Remediation (design only — NOT implemented)

1. **F1 + equivalents**
   - Gate directory-namespace reads to org-scope where the schema allows (`organizations.organization_id`, `individuals.organization_id`) or to platform authority for global catalog reads.
   - Require platform authority for **all** directory mutations (`network/organizations` PUT/DELETE, `network/platforms` POST/PUT/DELETE, `network/relationships` POST/DELETE) — consistent with `labels`/`publishers`/`pros`.
   - Re-scope or remove `network/all`; constrain `network/individuals` junction `organization_ids` to same-org ids.
   - `admin/orgs`: org-scope reads or require platform authority; PUT must verify target org.
2. **F2**
   - Resolve `release_id`/`contract_document_id` via org-scoped lookups (`findFirst({ where: { id, organization_id } })` for releases; resolve contract docs through their org), returning 404 for foreign ids — reusing the `require…InOrg` helper family.
3. **F3**
   - `iam/roles` GET → org-scoped (`organization_id = ctx`) for org admins, platform sees all; POST derives `organization_id` from session (not body); PUT/DELETE verify org.
   - `iam/teams?action=members` → verify the team's `organization_id` before returning members; scope `add-member`/`remove-member`/`DELETE` to the actor's org.
   - `iam/permissions` GET → permission-gated (e.g., `iam.*.view`) or platform-only.
4. **F4**
   - `ai/analytics` tracks count → org scope (`tenant_id = orgId` OR `releases.organization_id = orgId`), matching `v1/catalog` scoping.
   - `network/health` → org-scope counts or platform-only; remove hardcoded `missing_contracts`/`expired_agreements`.
5. **Search**
   - Add org scope to `tracks` (`WHERE tenant_id = ctx OR releases.organization_id = ctx`) and `playlists` (`tenant_id = ctx`); scope or remove `organizations`/`individuals` (or gate to platform authority).

---

## 12. Required HTTP Regression Tests (explicitly missing today)

Current suites `test:a8-idor` (13), `test:a8-privilege` (27), `test:a8-step5` (27), `test:a8-http` (27) cover: identity-health diagnostics, export int/UUID isolation, upload entity binding, global-catalog mutation gate (labels/publishers/pros), positive-int validation. **None** exercise the F1–F4/equivalents boundaries.

Missing HTTP-level cross-tenant tests (to be added in the remediation step, not here):

1. `GET /api/search?q=` as org A member must not match org B tracks/playlists/orgs/individuals.
2. `PUT`/`DELETE /api/network/organizations?id=<org B row>` by org A owner → 403 (platform authority required); by platform → allowed.
3. `POST/PUT/DELETE /api/network/platforms` & `network/relationships` by org A member → 403.
4. `POST /api/ai/royalty?action=simulate` with org B `release_id`/`contract_document_id` → 404 (or 403), with no actor-org run persisted referencing foreign data.
5. `POST /api/ai/release-integration?action=plan` with org B `release_id` → 404.
6. `GET /api/iam/roles` as org A member → only org A roles (and full catalog only for platform).
7. `POST /api/iam/roles` with foreign `organization_id` → 403/derived-from-session.
8. `GET /api/iam/teams?action=members&team_id=<org B team>` → 403; `add-member`/`remove-member` on foreign team → 403.
9. `GET /api/iam/permissions` → 403 for member (when permission-gated) / platform-only shape.
10. `GET /api/ai/analytics` and `network/health` → counts scoped to actor org (deny-global semantics) — assert `tracks` total excludes org B.

---

## 13. Deferral Analysis: empty-production risk vs multi-tenant architectural risk

| Dimension | Current single-org empty-catalog production | Multi-tenant architecture (future) |
|-----------|---------------------------------------------|------------------------------------|
| Data at risk | None — all affected tables verified empty (0 rows) | Full catalog/directory/roster/role data |
| Exploitable today | No (nothing to read/mutate) | Yes — cross-tenant read/write paths above |
| Blocking for current operations | **No — safe to defer** | Blocking at onboarding |
| Required before milestone | Only if multi-tenant data is added to these tables | **Yes — remediate F1–F4 + equivalents first** |
| Observability/constants issue | `network/health` hardcoded values (cosmetic) | n/a |

**Deferral verdict:** F1–F4 and all equivalent surfaces are **safe to defer for the current production footprint**, but are **`REQUIRES REMEDIATION`** gates in the remediation queue and **must be fixed before any multi-tenant catalog/network/IAM-legacy data is introduced**. No remediation implemented in Step 1.

---

## 14. Final Verdict

**`FINDINGS REQUIRE REMEDIATION`** (architectural multi-tenant risk). **Safe to defer / PASS for the current single-org empty-catalog production.**

Distance to acceptance:
- Additive, low-risk remediation (org-scoped lookups + platform gates + permission gates described in §11) is the design basis for Step 2.
- The current deployment remained untouched; all probing was read-only against an empty production data plane.

**STOP — Step 1 complete.** No code, data, environment, or deployment changes were made.