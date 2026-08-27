# IAM UI Auth Boundary

UI integration work is isolated on `fix/iam-ui-auth-boundary`. `OrgContext` now consumes canonical IAM organisation state without a legacy fallback. A cookie-backed IAM API client is present for migration of remaining UI calls.
