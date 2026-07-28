# sessions/ — SessionService (A.1)

Server-side session + refresh token rotation.

```
Identity → Session → Refresh Token → Access Token (short-lived)
```

- Schema: `iam_sessions`, `iam_refresh_tokens`
- Policy: `getPlatformConfig().security.session`
- Reuse of a rotated refresh token revokes the entire session
