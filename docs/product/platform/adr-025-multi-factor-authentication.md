# ADR-025 — Multi-Factor Authentication

| Field | Value |
|-------|--------|
| **Status** | Accepted |
| **Phase** | A.4 |

## Decision

TOTP MFA with:

- Encrypted secrets at rest (`IAM_ENCRYPTION_KEY`)  
- One-time recovery codes (hashed)  
- Trusted devices (hashed device tokens)  
- Enable/disable with verification  

No SMS MFA in this platform milestone.
