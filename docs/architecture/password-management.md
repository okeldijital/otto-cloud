# Password Management (A.2)

| Field | Value |
|-------|--------|
| Package | `lib/platform/identity/authentication/` |
| ADR | [ADR-029](../product/platform/adr-029-credential-lifecycle.md) |

## Flow

```
Authentication → Credential Lifecycle → Password Credential
```

## Services

| Service | Role |
|---------|------|
| `CredentialLifecycleService` | Sole mutation entry point |
| `PasswordService` | Hash/store/verify |
| `PasswordResetService` | Token issue/consume |
| `PasswordHistoryService` | Reuse prevention |
| `PasswordValidator` | Policy checks |
| `PasswordPolicyService` | Config facade |
| `PasswordRepository` | Data access |

## Endpoints

- `POST /api/auth/change-password`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/password-policy`
- `GET /api/auth/password/status`
- `POST /api/auth/password/force-reset` (admin)
