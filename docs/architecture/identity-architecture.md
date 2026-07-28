# Identity Architecture

| Field | Value |
|-------|--------|
| **Package** | `lib/platform/identity` |
| **Status** | A.0 Foundation |

## Package layout

```
lib/platform/identity/
  domain/          types, errors
  crypto/          argon2id, tokens, secret-box
  credentials/     password policy
  authorization/   PermissionSet
  permissions/     catalog
  sessions/        (A.3)
  mfa/             (A.4)
  organizations/   (A.5)
  invitations/     (A.7)
  services/        identity + seed
  events/          event name catalog
```

## Data model

`iam_*` tables only. Bridge: `legacyUserId` / `legacyTenantId`.

## Dual-run

Legacy next-auth continues until A.1+ cutover. See legacy-archive README.
