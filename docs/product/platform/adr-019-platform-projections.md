# ADR-019 — Platform Projection Framework

| Field | Value |
|-------|--------|
| **Status** | Accepted |
| **Date** | 2026-07-28 |
| **Follows** | Milestone 5.0 (Release Workspace first consumer) |

---

## Decision

Projection infrastructure is a **platform concern**, not owned by Release Workspace.

Extract:

- Engine, registry, store (checkpoints), replayer, subscriber wiring, metrics  

into `lib/platform/projections`.

Release Workspace remains the **reference implementation** of a projection definition + builder + UI.

---

## Reason

Without this, Rights / Royalties / Search / Reporting would each re-implement:

- event pattern matching  
- retries / DLQ coupling  
- rebuild / replay  
- checkpoints  
- metrics  

That duplicates infrastructure and drifts behavior.

---

## Consequences

| Area | Implication |
|------|-------------|
| Modules | Implement definition + builder only |
| Platform | Owns bus wiring + rebuild/replay APIs |
| Release Workspace | Migrates subscriber → projection definition |

---

## Related

- [platform-projections.md](../../architecture/platform-projections.md)  
- ADR-016 Event Framework  
- ADR-018 Release Contract Integration  
