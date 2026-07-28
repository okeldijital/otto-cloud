# Contract Relationship Architecture

| Field | Value |
|-------|--------|
| **Status** | Baseline |
| **Date** | 2026-07-28 |
| **Package** | `lib/contract-relationships` |

---

## Flow

```
Verified Contract
      ↓
RelationshipDiscoveryService (matching)
      ↓
RelationshipSuggestion (pending)
      ↓
User Accept / Reject / Manual create
      ↓
ContractRelationship (active)
      ↓
Events + History
```

---

## Polymorphic target

| Column | Meaning |
|--------|---------|
| `targetEntityType` | artist \| release \| track \| work \| … |
| `targetEntityId` | String form of PK (int or UUID later) |
| `targetEntityName` | Display snapshot |

No FK to target tables — ownership stays in source domains.

---

## Services

| Service | Role |
|---------|------|
| `MatchingService` | exact / normalized / alias candidates |
| `RelationshipDiscoveryService` | Build suggestions from verified domain |
| `RelationshipService` | Create / update / remove / accept / reject |

---

## APIs

| Method | Path |
|--------|------|
| GET/POST | `/api/contracts/:id/relationships` |
| PATCH/DELETE | `/api/contracts/:id/relationships/:relationshipId` |
| GET/POST | `/api/contracts/:id/relationship-suggestions` |

POST suggestions: `{}` discover · `{ action: "search", q, entityType }` manual search.

---

## Events

`RelationshipSuggested` · `Created` · `Updated` · `Removed` · `Rejected`

Persisted in `contract_relationship_events`.

---

## Permissions

Viewers: read-only. Others: manage links.
