# A.8 Step 2 — Authorization Boundary Audit

**Status:** FINDINGS REQUIRE REMEDIATION  
**Date:** 2026-08-12  
**Repository:** otto-cloud  
**Mode:** Read-only (no code, database, Neon, Vercel, or env changes)

---

## 1. Baseline

| Item | Value |
|------|--------|
| Branch | `main` |
| HEAD | `3cbcf03fcf18ec4e7ff6b54d8b471a2190ec8992` |
| Message | `feat(iam): deliver password-reset emails via Resend with log fallback` |
| Working tree | Dirty: `.gitignore` modified; untracked production access/recovery reports under `docs/platform/identity/` |
| Node | v24.17.0 |
| npm | 11.13.0 |
| Primary scripts | `dev`, `build`, `start`, `lint`, `bootstrap:iam`, `reset:iam-password`, many `test:*` |
| Build | `next build` |
| Lint | `next lint` |
| Auth/IAM tests | `test:identity` (platform identity A.1–A.6), `test:org-context` |
| Domain tests | documents, rights, royalties, contracts, projections, events — **not** HTTP IDOR suites |

**No commits made.**

---

## 2. Coverage

| Scope | Count / notes |
|-------|----------------|
| API route files (`app/api/**/route.ts`) | **207** |
| Routes with auth markers (`getServerSession` / `requireOrganization` / `requirePermission` / platform identity) | **~192** |
| Routes without those markers | **15** (includes intentional public + weak diagnostics) |
| Routes using Prisma | **~114** |
| `requireOrganization` usage | **~130** route files |
| `getServerSession` usage | **~92** route files |
| `requirePermission` (platform identity) | **~18** route files |
| Server actions (`"use server"`) | **None found** in app/components/lib |
| Middleware (`middleware.ts` root) | **None** at app root; auth is per-route |
| Auth utilities | `lib/auth/session.ts`, `lib/auth/organization-context.ts`, `lib/platform/identity/**`, `lib/iam.ts`, `lib/permissions.ts` |
| Diagnostic endpoints | `/api/health`, `/api/test-db`, `/api/platform/health/identity`, `/api/platform/metrics/identity`, `/api/backup`, `/api/v1` |
| Services / repositories | Platform identity, documents, contracts, rights, royalties, notifications, lifecycle, import/export |
| Tests reviewed | IAM unit tests (rbac, session, mfa, password, cutover); org-context unit test; **no HTTP IDOR/BOLA suite** |

Machine-readable route inventory: all 207 paths under `app/api/**/route.ts` (enumerated during audit).

---

## 3. Preferred authorization pattern (reference)

```
authenticated identity
        ↓
active organization membership
        ↓
required permission
        ↓
resource belongs to organization
        ↓
operation
```

**Better implementations (keep as targets):** rights/entitlements services with `{ id, organizationId }`; storage download with `requireOrganization` + attachment org check; platform `requirePermission(req, …)` admin org CRUD (when path id is constrained); notes mutations with `findFirst({ id, organization_id })`.

**Dominant anti-pattern:**

```
getServerSession()  // or requireOrganization for lists only
        ↓
findUnique({ where: { id } })
        ↓
update/delete
```

---

## 4. Findings table

