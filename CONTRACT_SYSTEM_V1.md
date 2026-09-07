# Contract System V1 Documentation

## 1. Overview
The Contracts V1 module is the governed contract and contract-intake system in OTTO Cloud. It uses the current Organization Context architecture while retaining an explicit compatibility boundary for legacy integer-scoped contract tables.

## 2. Core Principles
- **Strict Organization Scoping**: Every contract request resolves the active organization through `lib/auth/organization-context.ts` / `requireOrganization()`.
- **Legacy INT Compatibility**: The current `contracts` aggregate and `contract_*` child tables use integer `organization_id` values through `context.legacyIntOrgId`. This is an intentional migration boundary, not a second tenancy model.
- **Human Verification**: Contract Intelligence may extract and suggest data, but extraction does not by itself promote a contract to an authoritative verified state.
- **Human-Mediated Catalogue Resolution**: AI may propose Artist/Release/Work relationships, but users explicitly accept or reject those relationships.
- **Lifecycle Protection**: Verified contracts and contracts with authoritative downstream relationships cannot be deleted through the failed-intake deletion path.

## 3. Data Model
- **`contracts`**: Contract root aggregate. Uses an integer primary key and legacy integer organization scope during the compatibility phase.
- **`contract_parties`**: Contract parties and entity references.
- **`contract_assets`**: Agreement scope and asset references.
- **`contract_documents`**: Contract document versions.
- **`contract_track_links`**: Contract-to-track relationships.
- **Contract lifecycle / verification tables**: Authoritative verification, lifecycle, relationships, rights, and royalty records use the UUID organization context where applicable.

The migration compatibility boundary is governed by `lib/auth/migration-compat.ts`. It must not be bypassed by introducing ad-hoc organization-ID conversions in contract routes.

## 4. Current API Surface
Base route: `/api/contracts`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/contracts` | List contracts in the active legacy INT organization scope |
| `GET` | `/api/contracts?id={id}` | Read one contract in the active legacy INT organization scope |
| `POST` | `/api/contracts` | Create contract or perform supported contract mutations |
| `PUT` | `/api/contracts?id={id}` | Update contract fields after organization authorization |
| `DELETE` | `/api/contracts/delete?id={id}` | Safely delete an eligible failed Draft / Pending Verification intake |

The item route `/api/contracts/{id}` is not the current contract-read route. The `[id]` namespace is used by contract subresources such as amendments, documents, lifecycle, readiness, relationships, timeline, and verified resources.

## 5. Security and Organization Context
- Authentication and authorization are resolved through the current session and resource-authorization layer.
- Every request must resolve the active organization through the shared Organization Context subsystem.
- UUID-scoped catalogue and IAM data use `context.organizationId`.
- Legacy integer-scoped contract tables use `context.legacyIntOrgId`.
- The integer compatibility value must not be treated as the authoritative tenancy identity.
- Lifecycle-management permission is required for failed-intake deletion.

## 6. Verification and Lifecycle Rules
- Source PDF remains authoritative.
- AI extraction produces reviewable information and must not independently promote a contract.
- A verified contract is authoritative and protected from failed-intake deletion.
- Amendment drafts retain their originating verified-contract version and remain non-authoritative until verification.
- Contract → Catalogue relationships are user-confirmed; AI suggestions are not auto-linked.

## 7. Failed-Intake Deletion
Failed Draft / Pending Verification intake records may be deleted only when they have no verified contract, confirmed Contract Relationships, Rights / Right Contract References, Royalty Entitlements, or protected lifecycle state.

Deletion removes the contract's intake/lifecycle relations and cleans up orphaned platform document relations. The operation is exposed through the Contracts UI and is intended to be the controlled mechanism for removing failed-intake test debris.

## 8. Legacy / Migration Status
The integer contract organization scope is a documented compatibility boundary under ADR-001 and `docs/architecture/multi-tenant-model.md`. It should be migrated to UUID organization scope only as part of a deliberate schema/data migration with validation and an ADR-backed removal of the compatibility layer.

The older standalone legacy contract implementation is not the governing workflow for current OTTO Cloud operations.
