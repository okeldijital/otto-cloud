# Release Contract Read Model

| Field | Value |
|-------|--------|
| **Status** | Baseline |
| **Date** | 2026-07-28 |
| **Tables** | `release_contract_summaries`, `release_contract_timeline_entries` |

---

## Principle

Projection only. **Never** the source of truth for contracts, relationships, or lifecycle.

---

## `ReleaseContractSummary`

One row per `(releaseId, contractId)` active relationship.

| Field | Source |
|-------|--------|
| relationshipId / type | Relationship Layer |
| contractTitle | Verified title / legacy contracts.title |
| verified* | Verified Contract domain |
| lifecycleStatus | Lifecycle engine |
| effective / expiration / renewal / notice | Lifecycle key dates (+ verified text fallback) |
| partiesJson / territoriesJson / rightsSummary | Verified domain snapshot |
| relationshipCount / amendmentCount | Counts from platform tables |
| healthStatus / healthReasons | Derived (`computeContractHealth`) |

---

## Rebuild triggers

1. Platform events (`contracts.*`) via subscriber  
2. Manual `?refresh=1` on read APIs  
3. Lazy rebuild when projection empty  
4. `rebuildAll({ organizationId })` for replay-style recovery  

---

## Health derivation

| Status | Examples |
|--------|----------|
| **healthy** | Verified, linked, active, no near-term expiration |
| **warning** | Renewal due, expiring ≤90d, pending verification, pending amendment |
| **critical** | Expired, missing verified, broken relationship |

Recomputed on every sync — not user-editable.

---

## Timeline

`ReleaseContractTimelineEntry` stores release-scoped copies of contract platform events.

`ReleaseTimelineService` also merges live `ContractTimelineEntry` rows for linked contracts so the UI is complete even before projection lag catches up. Contract events remain identifiable (`isContractEvent`, `contractId`).
