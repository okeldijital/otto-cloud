# Milestone 3.1 Complete — Human Verification Workspace

| Field | Value |
|-------|--------|
| Version | 1.0 |
| Status | Implemented |
| Date | 2026-07-28 |
| ADR | [adr-012-human-verification.md](./adr-012-human-verification.md) |

---

## Implemented

### Verification Workspace (3-column)

| Region | Content |
|--------|---------|
| Left | Original PDF viewer |
| Center | AI draft fields + actions + filters |
| Right | Verified layer + history |

### Per-field actions

Accept · Edit · Reject · Reset to AI · (Cancel edit)

### Bulk

- Accept all draft fields with confidence ≥ 80%
- Reject all

### Document

- Progress bar / counts
- Complete (enforced rules + confirm)
- Reopen (new session version)

### Data model

- `VerificationSession` (versioned)
- `VerifiedField` (trusted layer)
- `VerificationHistory`
- `VerificationDecision`

### APIs

| Method | Path |
|--------|------|
| GET | `.../verifications?extractionId=` |
| PATCH | `.../verifications/fields` |
| POST | `.../verifications/fields` (bulk) |
| POST | `.../verifications/complete` |
| POST | `.../verifications/reopen` |

### Audit / activity

Field accepted/edited/rejected/reset · verification completed/reopened · bulk · activity Started/Completed/Updated

---

## Guarantees

- AI drafts not destroyed
- Verified stored separately
- Viewers cannot modify
- No auto-promotion
- Confidence advisory (color bands)

---

## Tests

```bash
npm run test:verification
npm run test:intelligence
```

---

## Ops

```bash
npx prisma migrate deploy
# applies 20260728150000_human_verification
```

---

## Out of scope (deferred)

Clause extraction, risk, summaries, e-sign, approval workflows, release linking.
