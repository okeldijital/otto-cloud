# Multi-Tenant Domain Model

**Status:** Normative  
**ADR:** [ADR-001](./decisions/ADR-001-isolation-boundary.md)  
**Date:** 2026-07-20  

---

## 1. Overview

Otto Cloud is a multi-organization platform. A user authenticates once and may belong to multiple organizations. Every data query for owned business objects is scoped to the **active organization** for that request.

```
User
  ↓
Membership (tenant_users)
  ↓
Active Organization (session)
  ↓
Organization Context (lib/auth/organization-context.ts)
  ↓
Application Query (organization_id = context.organizationId)
```

There is **one** resolution path: `getOrganizationContext()`.

---

## 2. Core entities

### 2.1 Tenant (legacy name)

| | |
|--|--|
| **Meaning** | Historical name for the customer Organization record |
| **Table** | `tenants` |
| **PK** | UUID `id` |
| **Note** | Not a parent of Organization. Do not introduce a separate tenant hierarchy without a new ADR. |

### 2.2 Organization

| | |
|--|--|
| **Meaning** | Operational business unit; **authoritative isolation boundary** |
| **Table** | `tenants` (see ADR-001) |
| **Owns** | Artists, releases, works, contracts (scoped), workspaces, office docs, reports, attachments, AI runs |
| **Isolation key** | UUID string used as `organization_id` on UUID-scoped tables |

### 2.3 User

| | |
|--|--|
| **Meaning** | Identity (login principal) |
| **Table** | `users` |
| **May** | Belong to multiple organizations via membership |
| **Columns of note** | `organization_id` (active catalog scope), `tenant_id` (active org, synced), `role`, `is_superuser` |

### 2.4 Membership

| | |
|--|--|
| **Meaning** | Relationship between User and Organization |
| **Table** | `tenant_users` |
| **Stores** | `role_id`, `is_default`, invite/accept timestamps |
| **Rules** | Exactly one `is_default` membership preferred per user; switcher sets default |

### 2.5 Active Organization

The single organization selected for the current session.

Resolved order:

1. Explicit switch target (JWT after `update()`)
2. User’s default membership (`tenant_users.is_default`)
3. User’s `tenant_id` column
4. Compatibility: legacy catalog scope for imported data (see §6)
5. **Never** invent a new organization id

### 2.6 Network organization (non-tenant)

| | |
|--|--|
| **Table** | `organizations` (integer PK) |
| **Meaning** | Industry party: label, distributor, company contact |
| **Not** | A tenancy boundary |

---

## 3. Organization Context object

```ts
interface OrganizationContext {
  organizationId: string;      // UUID — use in catalog filters
  organization: OrganizationSummary;
  tenantId: string;            // Same as organizationId (compat alias)
  membership: MembershipSummary | null;
  role: string | null;
  permissions: string[];
  isSuperAdmin: boolean;
  userId: number;
  legacyIntOrgId: number;      // For INT-scoped tables only
  dataScopeSource: "membership" | "legacy-compat" | "superadmin";
}
```

Produced exclusively by `lib/auth/organization-context.ts`.

---

## 4. Query rules

### 4.1 UUID-scoped entities (must filter)

Artists, releases, works, workspaces, office documents/notes, reports, tasks, events, notes, usage, API keys, etc.

```ts
const ctx = await requireOrganization();
await prisma.artists.findMany({
  where: { organization_id: ctx.organizationId, is_deleted: false },
});
```

### 4.2 Integer-scoped entities (compat)

Contracts, individuals, contract_* children, some AI tables.

```ts
where: { organization_id: ctx.legacyIntOrgId }
```

### 4.3 Global entities (no column yet — deferred)

| Entity | Prisma | Notes |
|--------|--------|-------|
| Tracks | `tracks` | No `organization_id`; effectively global until schema change |
| Labels | `labels` | Global |
| Publishers | `publishers` | Global |
| PROs | `pros` | Global |

These **must not** invent a fake org filter. Document as technical debt; future PR adds UUID column + backfill.

### 4.4 Soft delete

Where `is_deleted` exists, list endpoints default to `is_deleted: false` unless the client requests archived records.

---

## 5. Lifecycle flows

### 5.1 Invitation (preferred join path)

```
Invitation (tenant_id = organization id)
  → Accept
  → Membership created
  → User active org set to invitation org
  → Catalog scope = resolveCatalogScope(orgId)
```

### 5.2 Create organization (explicit)

```
Authenticated user
  → POST /api/organizations { name }
  → tenants row + membership (owner)
  → User active org updated
  → Empty catalog (no implicit seed)
```

### 5.3 Registration (no implicit org)

```
POST /api/auth/register { email, password, name }
  → User only (is_active)
  → 201 + { requiresOrganization: true }
  → Client: accept invite OR create organization
```

Bare registration **must not** call `uuidv4()` for `organization_id`.

### 5.4 Organization switch

```
POST /api/organizations/switch { tenant_id }
  → Validate membership
  → Set is_default on membership
  → Update users.tenant_id + users.organization_id (catalog scope)
  → Client: session.update({ organizationId, tenantId })
  → JWT claims refreshed
  → Subsequent API calls use new context
```

---

## 6. Migration compatibility

Imported M2KR catalog rows use a single UUID scope (historically the DB default). That value lives **only** in `lib/auth/migration-compat.ts`.

| Function | Role |
|----------|------|
| `getLegacyCatalogScopeId()` | Returns env-configured legacy UUID |
| `resolveCatalogOrganizationId(orgId)` | Maps org → catalog filter id |
| `resolveLegacyIntOrgId(orgId)` | Maps org → int for legacy tables |
| `isLegacyCatalogOrg(orgId)` | Detection helper |

**Removal strategy:** After all catalog rows are re-keyed to real `tenants.id` values and verified, delete the mapping and the env vars. Tracked in remaining technical debt.

---

## 7. RBAC

- Superadmin (`is_superuser`): may resolve context without membership; still uses an explicit active org when set.
- Permissions loaded from `user_roles` → `role_permissions` → `permissions.code`.
- Org-level role from membership `role_id` or user.role string.
- Context does **not** bypass permission checks; routes still call `requirePermission` / IAM as today.

---

## 8. Forbidden patterns

```ts
// ❌ Direct session reads
const orgId = (session.user as any).organization_id;

// ❌ Silent default UUID outside compat
const orgId = x || "00000000-0000-0000-0000-000000000001";

// ❌ Auto-create org on register
organization_id: uuidv4()

// ❌ Switch only tenant_id
await prisma.user.update({ data: { tenant_id } }); // missing organization_id + JWT

// ❌ Second resolver
function getMyOrg() { ... }
```

```ts
// ✅
const ctx = await requireOrganization();
where: { organization_id: ctx.organizationId }
```
