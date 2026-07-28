# MFA Architecture

Phase **A.4**. Schema ready:

- `iam_mfa_credentials` (encrypted TOTP secret)  
- `iam_recovery_codes` (hashed)  
- `iam_trusted_devices`  

Crypto helpers: `encryptSecret` / `decryptSecret`.
