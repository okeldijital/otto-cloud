# ADR-031 — Multi-Factor Authentication

| Field | Value |
|-------|--------|
| **Status** | Accepted |
| **Date** | 2026-07-28 |
| **Applies** | Platform IAM A.4 |

---

## Decision

TOTP (RFC 6238) is one **credential type** on an identity—not a special case hard-coded into login.

```
Password verified → MFA required? → Challenge → Session
```

**No session is created until the MFA challenge succeeds** (unless MFA is not required / trusted device).

### Factors

Password · TOTP · Recovery code · (future: passkey, SSO, API key)

### Secrets

- TOTP secrets: AES-GCM via `IAM_ENCRYPTION_KEY`
- Recovery codes: hashed, single-use
- Challenges: hashed tokens, short TTL, max attempts

### Policies

Organization `mfaPolicy`: disabled | optional | required_admins | required_owners | required_all

Trusted devices (A.3 foundation) skip MFA until expiry.

---

## Consequences

- Login API returns `nextStep: mfa_required` without cookies.
- SMS/email OTP/push/WebAuthn can plug in as additional factors later.
