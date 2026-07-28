# Platform Configuration

| Field | Value |
|-------|--------|
| **Package** | `lib/platform/config` |
| **Status** | Baseline (pre-A.1) |

## Owns

| Area | Module |
|------|--------|
| Security policies | `security/` |
| Feature flags | `features.ts` |
| Environment validation | `env.ts` |

## Security keys

| Logical key | Env var |
|-------------|---------|
| `security.password.minLength` | `SECURITY_PASSWORD_MIN_LENGTH` |
| `security.password.requireSymbols` | `SECURITY_PASSWORD_REQUIRE_SYMBOLS` |
| `security.session.maxAge` | `SECURITY_SESSION_MAX_AGE_HOURS` |
| `security.session.idleTimeout` | `SECURITY_SESSION_IDLE_TIMEOUT_HOURS` |
| `security.mfa.requiredForAdmins` | `SECURITY_MFA_REQUIRED_FOR_ADMINS` |
| `security.lockout.maxAttempts` | `SECURITY_LOCKOUT_MAX_ATTEMPTS` |
| `security.lockout.duration` | `SECURITY_LOCKOUT_DURATION_MINUTES` |

## Usage

```ts
import { getPlatformConfig } from "@/lib/platform/config";

const { security, features } = getPlatformConfig();
security.password.minLength;
security.session.maxAgeHours;
features.iamNativeAuth;
```
