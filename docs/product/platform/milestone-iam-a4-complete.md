# Platform Milestone A.4 Complete — TOTP MFA

| Field | Value |
|-------|--------|
| Status | Implemented |
| Date | 2026-07-28 |
| Prior | [A.3 Sessions](./milestone-iam-a3-complete.md) |
| ADR | [ADR-031](./adr-031-multi-factor-authentication.md) |

---

## Delivered

- TOTP enrollment with password re-auth, encrypted secret, otpauth provisioning  
- Login MFA challenge **before** session creation  
- `nextStep` on login responses  
- Recovery codes (hashed, single-use, regenerable)  
- Trusted devices skip MFA  
- Org MFA policy modes  
- User UI `/settings/security/mfa`  
- Admin MFA status/reset API  
- Platform events + audit via security events  

## APIs

| Method | Path |
|--------|------|
| POST | `/api/auth/mfa/enroll` |
| POST | `/api/auth/mfa/verify` |
| POST | `/api/auth/mfa/disable` |
| POST | `/api/auth/mfa/recovery` |
| POST | `/api/auth/mfa/recovery/regenerate` |
| GET | `/api/auth/mfa/status` |
| GET | `/api/auth/mfa/trusted-devices` |
| DELETE | `/api/auth/mfa/trusted-devices/:id` |
| GET/POST | `/api/admin/security/users/:id/mfa` |

## Migration

`20260729150000_iam_a4_mfa_totp`

```bash
npx prisma migrate deploy
npm run test:identity
```

## Not implemented

SMS · Email OTP · Push · Passkeys · Hardware keys
