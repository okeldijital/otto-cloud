# Verified Contract Architecture

| Field | Value |
|-------|--------|
| **Status** | Baseline |
| **Date** | 2026-07-28 |
| **Package** | `lib/verified-contract` |

---

## Pipeline

```
VerificationSession (completed)
        ↓
promoteVerifiedContract()  // idempotent on session id
        ↓
VerifiedContract vN (isCurrent)
  ├── VerifiedParty[]
  ├── VerifiedContractTerm[]
  ├── VerifiedRight[]
  ├── VerifiedObligation[]
  ├── VerifiedTerritory[]
  └── VerifiedDate[]
        ↓
VerifiedContractEvent log
```

---

## Promotion rules

| Source decision | Promoted? |
|-----------------|-----------|
| accepted | Yes |
| edited | Yes |
| rejected | No |

Idempotency: if a `VerifiedContract` already exists for `verificationSessionId`, return it without mutation.

Versioning: each new session completion increments `version` and sets `isCurrent` on the new row.

---

## Provenance

Root `VerifiedContract.provenance` plus per-child `provenance` JSON include:

- documentId  
- extractionId (+ version)  
- verificationSessionId (+ version)  
- verifiedFieldId / fieldKey / decision  
- reviewerUserId  
- verifiedAt  

---

## Events

| Event | When |
|-------|------|
| `VerifiedContractCreated` | First version |
| `VerifiedContractUpdated` / `Reverified` | Subsequent versions |
| `VerifiedPartyAdded` / `Updated` | Parties written |

Persisted in `verified_contract_events` (+ audit log).

---

## Read APIs (integration surface)

| Path | Purpose |
|------|---------|
| `GET /api/contracts/:id/verified` | Current domain object |
| `GET /api/contracts/:id/verified/parties` | Parties only |
| `GET /api/contracts/:id/verified/history` | Versions + events |

---

## Intended consumers (not implemented here)

Release Workspace · Rights Management · Royalty Engine · Organization · Reporting · Search  

All should call the Verified Contract APIs only.
