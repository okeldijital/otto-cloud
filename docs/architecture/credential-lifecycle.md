# Credential Lifecycle

See [ADR-029](../product/platform/adr-029-credential-lifecycle.md).

## Operations

| Method | Behavior |
|--------|----------|
| `changePassword` | Verify current → policy → history → store → history → sessionVersion++ → revoke others |
| `resetPassword` | Consume token → policy → history → store → sessionVersion++ → revoke all |
| `forcePasswordReset` | Flag mustChangePassword → sessionVersion++ → revoke all |
| `expirePassword` | Flag from max age policy |
| `validatePassword` | Structured policy result |
| `revokeCredential` / `rotateCredential` | Force or change paths |

Nothing outside this service writes password hashes.
