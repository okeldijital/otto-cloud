# ADR-013 — Verified Contract Domain

| Field | Value |
|-------|--------|
| **Status** | Accepted |
| **Date** | 2026-07-28 |
| **Milestone** | Contract Center 3.2 — Verified Contract Domain |

---

## Decision

After human verification completes, promote trusted values into a **first-class Verified Contract domain**:

- `VerifiedContract` (+ parties, terms, rights, obligations, territories, dates)
- Versioned with `isCurrent`
- Provenance on every value
- Platform domain events
- **Read-only** APIs for consumers

Downstream modules **must** integrate with this domain — not AI drafts, not raw verification working state.

```
PDF → AI Draft → Human Verification → Verified Contract → Platform Consumers
```

---

## Reason

- `VerifiedField` is a verification artifact, not a permanent business model.
- Normalized entities support Releases, Rights, Royalties, Reporting, Search.
- Idempotent promotion keeps re-completion safe.
- Version history supports re-verification without loss.

---

## Alternatives considered

### A. Keep only VerifiedField as the domain

Rejected — not normalized for parties/dates/rights consumers.

### B. Write verified values onto legacy `contracts` columns only

Rejected as sole model — loses provenance and multi-version history.

### C. Auto-promote from AI without verification

Rejected — violates ADR-012 trust boundary.

---

## Consequences

| Area | Implication |
|------|-------------|
| Package | `lib/verified-contract` |
| Trigger | Verification session complete |
| APIs | `GET /contracts/:id/verified[+ /parties /history]` |
| Consumers | Documented placeholders; no linking yet |

---

## Related

- ADR-008 Document storage  
- ADR-011 Document intelligence  
- ADR-012 Human verification  
