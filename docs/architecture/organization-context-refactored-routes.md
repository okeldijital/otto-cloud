# Refactored Routes — Organization Context

**Date:** 2026-07-20  
**Module:** `lib/auth/organization-context.ts`

All listed routes resolve organization scope via `requireOrganization()` / `getOrganizationContext()` rather than ad-hoc `session.user.organization_id`.

---

## Auth & organization lifecycle

| Route | Change |
|-------|--------|
| `app/api/auth/register/route.ts` | No auto-org UUID; user only + `requiresOrganization` |
| `app/api/organizations/switch/route.ts` | Updates membership + `tenant_id` + `organization_id`; returns claims for JWT `session.update()` |
| `app/api/organizations/route.ts` | Create org sets both user claims |
| `app/api/organizations/current/route.ts` | Uses `requireOrganization()` |
| `app/api/invitations/accept/route.ts` | Sets `organization_id` + `tenant_id` from invitation |

## Catalog

| Route | Scope |
|-------|--------|
| `app/api/artists/route.ts` | UUID org + `is_deleted: false` |
| `app/api/releases/route.ts` | UUID org + `is_deleted: false` |
| `app/api/works/route.ts` | UUID org + soft-delete |
| `app/api/tracks/route.ts` | Auth via context; **global entity** (no column) |
| `app/api/labels/route.ts` | Auth via context; **global entity** |
| `app/api/publishers/route.ts` | Auth via context; **global entity** |
| `app/api/search/route.ts` | UUID org for scoped entities |

## Bulk-migrated modules (requireOrganization)

- `app/api/workspaces/**`
- `app/api/workspace/**`
- `app/api/release-workspace/**`
- `app/api/office/**`
- `app/api/reports/**`
- `app/api/notifications/route.ts`
- `app/api/api-keys/route.ts`
- `app/api/subscriptions/route.ts`
- `app/api/usage/route.ts`
- `app/api/users/route.ts`
- `app/api/contracts/route.ts`
- `app/api/export/route.ts`
- `app/api/import/route.ts`
- `app/api/network/individuals/route.ts`
- `app/api/network/organizations/route.ts`
- `app/api/network/health/route.ts`
- `app/api/ai/**` (analytics, audit, contracts, core-write, draft, release-integration, royalty, route)
- `app/api/iam/teams/route.ts`, `app/api/iam/users/route.ts`
- `app/api/admin-of-works/works/route.ts`

---

## Shared libraries

| File | Change |
|------|--------|
| `lib/auth.ts` | JWT claims via `resolveSessionOrgClaims`; supports `trigger: "update"` |
| `lib/org.ts` | Re-exports organization-context; deprecated sync helpers |
| `lib/auth/migration-compat.ts` | Sole home of legacy catalog UUID |
| `lib/auth/organization-context.ts` | Single resolver |

---

## Client contract for org switch

```ts
const res = await api.post("/organizations/switch", { tenant_id });
const { organizationId, tenantId, organization_id, tenant_id } = res.data;
await update({ organizationId, tenantId, organization_id, tenant_id }); // next-auth
```

Without `session.update()`, the JWT will lag until re-login.
