# Authorization Audit (A.4.5)

## Target model

```ts
permissions.has("contracts.review")
// not: user.role === "admin"
```

## Canonical permissions

| Module | Keys |
|--------|------|
| Contracts | `contracts.view` `contracts.review` `contracts.promote` `contracts.manage` |
| Rights | `rights.view` `rights.review` `rights.manage` |
| Royalties | `royalties.view` `royalties.review` `royalties.manage` |
| Workspace | `workspace.view` `workspace.manage` |
| Platform | `platform.events.view` `platform.events.replay` `platform.admin` `notifications.manage` |
| Identity | `users.manage` `users.invite` `organizations.manage` `security.manage` |

## Middleware standard

| Helper | Use |
|--------|-----|
| `requireAuthentication` | Any logged-in identity |
| `requireActiveSession` | Non-expired session |
| `requireEmailVerification` | Verified email |
| `requireOrganization` | Org context required |
| `requirePermission` | Permission key(s) |

## Residual role bridges (documented debt)

Some paths still accept role strings as a **temporary bridge** while IAM roles are seeded:

| Location | Bridge | Follow-up |
|----------|--------|-----------|
| `lib/permissions.ts` `requireAdmin` | `role === org_admin` if no perms | Seed org_admin for all admins |
| `lib/iam.ts` `requireAdmin` | same | same |
| `components/ProtectedRoute.jsx` | role bridge | prefer permissions only |
| Module `permissions.ts` files | `role === viewer` for read-only | map viewer role → permission set |

**Business modules must not introduce new role comparisons.**

## App shell updated

- ProtectedRoute → permission-aware admin check  
- Sidebar admin section → permission-aware  
