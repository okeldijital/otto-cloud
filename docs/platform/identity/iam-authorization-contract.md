# A.8 — IAM / Authorization Contract

Status: **Implemented baseline — route audit and full application acceptance remain open**

## Purpose

A.8 establishes the authorization boundary used by OTTO Cloud. Authentication proves who the caller is; authorization determines what that caller may do.

The authoritative decision chain is:

```text
Request
  -> session
  -> identity
  -> active organization membership
  -> role / permissions
  -> organization-scoped resource
  -> action
```

## Rules

1. A client-supplied `organizationId` is a selector, never proof of access.
2. Organization-scoped operations must bind the requested organization to the organization resolved from the authenticated context.
3. An inactive, suspended, removed, or missing membership cannot authorize business access.
4. An inactive organization cannot authorize business access.
5. Permission checks fail closed with HTTP 403 after authentication has succeeded.
6. Missing authentication remains HTTP 401.
7. Cross-organization access must not reveal whether a resource exists.
8. Platform super-admin access is an explicit exception and must only be used for genuinely platform-scoped operations.
9. Client-side guards are UX only; server-side authorization is mandatory.
10. Business services must not trust request-body `userId`, `organizationId`, tenant IDs, roles, or permission lists as authorization evidence.

## Canonical APIs

`currentIdentityService.resolveFromRequest()` resolves the authenticated identity and active organization membership.

`authorizationService.authorize()` checks a permission against an already-resolved context.

`authorizationService.authorizeForOrganization()` is the required boundary for organization-scoped operations. It verifies that the requested organization equals the authenticated organization context before evaluating the permission.

`authorizationService.authorizeForMembership()` resolves membership directly and requires an active membership before permission evaluation.

## Error contract

- `401 UNAUTHENTICATED`: no valid authenticated session.
- `403 MEMBERSHIP_REQUIRED`: authenticated identity has no active organization membership for the requested context.
- `403 ORGANIZATION_REQUIRED`: an organization-scoped operation did not provide a valid organization context.
- `403 PERMISSION_DENIED`: the identity is authenticated and scoped, but lacks the required permission or is attempting a different organization.

Authorization failures must not disclose whether a cross-organization resource exists.

## Security boundary

The database query must occur only after the authorization decision for organization-scoped resources. A route that receives an organization or resource identifier must establish authorization independently of that identifier before returning or mutating business data.

## Remaining A.8 work

The baseline service boundary is now implemented and regression-tested. The remaining work is a repository-wide inventory of API routes/server actions/data access, replacement of any direct or client-trusted authorization paths, object-level authorization tests, and production-safe acceptance.
