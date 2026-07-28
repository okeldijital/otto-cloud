# Password Policy

Source: `getPlatformConfig().security.password`

| Key | Default | Env |
|-----|---------|-----|
| minimumLength | 12 | `SECURITY_PASSWORD_MIN_LENGTH` |
| maximumLength | 128 | `SECURITY_PASSWORD_MAX_LENGTH` |
| requireUppercase | true | `SECURITY_PASSWORD_REQUIRE_UPPERCASE` |
| requireLowercase | true | `SECURITY_PASSWORD_REQUIRE_LOWERCASE` |
| requireNumbers | true | `SECURITY_PASSWORD_REQUIRE_NUMBERS` |
| requireSymbols | true | `SECURITY_PASSWORD_REQUIRE_SYMBOLS` |
| minimumEntropy | 40 | `SECURITY_PASSWORD_MIN_ENTROPY` |
| historyDepth | 5 | `SECURITY_PASSWORD_HISTORY_DEPTH` |
| maximumAgeDays | 0 (off) | `SECURITY_PASSWORD_MAX_AGE_DAYS` |
| minimumAgeMinutes | 0 | `SECURITY_PASSWORD_MIN_AGE_MINUTES` |
| allowPasswordReuse | false | `SECURITY_PASSWORD_ALLOW_REUSE` |
| algorithm | argon2id | — |

Client-safe subset via `GET /api/auth/password-policy`.
