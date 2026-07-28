# TOTP Flow

## Enrollment

1. Re-enter password  
2. Generate secret → encrypt AES-GCM  
3. Return otpauth URL (client renders QR)  
4. User enters TOTP → enable  
5. Generate recovery codes (shown once)

## Login challenge

1. Password OK  
2. Create `iam_mfa_challenges` (TTL ~5 min)  
3. Client submits code via `POST /api/auth/mfa/verify`  
4. On success: create session + optional trusted device  

Compatible apps: Google Authenticator, Microsoft Authenticator, Authy, 1Password, Bitwarden, Apple Passwords.
