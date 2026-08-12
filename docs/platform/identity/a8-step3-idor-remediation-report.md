# A.8 Step 3 — Group A IDOR Remediation Report

**Date:** 2026-08-12  
**Scope:** Critical cross-tenant IDOR (Group A)  
**Branch:** application codebase only  
**Production DB / Neon / Vercel:** **untouched**

---

## 1. Findings addressed (from A8-001 … A8-016 enumeration)

| ID | Title | Group A action |
|----|--------|----------------|
| A8-001 | Public `/api/test-db` | **Left open** (diagnostic group; not IDOR resource boundary) |
| A8-002 | Public `/api/platform/health/identity` | **Left open** (diagnostic) |
| **A8-003** | Releases PUT/DELETE by id only | **Remediated** |
| **A8-004** | Artists PUT/DELETE by id only | **Remediated** |
| **A8-005** | Works PUT/DELETE by id only | **Remediated** |
| **A8-006** | Contracts PUT/DELETE by id only | **Remediated** |
| **A8-007** | Tracks global list/mutate | **Remediated** (via ownership joins + `tenant_id`) |
| **A8-008** | Royalties global list/mutate | **Remediated** (via `tenant_id` / artist / work / track scope) |
| **A8-009** | v1 royalties ignores key org | **Remediated** |
| **A8-010** | `/api/files?path=` path IDOR | **Remediated** (path disabled; attachment id + org only) |
| A8-011 | Admin `is_superuser` grant | **Left open** (Group B privilege escalation) |
| A8-012 | Admin org path ≠ session org | **Left open** (Group B) |
| A8-013 | Unrestricted roleKey assignment | **Left open** (Group B) |
| A8-014 | Legacy IAM users cross-tenant | **Left open** (Group B) |
| A8-015 | Invite without permission | **Left open** (Group B) |
| A8-016 | Owner includes `platform.admin` | **Left open** (Group B) |

### Additional IDOR surfaces included in Group A (audit High, same class)

| ID | Remediation |
|----|-------------|
| A8-018 Office tasks/events/documents/status-quo | **Remediated** mutations with org-bound lookup |
| A8-019 Release-workspace children | **Remediated** deliverables, milestones, approvals, publications, videos, marketing |
| A8-020 Playlists | **Remediated** via `tenant_id` / `created_by` (no `organization_id` column) |
| A8-032 v1 catalog tracks/labels | **Tracks** org-scoped; **labels** empty fail-closed (no ownership column) |

---

## 2. Authorization mechanism

Canonical pattern implemented in `lib/auth/resource-authorization.ts`:

```
requireOrganization() / requireOrgAuth()
        ↓
server-derived OrganizationContext.organizationId (or legacyIntOrgId)
        ↓
require*InOrg(id, ctx)  → findFirst({ id, org-scope })
        ↓
404 if missing (non-leaking)
        ↓
mutation
```

- **Never** trusts client `organizationId` / `tenantId` / ownership fields (stripped on write).
- Invalid legacy int scope **fails closed** (`ORG_SCOPE_UNAVAILABLE` 403) — does not invent org `1` from garbage input in the helper (uses configured `legacyIntOrgId` only when positive).
- Cross-tenant access returns **404 NOT_FOUND**, not 403 (non-enumeration).

---

## 3. Ownership relationships used

| Resource | Ownership (from Prisma schema) |
|----------|--------------------------------|
| artists, releases, works | `organization_id` (UUID) |
| contracts | `organization_id` (Int) **or** `tenant_id` (UUID) |
| tracks | No `organization_id` → `tenant_id` **or** primary `releases.organization_id` **or** `works.organization_id` **or** secondary `track_releases` → release org |
| royalties | No `organization_id` → `tenant_id` **or** linked artist/work/track ownership |
| playlists | No `organization_id` → `tenant_id` **or** (`created_by` + null `tenant_id`) |
| office tasks/events/documents/status_quo | `organization_id` (UUID) |
| workspace_* children | `organization_id` (UUID) |
| attachments (files) | `organizationId` on `Attachment` |

### Intentionally not guessed

| Resource | Reason |
|----------|--------|
| **labels / publishers / pros** | No org ownership column; writes remain platform-global risk (A8-020 residual for those entities) |
| **activities** | No org column on `activities` |
| **office audit-logs list** | Partial; detail helper exists for int/tenant scope |
| **release-workspace marketing** | Remediated |
| Privilege findings A8-011–016 | Out of Group A scope |

