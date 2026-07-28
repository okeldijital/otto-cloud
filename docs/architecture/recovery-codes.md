# Recovery Codes

- Count: `security.mfa.recoveryCodeCount` (default 10)  
- Format: cryptographically random, display as `XXXX-XXXX-XXXX`  
- Storage: SHA-256 hash only  
- Single-use; replay rejected  
- Regeneration invalidates all previous codes  

Events: `identity.mfa.recovery.used` · `identity.mfa.recovery.regenerated`