| ID | Severity | Area | Finding | Exploitability | Remediation |
|----|----------|------|---------|----------------|-------------|
| **A8-001** | **Critical** | Diagnostic | `GET /api/test-db` is **public**, runs Prisma, returns `user_count` and DB connectivity (errors may include messages). | Any unauthenticated client. | Remove, auth-gate, or disable in production; never return counts. |
| **A8-002** | **Critical** | Diagnostic | `GET /api/platform/health/identity` is **public**; returns IAM identity/session/org counts. | Unauthenticated recon of IAM posture. | Require auth/admin; strip inventory details for public health. |
| **A8-003** | **Critical** | IDOR / catalog | `PUT`/`DELETE` `/api/releases` load/mutate by `findUnique({ id })` without `organization_id` (GET is org-scoped). | Any authenticated user can modify/delete another org’s release. | `requireOrganization` + `findFirst({ id, organization_id })` (404 if missing). |
| **A8-004** | **Critical** | IDOR / catalog | Same pattern on `PUT`/`DELETE` `/api/artists`. | Cross-tenant artist mutation/delete. | Same org-bound lookup. |
| **A8-005** | **Critical** | IDOR / catalog | Same pattern on `PUT`/`DELETE` `/api/works` (cascade deletes related rows). | Cross-tenant work wipe. | Same; verify cascade targets org. |
| **A8-006** | **Critical** | IDOR / catalog | Same pattern on `PUT`/`DELETE` `/api/contracts`. | Cross-tenant contract mutation/delete. | Same. |
| **A8-007** | **Critical** | IDOR / global entity | `/api/tracks` treats tracks as global; `findUnique({ id })` and list/search without tenant filter (documented schema debt). Mutations session-only. | Full-platform track R/W for any org member. | Add org binding (column or via owned release); enforce on all methods. |
| **A8-008** | **Critical** | IDOR / finance | `/api/royalties` aggregates/lists/mutates **without** org filter; session only. | Cross-tenant financial data and deletes. | Scope by org (schema or join); org-bound mutations. |
| **A8-009** | **Critical** | IDOR / API key | `/api/v1/royalties` uses API key auth but **ignores** key `orgId` when querying royalties. | Any valid key with royalties scope reads all tenants. | Always filter by `orgId` from key. |
| **A8-010** | **Critical** | IDOR / files | `GET /api/files?path=` authenticated only; path client-controlled; no attachment/org ownership. | Arbitrary file read for any logged-in user (resolver-dependent). | Serve by attachment id + org check only. |
| **A8-011** | **Critical** | Privilege escalation | `PUT /api/admin/users` allows `requireAdmin()` holders to set **`is_superuser`** on arbitrary `users.id`. | Org admin → platform superuser. | Forbid `is_superuser` unless true platform superuser; bind targets to org. |
| **A8-012** | **Critical** | Privilege escalation / IAM | `/api/admin/organizations/[id]/*` checks permissions on **session org**, then mutates **path `:id` org** (members, roles, ownership, invitations, archive). Services trust path id. | Org A admin manages Org B. | Require `params.id === ctx.organizationId` unless platform-level admin flag. |
| **A8-013** | **Critical** | Privilege escalation | `MembershipService` / `InvitationService` accept any `roleKey` (including owner/admin) without rank checks; services have **no** actor authorization. | Invite/set_role to owner if route under-protected. | Role hierarchy; ownership transfer only for owner transfer. |
| **A8-014** | **Critical** | Privilege escalation / legacy IAM | `POST /api/iam/users` with `users.manage`: assign/remove roles, suspend, **reset password**, update `role` for **any** `user_id` without same-org check. | Cross-tenant account takeover. | Require target in actor org; prefer platform identity APIs. |
| **A8-015** | **Critical** | Privilege escalation | `POST /api/users?action=invite` only needs session + org context — **no** `users.invite`/`users.manage`; accepts client `role`. | Any member creates elevated users. | Require permission; ignore client role unless permitted. |
| **A8-016** | **Critical** | Auth model | Owner role catalog grants **ALL** permissions including `platform.admin`; middleware treats `platform.admin` / super roles as **isSuperAdmin** short-circuit. | Org owner becomes platform-global admin for admin surfaces. | Remove `platform.admin` from org templates; redefine super-admin as environment/global claim. |
| **A8-017** | **High** | Isolation bug | `export` (and similar) use `parseInt(orgUuid) \|\| 1` → most orgs collapse to **org id 1**. | Wrong-tenant export / data exposure. | Use UUID/`legacyIntOrgId` helpers; never `parseInt(uuid)`. |
| **A8-018** | **High** | IDOR | Office `tasks`/`events`/`documents`/`status-quo`/`activities`/`audit-logs` mutations or detail by id without org; contrast notes which are org-scoped. | Cross-tenant office data R/W. | Org-bound findFirst on all methods. |
| **A8-019** | **High** | IDOR | Release-workspace child routes (approvals, milestones, deliverables, videos, publications, marketing) mutate by id without workspace/org join. | Cross-workspace mutation. | Resolve workspace org before mutate. |
| **A8-020** | **High** | IDOR | Playlists, labels, publishers, pros, network graph: global list/mutate for any authenticated user. | Cross-tenant catalog/network. | Org-scope or mark platform-global intentionally with admin-only write. |
| **A8-021** | **High** | IDOR | `admin-of-works` PUT/DELETE by id without org filter. | Cross-tenant work admin. | Org-bound where clause. |
| **A8-022** | **High** | Files | Storage upload trusts client `entityType`/`entityId`; release upload trusts `release_id` without org check. | Attach files to foreign entities. | Verify entity ownership before store. |
| **A8-023** | **High** | IAM | `/api/iam/roles` GET lists all roles; POST accepts `body.organization_id`; teams DELETE by id only. | Cross-tenant RBAC admin. | Scope by org; ignore body org id. |
| **A8-024** | **High** | Membership | `/api/organizations/members` allows any org member to add/remove members (owner protected only on remove). | Horizontal privilege / org disruption. | Require `users.manage` / owner. |
| **A8-025** | **High** | Service layer | Document/lifecycle/membership services trust caller-supplied `organizationId` / `contractId`; lifecycle `getOrCreate` keys by `contractId` only. | Route bug → silent cross-tenant. | Enforce org in service; composite keys. |
| **A8-026** | **High** | Admin | Global session search / MFA reset under org-level `security.manage` without target-org binding. | Cross-tenant session kill / MFA wipe. | Restrict to same-org identities or platform admin only. |
| **A8-027** | **Medium** | Diagnostic | Public `/api/health` exposes DB connectivity (acceptable liveness; prefer minimal body in prod). | Low recon value. | Optionally hide DB detail outside internal networks. |
| **A8-028** | **Medium** | Client trust | Reminders accept `body.userId` defaulting to self. | Create reminders for other users. | Force `ctx.userId` / identity id. |
| **A8-029** | **Medium** | Dual stack | Legacy `users`/`roles`/`user_roles` vs platform `iam_*` dual control planes increase bypass surface. | Confusing weaker paths remain live. | Deprecate legacy IAM routes; single stack. |
| **A8-030** | **Medium** | Error semantics | Many IDOR paths return **404** “not found” vs **403**; some leaks via distinct errors; inconsistent 401/403. | Secondary info disclosure. | Uniform: unauth 401; authz fail 404 for cross-tenant resource. |
| **A8-031** | **Low** | Tests | Strong IAM unit tests; **no** automated HTTP IDOR/BOLA suite for catalog routes. | Regressions likely. | Add org isolation integration tests. |
| **A8-032** | **Low** | API key catalog | `/api/v1/catalog` filters artists/releases/works by org but **tracks/labels** unscoped. | Key-scoped tenant leak for those entities. | Align all entities with key org. |

