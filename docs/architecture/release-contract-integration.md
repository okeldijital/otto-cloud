# Release Workspace — Contract Integration

| Field | Value |
|-------|--------|
| **Status** | Baseline |
| **Date** | 2026-07-28 |
| **Package** | `lib/release-workspace/contracts` |
| **ADR** | [ADR-018](../product/release-workspace/adr-018-release-contract-integration.md) |

---

## Flow

```
Verified Contract
      ↓
Relationship Layer (contract → release)
      ↓
ReleaseContractSyncService (projection)
      ↓
ReleaseContractSummary (read model)
      ↓
Workspace UI (Contracts section)
      ↑
Platform Events (contracts.*)
```

No direct Contract Center business logic imports for mutation.

---

## Services

| Service | Role |
|---------|------|
| `ReleaseContractSyncService` | Rebuild projections from relationships + verified + lifecycle |
| `ReleaseContractReadModelService` | List / summary / health / dashboard / search |
| `ReleaseTimelineService` | Merge release projection + contract timeline |
| `ReleaseContractHealthService` | Pure derived health (`computeContractHealth`) |
| Event subscriber | `release-workspace.contract_projection` |

---

## APIs (read-only)

| Method | Path |
|--------|------|
| GET | `/api/releases/:id/contracts` |
| GET | `/api/releases/:id/contracts/summary` |
| GET | `/api/releases/:id/contracts/health` |
| GET | `/api/releases/:id/contracts/timeline` |
| GET | `/api/releases/contracts-dashboard` |

`?refresh=1` forces projection rebuild.

---

## Permissions

- View contract summary in workspace  
- Open Contract Center  
- **No** contract edit from Release Workspace  

Contract permissions remain enforced by Contract Center routes.

---

## Out of scope

Royalties · rights allocation · payments · approvals · publishing automation · AI · contract editing.
