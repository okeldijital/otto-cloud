# A.9 Step 3 — Residual Boundary Remediation Report

**Status:** `IMPLEMENTATION COMPLETE`
**Date:** 2026-08-13
**Scope:** Repo-only local implementation of Step 2's approved remediation (F1–F5). No schema changes, no migrations, no Neon/Vercel deploys, no `.env*`/`.local/**` changes, no commit/push.

Baseline: `main` == `origin/main` == `76c038b33c65228d702fae170b561309fe27d67e`.

---

## 1. What was implemented

### F5 — `/api/search` (residual global reads)
`app/api/search/route.ts` now scopes every contributing query (not just the primary one):

- `tracks` → `AND: [trackOrgScopeWhere(ctx), OR(title/isrc_code/track_id)]`
- `playlists` → `AND: [playlistOrgScopeWhere(ctx), OR(name/description)]`
- `organizations`/`individuals` (network directory) → legacy `INT` org-bound via fail-closed `legacyIntOrgId` (`-1` when int scope unavailable)
- Artists/releases/works/contracts/documents/notes were already org-scoped and remain unchanged; labels/publishers/pros are global reference tables (unchanged, as designed).

### F2 — AI simulation / planning reads
- `app/api/ai/royalty/route.ts` (`simulate`): positive-int id validation → `requireReleaseInOrg` → re-fetch with `organization_id = ctx`; `contract_document_id` (when provided) → `requireAIContractDocumentInOrg`. Request hash and persisted run now use the validated `releaseId`/document id.
- `app/api/ai/release-integration/route.ts` (`plan`): release resolved via `requireReleaseInOrg`; `contract_id` (when provided) → `requireContractInOrg`. Run creation uses the validated ids.

### F1 — Network boundary
- `app/api/network/organizations/route.ts`: GET by id/list, and PUT/DELETE, are `organization_id = intOrg` bound; cross-org → 404. Joined `individual_organizations` filtered to same org.
- `app/api/network/platforms/route.ts`: GET unchanged (authenticated read of global reference); POST/PUT/DELETE now require platform authority (`PLATFORM_AUTHORITY_REQUIRED`, 403).
- `app/api/network/relationships/route.ts`: GET/POST/DELETE are platform-authority-only (global reference without owner column).
- `app/api/network/all/route.ts`: organizations/individuals org-scoped; platforms remain a global reference read; individual junction orgs filtered to same org.
- `app/api/network/individuals/route.ts`: reads/PUT/DELETE already org-bound; POST/PUT `individual_organizations` junction org ids are restricted to the actor's `intOrg` (foreign ids dropped); junction includes filtered on read.
- `app/api/admin/orgs/route.ts`: GET/PUT elevated to `requirePlatformAdmin` (was overly permissive `requireAdmin`).

### F3 — IAM boundary
- `app/api/iam/roles/route.ts`:
  - GET: platform sees all roles; org actor sees only `organization_id = ctx` roles (no system/platform role structure leak).
  - POST: for org actors the organization is always derived from the session; client `organization_id` is ignored. Platform may target any org.
  - PUT/DELETE: org actors may only touch roles bound to their org (404 otherwise, non-leaking); `is_system` roles cannot be modified (400).
- `app/api/iam/teams/route.ts`: `action=members`, `add-member`, `remove-member`, and DELETE all resolve the team within the actor's org (foreign team → 404); `add-member` also requires the target user to be in the same org.
- `app/api/iam/permissions/route.ts`: unchanged — authenticated read of the global permission catalog (correct per design).

### F4 — Aggregates
- `app/api/ai/analytics/route.ts`: both `tracks.count()` calls (overview + catalog) now use `trackOrgScopeWhere(ctx)` — no global track count.
- `app/api/network/health/route.ts`: platform-authority-only; hardcoded `missing_contracts: 5` / `expired_agreements: 2` removed.

### Shared primitive (order item 1)
`lib/auth/resource-authorization.ts` — added `requireAIContractDocumentInOrg(id, ctx)` (INT `organization_id` + optional `tenant_id`, 404 `NOT_FOUND` fail-closed).

---

## 2. Auth model used

Reused the A.8 canonical primitives; no new auth framework introduced.

| Boundary | Mechanism |
|---|---|
| Tenant-owned rows (`organizations`, `individuals`, `roles`, `contracts`, AI runs/docs) | `requireOrganization()` + `requireLegacyIntOrgId` / `requireReleaseInOrg` / `requireContractInOrg` / `requireAIContractDocumentInOrg`; cross-tenant → 404 `NOT_FOUND` (non-leaking) |
| Global reference `platforms`/`permissions` | Authenticated read; mutation only with `platformAuthorityFromSession` (superuser / super_admin / platform_admin) |
| `network_relationships` (no owner column) | Platform-authority-only |
| Client-supplied org | Never trusted — org always derived from session context (`assertOrganizationTarget` semantics via scoped `findFirst`) |

