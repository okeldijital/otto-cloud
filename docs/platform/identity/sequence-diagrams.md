# IAM Sequence Diagrams (v1.0)

## Login + MFA

```
Client → POST /api/auth/login
       → AuthenticationService (password)
       → [optional] MfaChallengeService
       ← nextStep: mfa_required
Client → POST /api/auth/mfa/verify
       → SessionService.createSession
       ← cookies (session, refresh, access)
```

## Organization switch

```
Client → POST /api/auth/organizations/switch
       → OrganizationSwitchService
       → PermissionResolver
       → re-issue access token (org claim)
       ← permissions for new org
```

## Authorization

```
Handler → requirePermission(req, "contracts.review")
        → PermissionResolver.resolve
        → AuthorizationService.authorize
        → continue | 403
```