---

## 5. Classification of findings

### Confirmed vulnerabilities (must remediate)

A8-001 … A8-016 (Critical), A8-017 … A8-026 (High).

### Potential / systemic (require remediation as design debt)

- Global tables without `organization_id` (tracks, royalties, labels, playlists, …).  
- Service-layer trust of caller org id (A8-025).  
- Dual IAM stacks (A8-029).  
- Incomplete permission enforcement on mutations (session ≠ authorization).

### Safe / intentional patterns

| Pattern | Examples |
|---------|----------|
| Public auth | `/api/auth/login`, register, password forgot/reset, email verify, invitation token accept |
| Liveness | `/api/health` (DB ping only) |
| Self session | `/api/auth/session`, `/me`, logout, own MFA/password change |
| Org-scoped lists | Many GET paths with `requireOrganization` + `organization_id` filter |
| Platform admin org create | `/api/admin/organizations` POST with `requirePermission` + creator identity |
| Document download | Storage download + contract document services with org check |
| Rights/entitlements services | `findFirst({ id, organizationId })` |
| API key helper | `withApiAuth` binds org from key (when handlers use `orgId`) |

### False positives / not automatically bugs

- Static hits on `role ===` in UI chat rendering.  
- `isOwner` fields in DTOs/membership responses.  
- Public password-policy GET.  
- `findUnique` inside services **after** route already verified ownership (must verify call chain).  
- Superuser-only backup (high impact if superuser compromised, but intentionally gated — residual risk).

---

## 6. Authentication audit summary

