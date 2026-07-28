# Milestone 6.0 Complete — Rights Management Foundation

| Field | Value |
|-------|--------|
| Version | 1.0 |
| Status | Implemented |
| Date | 2026-07-28 |
| ADR | [adr-020-rights-domain.md](./adr-020-rights-domain.md) |

---

## Delivered

- Rights domain models (Right, Grant, Restriction, Party, Territory, Work, Release, ContractRef, Candidate, PromotionRun, History, Timeline, Events)
- Promotion from **verified contracts only**
- Human review workspace (approve / reject)
- Registry + lifecycle transitions
- Search + dashboard
- Platform events `rights.*`
- APIs under `/api/rights/*`
- UI: `/rights`, `/rights/review`, `/rights/[id]`
- Tests: `npm run test:rights`

---

## Ops

```bash
npx prisma migrate deploy
```

Migration: `20260728220000_rights_domain`

---

## Out of scope

Royalties, payments, accounting, DSP, AI interpretation, licensing workflows.
