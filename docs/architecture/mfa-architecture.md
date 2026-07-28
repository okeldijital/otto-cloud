# MFA Architecture (A.4)

| Field | Value |
|-------|--------|
| ADR | [ADR-031](../product/platform/adr-031-multi-factor-authentication.md) |

## Services

| Service | Role |
|---------|------|
| `MfaService` | Enroll / disable / status / admin reset |
| `TotpService` | RFC 6238 + encrypt |
| `RecoveryCodeService` | Generate / consume |
| `MfaChallengeService` | Login challenge lifecycle |
| `MfaPolicyService` | Org + platform requirements |
| `TrustedDeviceService` | Skip MFA (A.3 foundation) |
| `MfaRepository` | Data access |

## State machine

```
Password Verified → MFA Required? → Challenge → TOTP/Recovery → Session
```

## Tables

- `iam_mfa_credentials`
- `iam_recovery_codes`
- `iam_mfa_challenges`
- `iam_trusted_devices`
