# mfa/ — A.4 TOTP Multi-Factor Authentication

| Module | Role |
|--------|------|
| `MfaService.ts` | Enroll / disable / status / admin reset |
| `TotpService.ts` | RFC 6238 + AES-GCM secrets |
| `RecoveryCodeService.ts` | Hashed single-use codes |
| `MfaChallengeService.ts` | Login challenge (no session until pass) |
| `MfaPolicyService` (policies/) | Org + platform requirements |

**Rule:** Session is not created until MFA challenge succeeds.
