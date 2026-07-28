# Milestone 5.0 Complete — Contract Integration Foundation

| Field | Value |
|-------|--------|
| Version | 1.0 |
| Status | Implemented |
| Date | 2026-07-28 |
| ADR | [adr-018-release-contract-integration.md](./adr-018-release-contract-integration.md) |

---

## Delivered

### Read model

- `ReleaseContractSummary` projection  
- `ReleaseContractTimelineEntry`  
- Health derivation (healthy / warning / critical)  

### Services

- Sync, read model, timeline, health, event subscriber  

### APIs (read-only)

- `GET /api/releases/:id/contracts`  
- `GET /api/releases/:id/contracts/summary`  
- `GET /api/releases/:id/contracts/health`  
- `GET /api/releases/:id/contracts/timeline`  
- `GET /api/releases/contracts-dashboard`  

### UI

- Release Workspace **Contracts** section  
- Dashboard release-contract widgets  
- Search includes release↔contract projections  

### Platform

- Subscribes to `contracts.*` events  
- Publishes `release.contract.summary.updated`, `release.health.changed`  

---

## Ownership boundaries validated

| Layer | Ownership |
|-------|-----------|
| Contract Center | Contracts |
| Relationships | Links |
| Lifecycle | Contract state |
| Event Bus | Sync |
| Release Workspace | Projections + UX |

No write APIs for contracts from Release Workspace.

---

## Tests

```bash
npm run test:release-contracts
```

---

## Ops

```bash
npx prisma migrate deploy
```

Migration: `20260728200000_release_contract_read_model`

---

## Out of scope

Royalties, rights, payments, workflow automation, AI, contract editing.
