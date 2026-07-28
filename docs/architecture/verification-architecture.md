# Verification Architecture

| Field | Value |
|-------|--------|
| **Status** | Baseline |
| **Date** | 2026-07-28 |
| **Milestone** | 3.1 |

---

## Layers

| Layer | Tables | Mutability |
|-------|--------|------------|
| AI Draft | `document_extractions`, `extraction_fields` | Working `verificationState` / value during review; AI original kept in `sourceLocation.aiOriginalValue` |
| Session | `verification_sessions` | Versioned per extraction |
| Verified | `verified_fields` | Written on **complete**; immutable for that session |
| Audit | `verification_history`, `verification_decisions`, platform `audit_logs` | Append-only |

---

## Field states

`draft` → `accepted` | `edited` | `rejected` → (on complete) `verified` for accepted/edited

Rejected fields store `decision=rejected` with null verified value.

---

## Session lifecycle

```
pending / in_progress
        ↓ complete
    completed  →  verified_fields snapshot
        ↓ reopen
    new session version (reopened)
```

Prior completed sessions keep their `verified_fields`.

---

## Completion rules

1. Every field not left in `draft`
2. Required keys reviewed: title, parties, effective_date
3. `confirm: true` on complete API
4. No auto-promotion

---

## Permissions

| Role | View drafts | Modify verification |
|------|-------------|---------------------|
| viewer | Yes | No |
| user / manager / admin | Yes | Yes |
| superadmin | Yes | Yes |

---

## Consumers

Downstream features **must** read `verified_fields` (latest completed session for a document/extraction), never raw AI drafts, for trusted automation.
