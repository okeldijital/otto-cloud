# Trusted Devices

Foundation from A.3; **activated for MFA skip in A.4**.

After successful MFA challenge with `trustDevice: true`:

1. Create trusted device token cookie (`otto_td`)  
2. Link optional `deviceId`  
3. Skip MFA until `trustedUntil` / `expiresAt`  

Revoke via `DELETE /api/auth/mfa/trusted-devices/:id`.

Events: `identity.session.trusted` · `untrusted`
