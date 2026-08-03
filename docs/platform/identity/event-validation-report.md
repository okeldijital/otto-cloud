# Event Validation Report — IAM / `identity.login.failed`

## Issue

Failed login events produced **platform event validation warnings** during lab
validation (publish logged as failed via `publishSafe`).

## Event under test

| Field | Value |
|-------|--------|
| Name | `identity.login.failed` |
| Producer | `identity` via `emitIdentityEvent` |
| Consumers | `notifications`, `security` (registry) |

## Call path

```
AuthenticationService.login / failLogin / recordUnknownFailure
  → emitIdentityEvent({ eventType: LoginFailed, payload: { reason, email } })
      → iam_security_events INSERT (local audit, non-blocking on error)
      → publishPlatformEvent
          → bootstrapPlatformEvents()
          → eventDispatcher.publishSafe
              → assertValidPayload(contract, envelope.organizationId)
              → persistEvent (if valid)
              → dispatch subscribers
```

## Schema (before)

```ts
contract(V, {
  organizationId: f.uuid(),   // optional, but type-checked when present
  identityId: f.string(),
  sessionId: f.string(),
  email: f.string(),
  reason: f.string(),
})
// inject.organizationId = true (default)
```

## Root cause — schema mismatch

1. **Nil UUID used as envelope org when none exists**

   ```ts
   // events.ts (before)
   const orgId = params.organizationId || "00000000-0000-0000-0000-000000000000";
   ```

2. **Validator rejects nil UUID**

   UUID regex requires version nibble `1–5` and variant `8|9|a|b`:

   ```
   /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
   ```

   Nil UUID has version `0` → **validation error** on injected `organizationId`.

3. **Login-failed often has no tenant org**

   Unknown identity / pre-org failures correctly omit `organizationId`. The
   placeholder was intended to satisfy the bus envelope, but the placeholder
   itself was schema-invalid.

## Fix

| Change | Location |
|--------|----------|
| Replace nil UUID with RFC-valid platform system UUID `00000000-0000-4000-8000-000000000000` | `bootstrap/constants.ts`, `authentication/events.ts` |
| Allow nullable `organizationId` on IAM event contracts | `events/registry/definitions.ts` |
| Document optional IAM payload fields (`locked`, `roleKey`, etc.) | same |
| Only set `identityId` / `organizationId` on payload when present | `emitIdentityEvent` |

## Publisher / consumer verification

| Component | Status |
|-----------|--------|
| Publisher `emitIdentityEvent` | Fixed envelope UUID |
| Contract registry all `identity.*` events | Shared improved contract |
| `publishSafe` | Still non-blocking; valid events now persist |
| Notification subscriber | Does not match `identity.*` (no-op) — OK |
| Security consumers | Registry-only for now; no hard consumer failure |

## Expected validation result after fix

| Scenario | organizationId envelope | Valid? |
|----------|-------------------------|--------|
| Failed login, unknown user | `PLATFORM_SYSTEM_ORGANIZATION_ID` | Yes |
| Failed login, known user, no org | same | Yes |
| Login success with org context | real org UUID | Yes |
| Org created | real org UUID | Yes |

## Regression prevention

- Never use the nil UUID as a platform envelope id
- IAM events must tolerate missing tenant context
- Schema tests: extend with `identity.login.failed` cases when adding contract tests
