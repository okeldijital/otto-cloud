# Penetration Checklist (A.4.5)

| # | Test | Expected | Result |
|---|------|----------|--------|
| 1 | Brute force login | Rate limit / lockout | ✅ Implemented |
| 2 | Wrong password | 401 no enumeration detail | ✅ |
| 3 | Expired access token | 401; refresh issues new | ✅ |
| 4 | Reused refresh token | Session revoked | ✅ |
| 5 | Stolen session cookie | Revoke session invalidates | ✅ |
| 6 | MFA skip without trust cookie | Challenge required | ✅ |
| 7 | MFA challenge after expiry | Rejected | ✅ |
| 8 | Recovery code replay | Rejected | ✅ |
| 9 | Org switch without membership | Denied | ✅ IAM path |
| 10 | Privilege escalate via role string | Prefer permissions | ⚠️ residual bridges |
| 11 | Admin without permission | 403 | ✅ when perms seeded |
| 12 | Forced logout all | sessionVersion++ + revoke | ✅ |
| 13 | Anonymous admin API | 401 | ✅ |
| 14 | NextAuth cookie accepted | Not used | ✅ removed |
| 15 | Password reset token reuse | Rejected | ✅ |
| 16 | Cross-tenant data without org filter | Audit residual routes | ⚠️ ongoing |

## Staging validation

- [ ] Login / logout / refresh / reset password (IAM only)  
- [ ] MFA enroll + challenge  
- [ ] Session revoke + logout all  
- [ ] Org switch across modules  
- [ ] Grep confirms no `next-auth` imports in runtime code  
- [ ] Migration report run  
