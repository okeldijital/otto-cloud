# ADR-020 — Rights Domain

| Field | Value |
|-------|--------|
| **Status** | Accepted |
| **Date** | 2026-07-28 |
| **Milestone** | 6.0 — Rights Management Foundation |

> Note: ADR-019 is reserved for Platform Projections. Rights uses **ADR-020**.

---

## Decision

The **Rights Domain** is the authoritative **operational** representation of legal rights contained in verified contracts.

| Layer | Role |
|-------|------|
| Verified Contract | Legal evidence (source) |
| Rights Domain | Operational rights (system of record for consumers) |
| Royalties / Reporting | Consume `rights.*` events and Rights APIs |

Rights are **not** contracts. Multiple rights may originate from one contract.

---

## Principles

1. Only **verified** contracts promote candidates.  
2. **No automatic publication** — human review required.  
3. Never read AI extraction / drafts.  
4. Provenance is mandatory on approved rights.  
5. Lifecycle transitions are validated.  
6. Relationships reuse the Relationship Layer (via contracts).  

---

## Pipeline

```
Verified Contract → Rights Candidates → Human Review → Rights Registry → rights.* events
```

---

## Related

- [rights-domain-architecture.md](../../architecture/rights-domain-architecture.md)  
- ADR-013 Verified Contract · ADR-016 Events · ADR-019 Projections  
