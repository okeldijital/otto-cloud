# ADR-012 — Human Verification as Trust Boundary

| Field | Value |
|-------|--------|
| **Status** | Accepted |
| **Date** | 2026-07-28 |
| **Milestone** | Contract Center 3.1 — Human Verification Workspace |

---

## Decision

AI extraction produces **drafts only**.

Humans produce **verified business data**.

Verified values are stored in a **separate layer** (`VerifiedField` under versioned `VerificationSession`). AI draft rows (`ExtractionField` values / raw responses) are **never destroyed** by verification.

```
Original PDF (legal source)
        ↓
AI Draft (immutable history)
        ↓
Human Review
        ↓
Verified Data (business consumers)
```

No automatic promotion. Completion requires explicit user confirmation and review of all fields (required fields cannot remain draft).

---

## Reason

- Legal and product trust: models err; humans own the record.
- Future modules (releases, royalties, reminders) must not read raw AI.
- Re-running AI creates new extraction versions without erasing prior verified sessions.

---

## Alternatives considered

### A. Overwrite AI fields in place

Rejected — loses audit of model output.

### B. Auto-accept above confidence threshold without human confirm

Rejected — confidence is advisory only.

### C. Single “verified document blob”

Rejected — field-level audit and partial reopen require structured fields.

---

## Consequences

| Area | Implication |
|------|-------------|
| Schema | Sessions, VerifiedField, History, Decision |
| APIs | get / field update / bulk / complete / reopen |
| Permissions | Viewers cannot modify verification |
| Downstream | Must consume `VerifiedField` for trusted data |

---

## Related

- [ADR-011](./adr-011-document-intelligence.md) — intelligence produces drafts
- [verification-architecture.md](../../architecture/verification-architecture.md)
