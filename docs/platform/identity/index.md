# IAM Platform Documentation Index

**Version:** 1.0.0 · **Tag:** `iam-v1` · **SDK:** `@/lib/platform/sdk`

## Guides

| Doc | Description |
|-----|-------------|
| [overview.md](./overview.md) | Product overview |
| [architecture.md](./architecture.md) | Layering & boundaries |
| [sequence-diagrams.md](./sequence-diagrams.md) | Key flows |
| [api-reference.md](./api-reference.md) | HTTP API |
| [permission-reference.md](./permission-reference.md) | Permissions & roles |
| [event-reference.md](./event-reference.md) | Platform events |
| [deployment.md](./deployment.md) | Deploy & migrate |
| [bootstrap.md](./bootstrap.md) | Idempotent IAM bootstrap architecture |
| [deployment-workflow.md](./deployment-workflow.md) | Full deployment sequence |
| [cicd-workflow.md](./cicd-workflow.md) | CI/CD preparation |
| [rca-organization-create-hang.md](./rca-organization-create-hang.md) | Org create hang RCA |
| [event-validation-report.md](./event-validation-report.md) | identity.login.failed schema fix |
| [production-readiness.md](./production-readiness.md) | Production readiness assessment |
| [production-rehearsal-report.md](./production-rehearsal-report.md) | Production rehearsal plan & go/no-go |
| [access-recovery-report.md](./access-recovery-report.md) | Admin access recovery investigation |
| [rehearsal-baseline-snapshot.json](./rehearsal-baseline-snapshot.json) | Read-only DB baseline artifact |
| [operations.md](./operations.md) | Runbooks |
| [migration-guide.md](./migration-guide.md) | Legacy user migration |
| [security-review.md](./security-review.md) | Security audit |
| [performance-review.md](./performance-review.md) | Performance |
| [penetration-checklist.md](./penetration-checklist.md) | Pen checklist |

## ADR index

| ADR | Title | Summary |
|-----|-------|---------|
| [ADR-028](../../product/platform/adr-028-authentication-strategy.md) | Authentication Strategy | Identity ≠ Auth; native stack |
| [ADR-029](../../product/platform/adr-029-credential-lifecycle.md) | Credential Lifecycle | Password mutations via lifecycle service |
| [ADR-030](../../product/platform/adr-030-session-lifecycle.md) | Session Lifecycle | Session owns tokens |
| [ADR-031](../../product/platform/adr-031-multi-factor-authentication.md) | MFA | TOTP as credential factor |
| [ADR-032](../../product/platform/adr-032-iam-cutover.md) | IAM Cutover | Single auth provider |
| [ADR-033](../../product/platform/adr-033-organization-membership-rbac.md) | Org Membership & RBAC | Permission-driven authz |

## Milestones

| Milestone | Doc |
|-----------|-----|
| A.0–A.5 | product/platform/milestone-iam-* |
| A.4.5 Cutover | [milestone-iam-cutover.md](../../product/platform/milestone-iam-cutover.md) |
| **A.6 Productization** | [milestone-iam-a6-complete.md](../../product/platform/milestone-iam-a6-complete.md) |
