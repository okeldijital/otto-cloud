# email/ — EmailVerificationService (A.1)

Email verification tokens:

- expire (policy: `security.tokens.emailVerificationTtlHours`)
- single use
- cryptographically random
- hashed in storage (`iam_email_verification_tokens`)

Endpoints:

- `POST /api/auth/verify-email/request`
- `GET|POST /api/auth/verify-email`
- `POST /api/auth/resend-verification`
