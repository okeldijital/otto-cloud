# Platform Projection Framework

| Field | Value |
|-------|--------|
| **Status** | Baseline |
| **Date** | 2026-07-28 |
| **Package** | `lib/platform/projections` |

---

## Purpose

Reusable infrastructure so **every module** consumes platform events the same way:

```
Projection Definition
      ↓
Projection Builder (module-owned project/resolveKeys)
      ↓
UI / Read APIs
```

Platform owns:

- subscriptions  
- replay  
- rebuild  
- checkpointing  
- metrics  
- retries (via event bus delivery)  

Modules **must not** re-implement event subscribers for projections.

---

## Components

| Component | Role |
|-----------|------|
| `ProjectionRegistry` | Register / list definitions |
| `ProjectionEngine` | applyEvent, projectKey, rebuild |
| `ProjectionStore` | Checkpoints (`platform_projection_checkpoints`) |
| `ProjectionReplayer` | Event-store replay into a projection |
| `ProjectionSubscriber` | Wires definitions → platform event bus |
| `ProjectionMetrics` | In-process counters |

---

## Module contract

```ts
registerProjection({
  name: "release.contract.summary",
  version: "1.0.0",
  owner: "release-workspace",
  events: ["contracts.lifecycle.*", "contracts.relationship.*", ...],
  resolveKeys(event) { /* → ProjectionKey[] */ },
  project(key, ctx) { /* write module read model */ },
  listKeys(organizationId) { /* optional full rebuild */ },
});
```

Reference implementation: `lib/release-workspace/contracts/projection.ts`

---

## Flow

```
Platform Event published
      ↓
Event Bus subscriber: projection.<name>
      ↓
ProjectionEngine.applyEvent
      ↓
def.resolveKeys → def.project (× keys)
      ↓
Checkpoint updated
```

Rebuild / replay:

```
POST /api/platform/projections
  { action: "rebuild" | "replay", projectionName }
```

(Admin / super-admin via replay permission.)

---

## Future modules

Rights, Royalties, Search, Reporting should only add:

1. Projection definition + builder  
2. Module read model tables  
3. UI  

They should not copy Release Workspace sync/subscriber code.

---

## Related

- [platform-events.md](./platform-events.md)  
- [release-contract-integration.md](./release-contract-integration.md)  
