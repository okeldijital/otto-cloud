# ADR-028 — Authentication Strategy

| Field | Value |
|-------|--------|
| **Status** | Accepted |
| **Date** | 2026-07-29 |
| **Applies before** | Platform IAM A.1 |

---

## Decision

### 1. Separate Identity from Authentication

| Concern | Package | Meaning |
|---------|---------|---------|
| **Identity** | `lib/platform/identity/` (domain, orgs, permissions, events) | Who the principal is |
| **Authentication** | `lib/platform/identity/authentication/` | How they prove it |

Identity is the business domain. Authentication is one mechanism among many.

Future credentials (passkeys, Google/Microsoft/Okta SSO, API keys, service accounts) plug into **authentication/** without changing the Identity model.

### 2. Do not build A.1 on NextAuth / Auth.js

A.1 implements an OTTO-native stack:

```
POST /api/auth/login
  → IdentityService
  → AuthenticationService
  → SessionService
  → CookieService
  → Response
```

**Rationale:** Full control, simpler MFA/RBAC/org switching, first-class Platform Event Bus, no Auth.js abstraction debt. OTTO has outgrown NextAuth’s intended use case.

Legacy next-auth remains only until dual-run cutover (see legacy-archive).

### 3. Canonical models

**Authentication chain**

```
Identity → Credential → Authentication → Session → Authorization
```

**Session chain**

```
Identity → Session → Refresh Token → Access Token (optional)
```

**Authorization chain**

```
Identity → Organization Membership → Roles → Permissions
```

**Event flow**

```
Authentication → Identity Events → Platform Event Bus
  → Notifications / Audit / Security Monitoring
```

### 4. Platform Config owns security policy

```
lib/platform/config/
```

Central keys (env-backed), e.g.:

- `security.password.minLength`
- `security.password.requireSymbols`
- `security.session.maxAge`
- `security.session.idleTimeout`
- `security.mfa.requiredForAdmins`
- `security.lockout.maxAttempts`
- `security.lockout.duration`

Services **must not** hard-code security constants.

---

## Consequences

| Area | Implication |
|------|-------------|
| A.1 | Own login routes; no NextAuth provider for new IAM |
| Identity tables | Unchanged when adding SSO/passkeys |
| Config | `getPlatformConfig().security.*` everywhere |
| Cutover | Feature flag `FEATURE_IAM_NATIVE_AUTH` |

---

## Related

- ADR-022 IAM · ADR-023 Authentication · ADR-024 RBAC · ADR-025 MFA · ADR-026 Sessions · ADR-027 Security Model  
- [identity-architecture.md](../../architecture/identity-architecture.md)  
- [authentication.md](../../architecture/authentication.md)  
