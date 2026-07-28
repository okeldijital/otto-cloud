# Milestone 4.0 Complete — Relationship Discovery & Linking

| Field | Value |
|-------|--------|
| Version | 1.0 |
| Status | Implemented |
| Date | 2026-07-28 |
| ADR | [adr-014-contract-relationships.md](./adr-014-contract-relationships.md) |

---

## Delivered

### Domain

- Polymorphic `ContractRelationship`
- `RelationshipSuggestion` / `RelationshipDecision` / `RelationshipHistory`
- Platform events table

### Services

- Matching (exact, normalized, alias)
- Discovery from Verified Contract parties + title
- Relationship create / accept / reject / update / remove

### APIs

| Method | Path |
|--------|------|
| GET, POST | `/contracts/:id/relationships` |
| PATCH, DELETE | `/contracts/:id/relationships/:relationshipId` |
| GET, POST | `/contracts/:id/relationship-suggestions` |

### UI

Contract Detail → **Relationships** tab:

- Discover suggestions  
- Accept / Reject  
- Linked entities + remove  
- Manual search & link  
- History  

### Guarantees

- No automatic linking  
- Provenance on every relationship  
- Viewers read-only  
- Extensible entity/relationship types  

---

## Tests

```bash
npm run test:relationships
```

---

## Ops

```bash
npx prisma migrate deploy
```

Migration: `20260728170000_contract_relationships`

---

## Out of scope

Royalties, release workflows, auto-link, notifications, clause intelligence.
