# passwords/ — A.2

| Module | Role |
|--------|------|
| `PasswordService.ts` | Hash / store / verify (low-level) |
| `PasswordResetService.ts` | Forgot/reset tokens |
| `PasswordHistoryService.ts` | Reuse prevention |
| `PasswordValidator.ts` | Structured policy validation |
| `password-policy.ts` | Compat wrappers |

**Mutations:** use `lifecycle/CredentialLifecycleService` only.  
**Data access:** `repositories/PasswordRepository`  
**Policy:** `policies/PasswordPolicyService` + platform config
