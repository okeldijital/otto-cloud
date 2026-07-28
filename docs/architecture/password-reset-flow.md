# Password Reset Flow

```
POST /api/auth/forgot-password { email }
  → identical response always (no enumeration)
  → hashed token stored, TTL from config (default 60 min)
  → identity.password.reset.requested

POST /api/auth/reset-password { token, newPassword }
  → single-use + expiry + replay detection
  → policy + history validation
  → Argon2id hash
  → sessionVersion++
  → revoke all sessions
  → identity.password.reset.completed
```

Tokens: CSPRNG, SHA-256 hash at rest, never plaintext.
