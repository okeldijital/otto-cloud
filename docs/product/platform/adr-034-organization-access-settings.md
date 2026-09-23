# ADR-034 — Organization Access Settings Simplification

**Status:** Accepted  
**Date:** 2026-09-22

## Decision

Organization access administration has one canonical surface:

`Settings → Organization`

The surface is intentionally organized around the administrator's jobs:

1. **Overview** — explain the access model and provide entry points.
2. **Members** — manage organization membership and assign roles.
3. **Roles & permissions** — inspect system roles, create/edit custom roles, and review the permission matrix.
4. **Security** — expose organization-level IAM guardrails.

There is no standalone user-facing "Permissions" section. Permissions are properties of roles and are therefore reviewed in the context of a role.

## Authorization model

Otto uses tenant-scoped RBAC:

`Identity → Organization Membership → Organization Role → Permissions`

Permissions are the authorization primitive. Application endpoints must check permissions rather than branching on role names.

System roles are provisioned per organization. Custom roles are also organization-scoped.

A role may never be assigned across organizations. The database enforces this invariant through a composite foreign key from membership `(roleId, organizationId)` to role `(id, organizationId)`.

## Privilege delegation

A user may create or edit a custom role only with permissions they already possess. `platform.admin` is never grantable through organization IAM.

Ordinary organization administration cannot assign the `owner` role. Ownership transfer remains a separate workflow.

System roles are immutable from the organization UI.

## Failure behaviour

Authorization failures fail closed.

If persisted IAM data is inconsistent during rollout, the current identity and permission resolution paths reject the invalid role scope rather than resolving permissions from another organization.

## Data repair

The migration `20260922020000_iam_org_role_scope_hardening`:

- provisions missing system roles for existing organizations;
- repairs membership references to roles belonging to another organization by matching the role key within the correct organization;
- repairs missing organization owner pointers when there is exactly one active owner membership;
- makes organization ownership of roles mandatory;
- makes membership role assignment mandatory;
- enforces the tenant-scoped role foreign key.

## Operational guidance

Role and membership changes must be tested at the HTTP boundary, not only in the UI. The UI is an affordance; the API is the security boundary.

Permission changes should invalidate effective-permission caches through `organization.roleVersion`.

This design deliberately keeps the RBAC model flat. Resource-specific or relationship-specific authorization remains a separate layer and must not be encoded by creating an excessive number of roles.