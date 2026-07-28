# Platform Milestone A.6 Complete — IAM Productization (v1.0)

| Field | Value |
|-------|--------|
| Status | Implemented |
| Version | **IAM Platform 1.0.0** |
| Tag | **`iam-v1`** |
| Date | 2026-07-28 |
| SDK | `@/lib/platform/sdk` |

---

## Objective

Freeze IAM as a stable platform product. Business domains consume the SDK only.

## Delivered

- Platform SDK (`lib/platform/sdk/*`)  
- Public contracts (`lib/platform/identity/contracts`)  
- Metrics (`iamMetrics`) + health/metrics endpoints  
- Full documentation set under `docs/platform/identity/`  
- ADR index  
- Productization validation tests  

## Integration

```ts
import {
  IAM_PLATFORM_VERSION,
  authorizationService,
  requirePermission,
  authenticationService,
  organizationService,
  IDENTITY_EVENTS,
} from "@/lib/platform/sdk";
```

## Health

```
GET /api/platform/health/identity
GET /api/platform/metrics/identity  (authenticated admin)
```

## Compatibility

- Internal `@/lib/platform/identity` remains for IAM implementation  
- New business code **must** use `@/lib/platform/sdk`  
- Breaking interface changes require IAM v2.0  

## Next

Return to business domains (Usage, Royalties, Rights, Release) on this foundation.
