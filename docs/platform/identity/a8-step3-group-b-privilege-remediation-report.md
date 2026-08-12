# A.8 Step 3 Group B — Privilege Escalation Remediation Report

**Date:** 2026-08-12  
**Scope:** A8-011 … A8-016  
**Production Neon / Vercel / IAM data / business data:** **untouched**

---

## 1. Findings addressed

| ID | Finding | Disposition |
|----|---------|-------------|
| **A8-011** | `/api/admin/users` allows org admin to set `is_superuser` | **Fixed** — requires platform authority; org admins get 403 |
| **A8-012** | Admin org path `:id` not bound to session org | **Fixed** — `assertAdminOrganizationPath`; list-all-orgs requires platform authority |
| **A8-013** | Unrestricted `roleKey` (owner/admin) | **Fixed** — `assertCanGrantOrgRole` rank + assignable set; owner only via transfer |
| **A8-014** | Legacy `/api/iam/users` cross-tenant password reset / role assign | **Fixed** — target must be in actor org; password reset bounded; superuser updates blocked |
| **A8-015** | `/api/users` invite without permission + client role | **Fixed** — requires `users.invite`/`users.manage`; role via `normalizeLegacyInviteRole` |
| **A8-016** | Owner template includes `platform.admin` → isSuperAdmin | **Fixed** — owner seed excludes `platform.admin`; isSuperAdmin no longer derived from org `platform.admin` |

---

## 2. Authorization model (after)

```
Organization authority
  authenticated membership
  org-scoped permissions (users.manage, users.invite, organizations.manage, …)
  may administer only session organization
  may grant roles strictly below own rank (never owner via set_role / invite)
  cannot set is_superuser
  cannot list/create all platform organizations

Platform authority
  isSuperAdmin (legacy users.is_superuser OR IAM role super_admin)
  OR explicit permission platform.admin (not granted by owner template)
  may operate cross-organization
  may set is_superuser
  may list/create/archive organizations globally
```

### Role hierarchy (grant rule)

`viewer < member < contributor < reviewer < editor < manager < administrator/org_admin < owner`

- Cannot grant rank ≥ own rank (except platform authority).  
- Cannot assign `owner` via invite/set_role (ownership transfer only).  
- Cannot assign `super_admin` / `platform_admin` via org APIs.

### Before → after (behavior)

| Operation | Before | After |
|-----------|--------|--------|
| Org admin PUT `is_superuser: true` | Allowed if `requireAdmin` | **403 PLATFORM_AUTHORITY_REQUIRED** |
| Org admin PATCH `/admin/organizations/{otherOrg}/members` | Allowed | **403 ORG_SCOPE_DENIED** |
| set_role `owner` | Allowed | **403 ROLE_GRANT_DENIED** |
| Member invite with `role: "owner"` | Allowed | **403** (permission + role grant) |
| Owner permissions include `platform.admin` | Yes (ALL) | **No** (ORG_OWNER excludes it) |
| isSuperAdmin from org `platform.admin` | Yes | **No** (only super_admin role / DB superuser flag) |
| iam/users reset-password any id | Allowed with users.manage | **Same-org only** (404 if other org) |

---

## 3. Affected routes / services

| Path | Change |
|------|--------|
| `lib/auth/privilege-authorization.ts` | **New** — platform vs org, role grants, superuser, legacy user binding |
| `lib/platform/identity/middleware/assert-org-scope.ts` | **New** — path org binding |
| `lib/platform/identity/permissions/catalog.ts` | Owner = ORG_OWNER (no platform.admin); catalog version **6** |
| `lib/platform/identity/authentication/current-identity-service.ts` | isSuperAdmin = super_admin role **or** legacy `users.is_superuser` only |
| `lib/permissions.ts` | requireAdmin without role-string bridge; **requirePlatformAdmin** added |
| `app/api/admin/users/route.ts` | Org-scoped list/mutate; superuser only for platform |
| `app/api/admin/organizations/route.ts` | List/create require platform authority |
| `app/api/admin/organizations/[id]/route.ts` | Path scope + archive platform-only |
| `app/api/admin/organizations/[id]/members/route.ts` | Path scope + role grant checks |
| `app/api/admin/organizations/[id]/members/[memberId]/route.ts` | Path scope + role grant + ownership transfer limited |
| `app/api/admin/organizations/[id]/invitations/route.ts` | Path scope + role grant |
| `app/api/iam/users/route.ts` | Org-bound targets; password reset scoped; no superuser via body |
| `app/api/users/route.ts` | Invite requires permission; role normalized/bounded |
| `app/api/auth/organizations/members/route.ts` | assertCanGrantOrgRole on POST |

---

## 4. Tests executed

| Suite | Command | Result |
|-------|---------|--------|
| Privilege escalation | `npm run test:a8-privilege` | **26 passed** |
| Group A IDOR regression | `npm run test:a8-idor` | **13 passed** |

Coverage includes:

- Org isolation of organization targets  
- Role escalation denials (member→owner, admin→owner, owner→platform roles)  
- Superuser flag denied for org admin  
- Invite role normalization  
- Owner template without `platform.admin`  

`npm run typecheck` is not defined as a script in package.json; full `tsc` was not required for gate. ESLint on changed surfaces was attempted (project config may vary).

---

## 5. Residual findings (not Group B)

| Item | Notes |
|------|--------|
| Existing DB memberships | Production/lab rows already seeded with old owner→ALL permissions are **not** re-seeded here (no production writes). Re-run org role seed / bootstrap role re-sync under separate ops if needed. |
| A8-001/002 diagnostics | Group A left open / Group C candidate |
| Dual IAM stacks | Still present; legacy routes hardened but not deleted |
| `organizations.manage` on org admin | Still grants org admin APIs **within** bound org (intentional) |

---

## 6. Production confirmation

| Action | Performed? |
|--------|------------|
| Neon production writes | **No** |
| IAM bootstrap / password reset | **No** |
| Migrations | **No** |
| Vercel env / deploy | **No** |
| Business data changes | **No** |

---

## 7. Completion checklist

| Criterion | Status |
|-----------|--------|
| A8-011–A8-016 explicit dispositions | **Yes** |
| Platform vs organization authority separated | **Yes** |
| Client-controlled privilege escalation eliminated (targeted surfaces) | **Yes** |
| Password-reset authority bounded | **Yes** |
| Role assignment bounded | **Yes** |
| Org owner no longer implicitly platform admin (code/seed) | **Yes** |
| Automated negative tests | **Yes** (26) |
| Production unmodified | **Yes** |

**Group B complete.** Do not auto-proceed to Group C.
