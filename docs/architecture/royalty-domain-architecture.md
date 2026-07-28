# Royalty Entitlement Architecture

| Field | Value |
|-------|--------|
| **Package** | `lib/royalties` |
| **ADR** | [ADR-021](../product/royalties/adr-021-royalty-entitlement-domain.md) |

## Pipeline

```
Approved Right → Candidate → Review → Entitlement Registry → royalties.entitlement.* events
```

Never consumes contracts or AI drafts.

## Models

RoyaltyEntitlement · Allocation · RevenueShare · Beneficiary · Ownership · Restriction · Candidate · PromotionManifest · History · Timeline

## APIs

Under `/api/royalties/entitlements/*`, `/api/royalties/review`, `/promote`, `/replay`, `/dashboard`.

Legacy statement CRUD remains at `/api/royalties` (out of M7.0 scope for calculation).
