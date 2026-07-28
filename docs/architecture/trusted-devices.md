# Trusted Devices (Foundation)

Table: `iam_trusted_devices`

| Field | Purpose |
|-------|---------|
| trusted | Boolean flag |
| trustedAt | When marked trusted |
| trustedUntil | Trust expiry |
| revokedAt | Revocation |
| deviceId | Optional link to `iam_devices` |
| deviceTokenHash | Cookie token hash |

**A.3:** model + service only.  
**A.4:** MFA challenge skip when trusted cookie present.

Events: `identity.session.trusted` / `untrusted`