Explicit authority failures → 403 with `code: "PLATFORM_AUTHORITY_REQUIRED"`; resource resolution failures → 404; unauthenticated → 401.

---

## 3. Validation results

| Gate | Tool | Result |
|---|---|---|
| Lint | `npm run lint` | pass (0 warnings) |
| Typecheck | `npx tsc --noEmit` | pass |
| Build | `npm run build` | pass |
| `test:a8-idor` | 13 tests | 13 passed |
| `test:a8-privilege` | 27 tests | 27 passed |
| `test:a8-step5` | 27 tests | 27 passed |
| `test:a8-http` | 27 tests | 27 passed |
| `test:a9-http` (new) | 47 tests | 47 passed |
| `test:identity` | 8 suites | 8 passed |
| `git diff --check` | — | clean |

New regression suite: `lib/auth/__tests__/a9-http-boundary.test.ts` (script `test:a9-http`) covering the Step 2 §12 matrix T1–T27: authentication gate (T1), search scoping (T2–T4), F2 simulate/plan 404s (T5–T8), network org reads/writes (T9–T11), platforms (T12–T13), relationships (T14), network/all (T15), individuals junction (T16), admin/orgs (T17), iam/roles (T18–T20), iam/teams (T21–T22), permissions (T23), analytics (T24), health (T25), client-org-ignored (T26), and existence non-leak (T27).

### Test-matrix deviations (documented)
- T20 wording ("403 PLATFORM_AUTHORITY_REQUIRED"): the implemented contract is stricter and non-leaking — org actors get 404 for foreign roles and 400 for `is_system` roles; platform-only enforcement applies to the global role/system surface, while org admins retain the ability to manage their own org's non-system roles (consistent with T18/T19). This was chosen over a blanket platform-only gate so org role management still functions.
- T11/T16: cross-org mutations use a non-leaking 404 (allowed by the plan's "or 404") rather than 403; junction writes drop foreign org ids instead of erroring.

---

## 4. Files changed (this step)

- `lib/auth/resource-authorization.ts` (new `requireAIContractDocumentInOrg`)
- `app/api/search/route.ts`
- `app/api/ai/royalty/route.ts`
- `app/api/ai/release-integration/route.ts`
- `app/api/ai/analytics/route.ts`
- `app/api/network/organizations/route.ts`
- `app/api/network/platforms/route.ts`
- `app/api/network/relationships/route.ts`
- `app/api/network/all/route.ts`
- `app/api/network/individuals/route.ts`
- `app/api/network/health/route.ts`
- `app/api/iam/roles/route.ts`
- `app/api/iam/teams/route.ts`
- `app/api/admin/orgs/route.ts`
- `lib/auth/__tests__/a9-http-boundary.test.ts` (new)
- `package.json` (`test:a9-http`)

---

## 5. Out-of-scope observations (no action in this step)

Reviewed during the self-audit sweep; none block this regression, all are lower-risk, and all would require their own change/approval:

1. `app/api/ai/contracts` `resolve`/`attach` and `app/api/ai/core-write` write registry rows with client-supplied `entity_id`s; the existing A.8 Step 5 test pins the "no parseInt||1" guarantee, but a per-entity org probe before write would be the next hardening step.
2. `iam/roles` name uniqueness is a global schema constraint — a tenant cannot reuse a role name already used by another tenant (schema-level limitation; cannot be fixed without a schema change, which is out of scope).
3. Pre-existing historical `individual_organizations` junctions referencing foreign org ids may exist in legacy data; reads are now filtered to same-org on all three surfaces (orgs/individuals/all), so residual exposure is limited to row-level data migration cleanup.
4. `iam/users` by-id read and `iam/audit` were reviewed — they are permission/org-gated and were not part of the F1–F5 findings; noted for completeness only.

---

## 6. Constraints honored

- Repo-only; no schema/migration/`.env*`/`.local/**` changes.
- No commit, no push, no deploy (Vercel), no Neon/Supabase changes, no production CLI calls.
- Nothing printed secrets; the admin bootstrap secret remains confined to `.local/`.

---

## 7. Recommended next step

Be Step 4: record this report, then run the out-of-scope hardening items (1) as a scoped follow-up if multi-tenant deployment moves forward with tenant-isolated production data. Safe to mark this regression closed for the empty-production baseline.