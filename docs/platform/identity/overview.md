# IAM Platform Overview — v1.0

| Field | Value |
|-------|--------|
| Version | **1.0.0** |
| Tag | `iam-v1` |
| SDK | `@/lib/platform/sdk` |

## What IAM owns

| Concern | Description |
|---------|-------------|
| Identity | Principals, email, status |
| Authentication | Passwords, MFA, login |
| Sessions | Server sessions, refresh rotation |
| Organizations | Memberships, invitations, switch |
| Authorization | Permissions, roles, enforcement |

## Integration rule

```ts
// ✅ Supported
import { authorizationService, requirePermission } from "@/lib/platform/sdk";

// ❌ Not supported for business modules
import { membershipRepository } from "@/lib/platform/identity/repositories/...";
```

## Related ADRs

See [index.md](./index.md).
