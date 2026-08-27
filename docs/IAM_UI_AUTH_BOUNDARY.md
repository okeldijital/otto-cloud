# IAM UI Authentication Boundary

## Status

Implemented on `fix/iam-ui-auth-boundary` as part of the OTTO Cloud UI/IAM integration audit.

## Canonical organisation flow

The organisation UI now obtains organisation membership state exclusively from the canonical IAM endpoint:

- `GET /api/auth/organizations`
- `POST /api/auth/organizations/switch`

`OrgContext` no longer falls back to the legacy `/organizations` collection endpoint when the IAM endpoint fails. A canonical IAM failure now leaves the organisation context empty instead of silently switching data sources.

## Authentication boundary

The intended application authentication boundary is the Better Auth cookie-backed session established by `AuthContext`. The shared Axios client still contains legacy localStorage-token handling and requires a separate migration because the GitHub Contents API currently rejects updates to `lib/api.js` with a SHA conflict even when the reported blob SHA matches the branch file.

## Verification requirement

Before merging this branch, verify in the browser:

1. Authenticated session loads.
2. `/api/auth/organizations` returns the expected memberships.
3. Organisation switch uses `/api/auth/organizations/switch`.
4. Settings, Members, Invitations and Roles resolve the same active organisation.
5. A failure of `/api/auth/organizations` does not silently fall back to `/organizations`.

No database or IAM-domain changes are included in this UI integration pass.
