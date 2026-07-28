# ADR-022 — Identity & Access Management

| Field | Value |
|-------|--------|
| **Status** | Accepted |
| **Date** | 2026-07-29 |
| **Milestone** | Platform A — IAM |

---

## Decision

Build a **new** Identity & Access Management platform under `lib/platform/identity/` with a **new `iam_*` schema**.

Do **not** migrate or retrofit:

- NextAuth configuration in `lib/auth.ts`  
- Legacy `User` / `users` table as the auth SoT  
- String role checks (`user.role === "admin"`)  

Legacy remains operational until dual-run cutover.

---

## Principles

1. Authentication ≠ authorization  
2. Argon2id for new passwords  
3. Server-side sessions + refresh rotation (A.1–A.3)  
4. Permission-based RBAC (`contracts.review`)  
5. Multi-org membership  
6. Identity events on Platform Event Bus  

---

## Related

- ADR-023 Authentication · ADR-024 Authorization · ADR-025 MFA · ADR-026 Sessions · ADR-027 Security Model  
