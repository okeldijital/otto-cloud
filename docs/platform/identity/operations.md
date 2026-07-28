# IAM Operational Runbooks (v1.0)

## Password reset (user)

1. User visits `/auth/forgot-password`  
2. Token emailed/logged (dev)  
3. `/auth/reset-password?token=`  

## Force password reset (admin)

```
POST /api/auth/password/force-reset
{ "identityId": "...", "reason": "security" }
```

Requires `security.manage`.

## Force logout all devices

```
POST /api/auth/logout-all
{ "forceAll": true }
```

Or admin revoke via `/api/admin/security/sessions/:id`.

## Reset MFA

```
POST /api/admin/security/users/:id/mfa
{ "action": "reset" }
```

## Transfer ownership

```
PATCH /api/admin/organizations/:orgId/members/:newOwnerIdentityId
{ "action": "transfer_ownership" }
```

## Recover administrator

1. DB: ensure identity `status=active`, `mustChangePassword=false`  
2. Attach membership with `owner` or `org_admin` role  
3. Or run migrate + force password reset  

## Rotate encryption keys

1. Generate new `IAM_ENCRYPTION_KEY`  
2. Re-encrypt MFA secrets (ops job — not automated in v1.0)  
3. Users may need MFA re-enroll if re-encrypt unavailable  

## Emergency lockout

- Set identity `status=locked` or use lockout service  
- Or suspend memberships for org  

## Permission troubleshooting

1. `GET /api/auth/session` — check permissions list  
2. Confirm active org membership status  
3. Re-seed roles: `seedOrgSystemRoles`  
4. Check cache: switch org or bump `membershipVersion`  

## Invitation troubleshooting

1. Status must be `pending` and not expired  
2. Email domain policy  
3. Accept at `/auth/invite?token=`  
