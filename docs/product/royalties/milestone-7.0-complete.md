# Milestone 7.0 Complete — Royalty Entitlement Foundation

| Field | Value |
|-------|--------|
| Status | Implemented |
| Date | 2026-07-28 |
| ADR | [adr-021-royalty-entitlement-domain.md](./adr-021-royalty-entitlement-domain.md) |

## Delivered

- Entitlement registry, allocation, splits, beneficiaries, ownership, restrictions  
- Promotion from approved Rights only  
- Human review (approve/reject)  
- Lifecycle, timeline, provenance  
- Platform events `royalties.entitlement.*`  
- APIs + UI (`/royalties/entitlements`, `/royalties/review`)  
- Tests: `npm run test:royalty-entitlements`  

## Out of scope

Calculations, DSP, usage, statements (monetary), payments, tax, AI.

## Ops

```bash
npx prisma migrate deploy
```

Migration: `20260728230000_royalty_entitlements`
