# Tenant Isolation Fix

## Problem

The organization switcher can change the IAM active-organization context, while server session resolution may still prefer the Better Auth session cookie. This can leave application data scoped to the previous organization after a switch.

A second systemic issue was found during the catalog/contract audit: legacy INT-scoped tables were receiving a process-wide `LEGACY_INT_ORG_ID` fallback (historically `1`). That meant multiple IAM organizations could resolve to the same integer organization scope. Contracts were the first confirmed user-visible leak, but the same compatibility field is used by other legacy INT tables.

## Required invariant

For every authenticated tenant-scoped request, OTTO IAM is authoritative for the active organization. The server must verify active membership before resolving organization-scoped data. Client-supplied organization IDs must not override the authenticated organization context.

Every legacy INT-scoped resource must also resolve to an organization-specific compatibility scope. A process-wide numeric tenant fallback is forbidden in request authorization.

## Scope of the implementation

- Make organization switching affect the canonical server request context.
- Ensure `getServerSession` / organization context cannot silently prefer a stale organization from Better Auth.
- Preserve Better Auth as the authentication/session provider, but use OTTO IAM membership and active-organization state for authorization and tenant scope.
- Invalidate/refetch organization-scoped client data after switching.
- Replace the process-wide legacy INT organization fallback with:
  1. the organization's real legacy numeric tenant id when available;
  2. the configured legacy numeric scope only for the explicitly mapped legacy owner;
  3. a stable organization-specific compatibility scope for unmapped IAM organizations.
- Audit legacy catalog scope compatibility so it cannot silently replace the active IAM organization.
- Audit catalog relations and contract relations, not only top-level list endpoints.
- Verify reads, mutations, uploads, search, reports, projections, workspace data, rights, royalties, playlists, and AI/contract registries for cross-tenant resource references.
- Treat any legacy row with ambiguous ownership as non-shareable until it is explicitly migrated/backfilled to a real organization UUID.

## Verification matrix

Given Organization A contains A1/A2 and Organization B contains B1:

1. Initial A returns A1/A2 only.
2. Switch to B returns B1 only.
3. Switch back to A returns A1/A2 only.
4. A context cannot read or mutate B resources.
5. B context cannot read or mutate A resources.
6. Direct client-supplied organization IDs cannot expand tenant scope.
7. Contract lists/search/details cannot return contracts owned by another organization.
8. Contract parties, assets, tracks, documents, splits, lifecycle, rights, royalties, and release/work projections must resolve through the same organization boundary.
9. Release → track/work/artist/contract relations must reject foreign resource ids.
10. Search/export/report endpoints must never widen scope through a related table.
11. Client-side organization switching must discard cached tenant-scoped state before rendering the next organization.

## Deployment discipline

Do not deploy intermediate states. Complete implementation, tests, audit, and diff review first; then use one intentional commit/push/deployment and verify production.
