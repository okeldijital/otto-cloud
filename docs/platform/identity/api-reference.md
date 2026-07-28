# Identity API Reference (v1.0)

Base: authenticated via HttpOnly cookies (`otto_sid`, `otto_rid`, `otto_at`) unless noted.

## Auth

| Method | Path | Auth | Permission | Description |
|--------|------|------|------------|-------------|
| POST | `/api/auth/login` | No | — | Login; may return `nextStep: mfa_required` without cookies |
| POST | `/api/auth/logout` | Yes | — | Revoke current session |
| POST | `/api/auth/logout-all` | Yes | — | Logout devices |
| GET | `/api/auth/session` | Cookie | — | SSOT session state |
| POST | `/api/auth/refresh` | Cookie | — | Rotate refresh token |
| POST | `/api/auth/register` | No | — | Create identity |
| POST | `/api/auth/change-password` | Yes | — | Change password |
| POST | `/api/auth/forgot-password` | No | — | Request reset (no enumeration) |
| POST | `/api/auth/reset-password` | No | — | Complete reset |
| GET | `/api/auth/password-policy` | No | — | Client-safe policy |
| GET | `/api/auth/password/status` | Yes | — | Password lifecycle status |
| POST | `/api/auth/password/force-reset` | Yes | `security.manage` | Admin force reset |

## MFA

| Method | Path | Auth | Permission |
|--------|------|------|------------|
| POST | `/api/auth/mfa/enroll` | Yes | — (password re-auth body) |
| POST | `/api/auth/mfa/verify` | Mixed | Login challenge or enroll confirm |
| POST | `/api/auth/mfa/disable` | Yes | — |
| GET | `/api/auth/mfa/status` | Yes | — |
| POST | `/api/auth/mfa/recovery` | No | Login challenge recovery |
| POST | `/api/auth/mfa/recovery/regenerate` | Yes | — |
| GET | `/api/auth/mfa/trusted-devices` | Yes | — |
| DELETE | `/api/auth/mfa/trusted-devices/:id` | Yes | — |

## Sessions

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/auth/sessions` | Yes |
| GET | `/api/auth/sessions/:id` | Yes |
| DELETE | `/api/auth/sessions/:id` | Yes |
| POST | `/api/auth/sessions/cleanup` | `security.manage` |

## Organizations

| Method | Path | Permission |
|--------|------|------------|
| GET/POST | `/api/auth/organizations` | Auth |
| POST | `/api/auth/organizations/switch` | Auth |
| GET | `/api/auth/organizations/roles` | Membership |
| GET/POST | `/api/admin/organizations` | `organizations.manage` |
| GET/PATCH/DELETE | `/api/admin/organizations/:id` | `organizations.manage` |
| GET/POST | `/api/admin/organizations/:id/members` | `users.manage` |
| PATCH/DELETE | `.../members/:memberId` | `users.manage` |
| GET/POST | `.../invitations` | `users.invite` |
| DELETE | `/api/admin/invitations/:id` | `users.invite` |
| POST | `/api/auth/invitations/accept` | Optional auth |
| POST | `/api/auth/invitations/decline` | No |

## Platform

| Method | Path | Permission |
|--------|------|------------|
| GET | `/api/platform/health/identity` | Public health |
| GET | `/api/platform/metrics/identity` | `security.manage` / `audit.view` |

## Errors

| Code | HTTP | Meaning |
|------|------|---------|
| `UNAUTHENTICATED` | 401 | No valid session |
| `PERMISSION_DENIED` | 403 | Missing permission |
| `ORGANIZATION_REQUIRED` | 403 | No active org |
| `MEMBERSHIP_REQUIRED` | 403 | Inactive membership |
| `RATE_LIMITED` | 429 | Too many attempts |
| `INVALID_MFA_CODE` | 401 | Bad TOTP/recovery |
