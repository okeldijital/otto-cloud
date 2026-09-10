# Tenant Isolation Fix

## Problem

The organization switcher can change the IAM active-organization context, while server session resolution may still prefer the Better Auth session cookie. This can leave application data scoped to the previous organization after a switch.

## Required invariant

For every authenticated tenant-scoped request, OTTO IAM is authoritative for the active organization. The server must verify active membership before resolving organization-scoped data. Client-supplied organization IDs must not override the authenticated organization context.

## Scope of the implementation

- Make organization switching affect the canonical server request context.
- Ensure `getServerSession` / organization context cannot silently prefer a stale organization from Better Auth.
- Preserve Better Auth as the authentication/session provider, but use OTTO IAM membership and active-organization state for authorization and tenant scope.
- Invalidate/refetch organization-scoped client data after switching.
- Audit legacy catalog scope compatibility so it cannot silently replace the active IAM organization.
- Verify reads and mutations for A → B → A switching and cross-tenant resource access.

## Verification matrix

Given Organization A contains A1/A2 and Organization B contains B1:

1. Initial A returns A1/A2 only.
2. Switch to B returns B1 only.
3. Switch back to A returns A1/A2 only.
4. A context cannot read or mutate B resources.
5. B context cannot read or mutate A resources.
6. Direct client-supplied organization IDs cannot expand tenant scope.

## Deployment discipline

Do not deploy intermediate states. Complete implementation, tests, audit, and diff review first; then use one intentional commit/push/deployment and verify production.
