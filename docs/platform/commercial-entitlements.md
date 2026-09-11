# OTTO Commercial Entitlements

## Purpose

OTTO commercial entitlements answer whether an organization owns access to a product capability. They are separate from IAM permissions and from royalty-domain entitlements.

The authorization stack is:

`Identity → IAM membership → organization → commercial entitlement → role permission → resource scope`

An operation is allowed only when the organization has the commercial capability and the user has the corresponding IAM permission.

## Licensing model

`product_plans` represents independently licensable OTTO capability bundles. `organization_product_licenses` assigns those bundles to an IAM organization.

`license_type = perpetual` is the default. `expires_at` is nullable so perpetual licenses have no expiry; time-bounded licenses can use an explicit expiry.

The model intentionally does not reuse the existing `royalty_entitlements` or related entitlement tables.

## Initial product plans

- `OTTO_CORE`: Catalog + Core Contracts
- `OTTO_NETWORK`: Network
- `OTTO_RIGHTS`: Rights
- `OTTO_ROYALTIES`: Royalties
- `OTTO_OFFICE`: Office
- `OTTO_WORKSPACE`: Release Workspace
- `OTTO_AI`: Intelligence / AI
- `OTTO_CONTRACTS_OCR`: Contracts OCR / document intelligence

These keys are stable identifiers; commercial names and pricing remain governed by the business-model documentation.

## M2KR bootstrap

The first migration assigns `OTTO_CORE` to every active IAM organization that predates the commercial entitlement system. This is a compatibility bootstrap, not a hard-coded M2KR exception.

M2KR therefore receives Core through the same mechanism as every other organization. Future customers can receive Core plus any independently licensed modules without a separate application build.

## Enforcement

- The entitlement resolver is organization-scoped and fails closed when no active license exists.
- The IAM `requirePermission` boundary now composes commercial capability checks for permission families such as contracts, rights, royalties, office, workspace, AI, and network.
- The frontend AuthContext loads entitlements for the active organization.
- Sidebar navigation is declarative and filters module links using the same feature keys.
- Super-admin access remains an operational exception at the IAM layer.

## Important boundary

Navigation filtering is UX. API authorization is the security boundary. New commercial modules must add both a navigation feature key and a server-side entitlement check.

## Migration discipline

The migration creates durable licensing records and therefore is a database-side effect. It must be reviewed and applied intentionally; it should not be experimented with through repeated production deployments.
