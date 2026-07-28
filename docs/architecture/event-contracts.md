# Event Contracts & Schema Validation

| Field | Value |
|-------|--------|
| **Status** | Baseline |
| **Date** | 2026-07-28 |
| **Milestone** | 4.2A |
| **Package** | `lib/platform/events/contracts` |

---

## Purpose

Every platform event has a **formal payload contract**. The dispatcher **validates** payloads against the registered contract **before** persistence.

Benefits:

- Safer refactoring across producers/consumers  
- Backward-compatible evolution (semver + additionalProperties)  
- Stronger integrations for Release Workspace, Royalties, AI agents  
- Future external API readiness  

---

## Envelope shape

Consumers should treat events as:

```json
{
  "event": "contracts.lifecycle.activated",
  "version": "1.0.0",
  "organizationId": "…",
  "payload": {
    "organizationId": "…",
    "contractId": 123,
    "activatedAt": "2026-07-28T12:00:00.000Z",
    "verifiedVersion": 3
  }
}
```

Helper: `buildEventEnvelope()`.

---

## Contract model

```ts
{
  version: "1.0.0",
  fields: {
    organizationId: { type: "uuid", required: true },
    contractId: { type: "number", required: true },
    activatedAt: { type: "datetime" },
    verifiedVersion: { type: "integer" },
  },
  additionalProperties: true, // forward-compatible by default
  inject: { organizationId: true },
}
```

### Field types

`string` · `number` · `integer` · `boolean` · `object` · `array` · `datetime` · `uuid` · `null`

Unions allowed: `type: ["number", "string"]`.

### Rules

| Rule | Behavior |
|------|----------|
| Required missing | Reject (`EVENT_SCHEMA_INVALID`) |
| Wrong type | Reject |
| Null without `nullable` | Reject |
| Unknown keys | Allowed unless `additionalProperties: false` |
| `organizationId` | Injected from publish envelope when absent |

---

## Dispatcher flow

```
publish(input)
  → resolve name + registry definition
  → assertValidPayload(contract)   // M4.2A
  → persistEvent (immutable)
  → dispatch subscribers
```

Validation runs **before** DB write. Invalid events never enter the store.

`publishSafe` logs schema failures (non-blocking for domain modules).

`skipValidation: true` is escape hatch for tests only — do not use in product code.

---

## Versioning

- Event `version` and `contract.version` are aligned (semver `1.0.0`).  
- Additive optional fields → patch/minor, keep same major.  
- Breaking required-field changes → new major; register new definition or dual-publish.  

---

## API

`GET /api/platform/events?view=registry` returns each event with:

- `contract` — formal field map  
- `payloadJsonSchema` — JSON Schema export for tooling  

---

## Source of truth

| File | Role |
|------|------|
| `contracts/schema.ts` | Validator + JSON Schema export |
| `contracts/helpers.ts` | Field builders |
| `registry/definitions.ts` | All registered contracts |

---

## Tests

```bash
npm run test:event-contracts
```
