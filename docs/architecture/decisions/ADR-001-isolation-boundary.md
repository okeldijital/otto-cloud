# ADR-001: Authoritative Data Isolation Boundary

**Status:** Accepted  
**Date:** 2026-07-20  
**Milestone:** Organization Context Consolidation  

---

## Context

Otto Cloud currently uses two parallel identity concepts in production code:

| Concept | Storage | Used by |
|---------|---------|---------|
| `organization_id` (UUID) | Catalog rows, JWT claim, user column | Artists, Releases, Works, most UUID-scoped APIs |
| `tenant_id` (UUID) | `tenants` table, `tenant_users`, JWT claim | Org switcher, invitations, settings/current org |
| `organization_id` (Int) | Contracts, individuals, some AI tables | Legacy integer-scoped modules |
| Network `organizations` | Integer PK catalog of industry parties | Labels/distributors as *entities*, not tenancy |

Registration creates a new random `organization_id` while the switcher only updates `tenant_id`. Catalog list APIs filter on one; membership lives on the other. Migrated M2KR data uses a single catalog-scope UUID that is not equal to any `tenants.id`.

The platform cannot ship features safely until one question is answered:

> **What is the authoritative data isolation boundary in Otto Cloud: the Tenant or the Organization?**

---

## Decision

**The authoritative data isolation boundary is the Organization.**

### Definitions (normative)

| Term | Meaning in Otto Cloud |
|------|------------------------|
| **Organization** | The operational business unit that owns catalog and workspace data. Isolation key for queries. |
| **Tenant** | *Legacy table/name* for the Organization entity (`tenants` / `tenant_users`). Not a second hierarchy. |
| **Membership** | Row in `tenant_users` linking a User to an Organization. |
| **Active Organization** | The Organization selected for the current session. Source of all org-scoped queries. |
| **Network organization** | Industry party in the `organizations` table (label, publisher, company). **Not** a tenancy boundary. |

### Normative rules

1. **One active Organization per session.** Every authenticated request resolves exactly one `organizationId` (UUID string) via `lib/auth/organization-context.ts`.
2. **Catalog and UUID-scoped tables filter on `organization_id = context.organizationId`.**
3. **The `tenants` table is the Organization registry.** `tenants.id` is the Organization primary key for membership, branding, billing, and (for new data) catalog scope.
4. **`tenant_id` on the session is an alias for the active Organization id**, kept in sync for backward compatibility during the transition. New code must not invent a second scope.
5. **Integer `organization_id` columns** use `context.legacyIntOrgId` from the compatibility layer until those tables are migrated to UUID.
6. **Registration never invents an Organization.** Membership is via invitation or an explicit “Create organization” flow.
7. **Organization switch updates:** membership default → user row → JWT claims → context → queries. All four stay synchronized.
8. **Hardcoded production UUIDs** exist only inside `lib/auth/migration-compat.ts` and are documented for removal.

### Why Organization (not Tenant)

- Existing product language and data model docs already call the customer unit “Organization” (`docs/architecture/01-data-model.md`: Organization → Prisma `tenants`).
- Catalog columns are named `organization_id`, not `tenant_id`.
- “Tenant” as a separate parent of many organizations would require a schema hierarchy that does not exist today and would delay stabilization.
- Collapsing to a single concept avoids dual filters (`tenant_id` OR `organization_id`) that caused empty Artists/Releases lists.

### Consequences

| Area | Implication |
|------|-------------|
| Session / JWT | Stores `organizationId` (authoritative) and `tenantId` (same value, compat). |
| Org switcher | Must update JWT via NextAuth `update()`, not only the DB. |
| Registration | No auto-created empty org; invite or explicit create. |
| Migrated catalog | Compatibility maps designated orgs to the legacy catalog scope UUID until data is re-keyed. |
| Tracks / labels / publishers | No `organization_id` column yet → documented as global (deferred schema work). |
| Future multi-org-per-customer | If needed later, introduce a true parent “Account” without renaming Organization’s isolation role. |

---

## Alternatives considered

### A. Tenant as isolation boundary

Rename all catalog filters to `tenant_id`. Rejected: large schema rewrite, migration framework churn, contradicts existing `organization_id` columns and product language.

### B. Dual filters (tenant OR organization)

Keep both indefinitely. Rejected: this is the bug class that emptied Artists/Releases.

### C. Remove all org filters (single-tenant mode)

Rejected by milestone constraints; multi-org isolation is required.

---

## Compliance checklist

New code must:

- [ ] Call `getOrganizationContext()` / `getCurrentOrganizationId()` — never read org from session ad hoc.
- [ ] Never hardcode `00000000-0000-0000-0000-000000000001` outside `migration-compat.ts`.
- [ ] Never create an Organization as a side effect of login or bare registration.
- [ ] Treat network `organizations` rows as catalog entities, not tenancy.
