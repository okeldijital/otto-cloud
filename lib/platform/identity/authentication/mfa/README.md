# mfa/ — A.4 TOTP

- `totp.ts` — RFC 6238 generate/verify  
- `mfa-service.ts` — enroll, challenge, recovery codes, trusted devices  

Schema: `iam_mfa_credentials`, `iam_recovery_codes`, `iam_trusted_devices`  
Secrets encrypted with AES-GCM (`encryptSecret`).
