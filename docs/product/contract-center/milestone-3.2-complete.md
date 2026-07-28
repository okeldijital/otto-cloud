# Milestone 3.2 Complete — Verified Contract Domain

| Field | Value |
|-------|--------|
| Version | 1.0 |
| Status | Implemented |
| Date | 2026-07-28 |
| ADR | [adr-013-verified-contract-domain.md](./adr-013-verified-contract-domain.md) |

---

## Delivered

### Domain entities

`VerifiedContract`, `VerifiedParty`, `VerifiedContractTerm`, `VerifiedRight`, `VerifiedObligation`, `VerifiedTerritory`, `VerifiedDate`, `VerifiedContractEvent`

### Promotion

- Triggered on verification **complete**
- Only accepted/edited fields
- Idempotent per verification session
- New version on each re-verification; previous versions retained

### Platform

- `VerifiedContractService` + `promoteVerifiedContract`
- Domain events published to event log + audit
- Relationship placeholders on DTO for future linking

### APIs

| Method | Path |
|--------|------|
| GET | `/api/contracts/:id/verified` |
| GET | `/api/contracts/:id/verified/parties` |
| GET | `/api/contracts/:id/verified/history` |

### UI

Contract Detail → **Verified** tab (read-only domain view)

---

## Guarantees

- No AI/OCR in this layer  
- Promotion only from verified sessions  
- Provenance on root + children  
- Stable consumer integration surface  

---

## Tests

```bash
npm run test:verified-contract
```

---

## Ops

```bash
npx prisma migrate deploy
```

Migration: `20260728160000_verified_contract_domain`