| Class | Typical routes |
|-------|----------------|
| **PUBLIC** | login, register, forgot/reset password, verify-email, invitation accept (token), health, test-db ⚠️, platform identity health ⚠️, v1 discovery |
| **AUTHENTICATED** | session, me, many catalog mutations (⚠️ often insufficient) |
| **ORG_SCOPED** | requireOrganization lists (artists/releases GET, works GET, api-keys, …) |
| **PERMISSION_REQUIRED** | admin/* (partial), iam mutations, some auth org members (newer) |
| **RESOURCE_SCOPED** | rights, entitlements, some contract documents, notes |
| **PLATFORM_ADMIN** | intended for backup/superuser; currently over-granted via A8-016 |

**Flags observed:** Prisma without auth (diagnostics); session without permission; mutations without resource org proof; client `role` / `user_id` / `path` / `organization_id` / `entityId` reaching DB.

---

## 7. Organization / tenant isolation

| Origin of org/tenant id | Safe when… | Unsafe when… |
|-------------------------|------------|--------------|
| Session / IAM membership (`requireOrganization`) | Lists and correct mutations | Mutations ignore it and use id-only |
| Path `:organizationId` | Equals session org or platform admin | Admin APIs use path id without equality check (A8-012) |
| Body `organization_id` | Never trusted | IAM roles POST (A8-023) |
| `parseInt(uuid)\|\|1` | Never | Export / analytics (A8-017) |
| API key org | Always applied | v1 royalties (A8-009) |

---

## 8. IAM privilege escalation summary

| Vector | Severity |
|--------|----------|
| Org admin → `is_superuser` (A8-011) | Critical |
| Cross-org admin org APIs (A8-012) | Critical |
| Assign owner/admin role freely (A8-013) | Critical |
| Legacy IAM password reset any user (A8-014) | Critical |
| Member invite with role (A8-015) | Critical |
| Owner includes `platform.admin` → isSuperAdmin (A8-016) | Critical |
| Global session/MFA admin (A8-026) | High |

Platform identity **authentication** stack (login/session/MFA) is substantially stronger than **legacy catalog/IAM HTTP** surfaces.

---

## 9. Diagnostic endpoints

| Endpoint | Classification | Notes |
|----------|----------------|-------|
| `/api/health` | PUBLIC-SAFE (minimal) | OK if only connected/ok |
| `/api/test-db` | **SHOULD-NOT-BE-PUBLIC** | user_count + errors |
| `/api/platform/health/identity` | **SHOULD-NOT-BE-PUBLIC** | IAM counts |
| `/api/platform/metrics/identity` | ADMIN-ONLY (auth required) | OK |
| `/api/backup` | ADMIN-ONLY (superuser) | High impact if superuser wrong |
| `/api/v1` | PUBLIC-SAFE | discovery |
| `/api/auth/*` public subset | PUBLIC-SAFE | intentional |

---

## 10. Error semantics

| Expected | Observed |
|----------|----------|
| Unauthenticated → 401 | Common for session checks |
| Unauthorized → 403 | Used for permission/admin; IDOR often **404** or silent success path |
| Non-leaking cross-tenant | **Inconsistent** — many routes return resource if id known (success) rather than 404 |

---

## 11. Tests

| Area | Coverage |
|------|----------|
| IAM auth/session/MFA/password/RBAC unit | Strong (`test:identity`) |
| Org context unit | Present |
| HTTP IDOR / multi-tenant route tests | **Missing** |
| IAM admin privilege escalation tests | **Missing** |
| Diagnostic exposure tests | **Missing** |

---

## 12. Production safety of this audit

| Action | Performed? |
|--------|------------|
| prisma migrate / db push / seed / bootstrap | **No** |
| password reset / IAM writes | **No** |
| Vercel / Neon / env changes | **No** |
| INSERT/UPDATE/DELETE | **No** |

---

## 13. Recommended remediation order (not executed)

1. **Kill or lock** public diagnostics (A8-001, A8-002).  
2. **Standard mutation guard:** every write uses session org + `findFirst({ id, organization_id })`.  
3. **Fix privilege bombs:** superuser write, path-org mismatch, owner→platform.admin, legacy iam/users.  
4. **Close member self-service elevation:** invite/members without manage perms.  
5. **Scope global entities** or mark platform-global + admin-only.  
6. **Fix `parseInt(uuid)||1`**.  
7. **Service-layer org enforcement** so routes cannot forget.  
8. **Add IDOR integration tests** before A.8 implementation expands surface.

---

## 14. Final verdict

# A.8 STEP 2 — FINDINGS REQUIRE REMEDIATION

Credible and confirmed authorization-boundary defects exist across catalog mutations, finance, files, diagnostics, and IAM administration. Platform identity authentication for login/session is comparatively mature; **multi-tenant data plane and legacy IAM HTTP surfaces are not ready** for multi-organization production trust without remediation.

**Do not treat empty production catalogues as evidence of safety** — IDOR classes remain valid once data and multiple orgs exist.

---

*End of A.8 Step 2 audit. No remediation performed.*
