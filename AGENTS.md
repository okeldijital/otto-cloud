# Agent Implementation & Deployment Guidelines

- Inspect architecture, governance, and affected systems before modifying code.
- Plan complete changes and implement coherent slices; do not commit or push every small change.
- Treat every Git push as an infrastructure operation that may trigger CI, deployments, builds, artifacts, and resource consumption.
- Validate locally before pushing: tests, type checks, linting, builds, configuration, and diff review as applicable.
- Audit governed changes before deployment.
- Check container, registry, storage, compute, and quota implications before repeated builds.
- If CI, deployment, registry, storage, quota, or infrastructure fails, stop and diagnose before retrying.
- Make significant infrastructure side effects explicit.
- Consolidate experimental iterations before delivery.
- Never use Production as a development loop. Prefer: Understand → Implement → Validate → Audit → Deploy → Verify.
- Document important architectural and operational lessons and convert recurring failures into governance rules.

**Default sequence:** Inspect → Plan → Implement → Test → Audit → Commit → Push → Deploy → Verify.

Optimize for correctness, controlled execution, and minimal infrastructure churn.
