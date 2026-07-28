# ADR-026 — Session Management

| Field | Value |
|-------|--------|
| **Status** | Accepted |
| **Phase** | A.3 |

## Decision

Every login creates a server-side `IamSession` with:

- Hashed session token  
- Refresh token chain (rotation)  
- Device / user-agent / optional IP  
- Expiry and revoke  

Users revoke single sessions; admins revoke all. Password change invalidates sessions (A.2).
