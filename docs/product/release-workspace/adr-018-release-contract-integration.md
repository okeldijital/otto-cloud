# ADR-018 — Release Workspace Contract Integration

| Field | Value |
|-------|--------|
| **Status** | Accepted |
| **Date** | 2026-07-28 |
| **Milestone** | 5.0 — Contract Integration Foundation |

---

## Decision

The Release Workspace is a **consumer** of the OTTO Platform:

| Owner | Responsibility |
|-------|----------------|
| Contract Center | Contracts, verification, verified domain |
| Relationship Layer | Links between contracts and releases |
| Lifecycle Engine | Contract operational status & dates |
| Platform Event Bus | Synchronization |
| Release Workspace | **Projections + UX only** |

Release Workspace **must not**:

- Duplicate contracts as source of truth  
- Import Contract Center business logic for writes  
- Edit contracts  
- Create local relationship ownership  

---

## Read model

`ReleaseContractSummary` stores a **projection** per release↔contract link, rebuilt from:

1. `ContractRelationship` where `targetEntityType = release`  
2. Verified Contract APIs / tables (read)  
3. Lifecycle key dates & status (read)  

`ReleaseContractTimelineEntry` stores release-scoped timeline projections from platform events.

Health (`healthy` | `warning` | `critical`) is **always derived** on sync — never manually edited.

---

## Events

**Subscribe:** `contracts.lifecycle.*`, `contracts.relationship.*`, `contracts.verified.*`, `contracts.verification.*`, `contracts.document.*`

**Publish (workspace state only):**

- `release.contract.summary.updated`  
- `release.health.changed`  

---

## Consequences

| Area | Implication |
|------|-------------|
| APIs | Read-only under `/api/releases/:id/contracts/*` |
| UI | Contracts section in Release Workspace; open Contract Center for edits |
| Replay | Rebuild projections via sync service / event bus replay |

---

## Related

- ADR-013 / 014 / 015 / 016  
- [release-contract-integration.md](../../architecture/release-contract-integration.md)  
- [release-read-model.md](../../architecture/release-read-model.md)  