---

## 4. Routes / files changed

### New

- `lib/auth/resource-authorization.ts`
- `lib/auth/__tests__/resource-authorization-idor.test.ts`
- `docs/platform/identity/a8-step3-idor-remediation-report.md`

### Catalog / finance / files

- `app/api/artists/route.ts` — PUT/DELETE org-bound
- `app/api/releases/route.ts` — PUT/DELETE org-bound; track assign checks org
- `app/api/works/route.ts` — PUT/DELETE org-bound
- `app/api/contracts/route.ts` — PUT/DELETE org-bound before nested deletes
- `app/api/tracks/route.ts` — full GET/POST/PUT/DELETE org scope
- `app/api/royalties/route.ts` — GET/POST/PUT/DELETE org scope
- `app/api/playlists/route.ts` — full CRUD org/user scope
- `app/api/files/route.ts` — path access **disabled**; attachment id + org only
- `app/api/v1/royalties/route.ts` — filter by key org
- `app/api/v1/catalog/route.ts` — tracks scoped; labels fail-closed empty

### Office / workspace

- `app/api/office/tasks/route.ts`
- `app/api/office/events/route.ts`
- `app/api/office/documents/route.ts`
- `app/api/office/status-quo/route.ts`
- `app/api/release-workspace/deliverables/route.ts`
- `app/api/release-workspace/milestones/route.ts`
- `app/api/release-workspace/approvals/route.ts`
- `app/api/release-workspace/publications/route.ts`
- `app/api/release-workspace/videos/route.ts`
- `app/api/release-workspace/marketing/route.ts`

### Package

- `package.json` — script `test:a8-idor`

---

## 5. Tests added

| Test | Command | Purpose |
|------|---------|---------|
| Multi-org IDOR unit suite | `npm run test:a8-idor` | Two orgs (A/B); own access; cross-tenant deny; 401/403/404 semantics; fail-closed legacy int |

Assertions covered:

- Org A scope matches A resources only  
- Org A cannot match Org B tenant-scoped rows  
- Missing auth / forbidden / not-found status mapping  
- No inventing org scope from invalid int  

---

## 6. Test results

```
npx tsx lib/auth/__tests__/resource-authorization-idor.test.ts
=== Results: 13 passed, 0 failed ===
```

`organization-context.test.ts` requires `DATABASE_URL` (pre-existing; not run against production). No production connection used for this step.

---

## 7. Findings intentionally left open

| ID / area | Why left open |
|-----------|----------------|
| A8-001, A8-002 | Diagnostics (not Group A IDOR) |
| A8-011–A8-016 | Privilege escalation (Group B+) |
| A8-017 export `parseInt(uuid)\|\|1` | High isolation bug; not in Group A list of resources (dependency optional) |
| labels/publishers/pros global mutate | **Ambiguous ownership** — no org column; not inventing schema |
| activities global | No org column |
| Dual IAM stack (A8-029) | Broader cutover |
| Full HTTP integration against two seeded orgs | Unit tests prove filter/ownership logic; live multi-org seed not authorized here |

---

## 8. Production confirmation

| Action | Status |
|--------|--------|
| Neon production writes | **None** |
| Prisma migrate / db push | **None** |
| Bootstrap / password reset | **None** |
| Vercel env / redeploy | **None** |
| Business data modification | **None** |

All work was local application code + unit tests only.

---

## 9. Residual risk notes

1. **Tracks/royalties** isolation depends on correct `tenant_id` stamps and/or release/work links. New track creates stamp `tenant_id = ctx.organizationId`. Legacy unlinked rows may become invisible to all orgs (fail closed) until backfilled — safer than cross-tenant leak.  
2. **Contracts** still use deployment-level `legacyIntOrgId` for INT column; multi-true-tenant contract isolation remains limited by that legacy model (helper refuses non-positive ints).  
3. **Playlists** with only foreign `created_by` and null `tenant_id` remain edge cases; new creates stamp `tenant_id`.  
4. Groups B–E still required before multi-org production trust.

---

## 10. Verdict

**A.8 Step 3 Group A (IDOR) — COMPLETE for scoped resources listed above.**

Critical catalog/finance/files/workspace/office IDOR mutation paths now require:

`auth → org context → org-scoped resource → mutate`.

Privilege-escalation findings A8-011–016 remain for subsequent groups.
