# Contract System V1 Documentation

## 1. Overview
The Contracts V1 module is a complete rebuild of the legal agreement system in OTTO. It addresses data integrity, scaling, and governance issues present in the legacy JSON-based system.

## 2. Core Principles
- **Strict Organization Scoping**: All queries are filtered by `organization_id` at the Repository level.
- **UUID Identity**: All Contract entities use UUIDs, avoiding collision risks in distributed environments.
- **Immutable Audit Trail**: Every create, update, and delete action is logged to the `audit_logs` table.

## 3. Data Model
- **`contracts_v1`**: The root aggregate. Contains metadata (title, dates, status).
- **`contract_parties_v1`**: Links entities (Artists, Labels, or External) to the contract.
- **`contract_assets_v1`**: Defines the scope of the agreement (Release, Work, Track Inclusion/Exclusion).
- **`contract_documents_v1`**: Manages file attachments and versions.

## 4. API Endpoints
Base URL: `/api/contracts`

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/` | List contracts (Filtered by Org) |
| `POST` | `/` | Create new contract |
| `GET` | `/{id}` | Get contract details |
| `PUT` | `/{id}` | Update contract fields |
| `DELETE` | `/{id}` | Terminate/Delete contract |

## 5. Security
- **Authentication**: JWT Bearer Token required.
- **Organization Context**: `X-Organization-ID` header MUST be present.
- **Role Check**: Basic Auth enforced (RBAC TBD).

## 6. Legacy System Status
- The old `contracts` table is **READ-ONLY**.
- The old UI is accessible at `/legacy-contracts` but marked deprecated.
