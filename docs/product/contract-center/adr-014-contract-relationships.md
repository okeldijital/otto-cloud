# ADR-014 — Contract Relationship Layer

| Field | Value |
|-------|--------|
| **Status** | Accepted |
| **Date** | 2026-07-28 |
| **Milestone** | 4.0 — Relationship Discovery & Linking |

---

## Decision

Relationships between contracts and platform entities use a **generic polymorphic model**:

- `ContractRelationship` — confirmed links  
- `RelationshipSuggestion` — matching proposals  
- `RelationshipDecision` / `RelationshipHistory` — audit  

**AI/matching only suggests. Users create links.**

Target types (`artist`, `release`, `track`, `work`, `label`, `publisher`, `organization`, `person`, `contract`) and relationship types (`represents`, `applies_to`, …) are **data-driven**, not one table per target.

---

## Reason

- Avoids schema explosion per entity type.
- Keeps entity ownership in original domains.
- Makes Contract Center a relationship hub without owning Artists/Releases.

---

## Alternatives considered

### A. Separate join tables per target type

Rejected — hard to extend; duplicates logic.

### B. Auto-link above confidence threshold

Rejected — violates human confirmation principle.

### C. Store only on VerifiedContract JSON

Rejected — poor queryability for consumers.

---

## Consequences

| Area | Implication |
|------|-------------|
| Discovery | From Verified Contract parties/title |
| Matching | exact / normalized / alias (future fuzzy/semantic) |
| Events | Suggested, Created, Updated, Removed, Rejected |
| Consumers | Future modules listen to events / read APIs |

---

## Related

- ADR-013 Verified Contract Domain  
- relationship-architecture.md  
