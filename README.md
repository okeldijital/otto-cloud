# OTTO Cloud

**Record Label Operating System — Cloud Platform**

OTTO Cloud is the governed cloud implementation of OTTO for record-label operations, catalog, releases, rights, contracts, and related workflows.

> **Governance:** The current Cloud architecture supersedes the historical Browser + SQLite OTTO V1.0.1 desktop application. Historical V1 material is archived under `docs/archive/` and must not be used as implementation guidance.

## Architecture

- **Application:** Next.js App Router + TypeScript
- **ORM:** Prisma
- **Database:** PostgreSQL / Neon
- **Authentication & authorization:** server-side session and organization-scoped resource authorization
- **Deployment/testing acceptance:** Vercel
- **Repository:** GitHub

## Development model

1. **`main` is the exclusive implementation source of truth.**
2. Changes are made against the current `main` state; stale feature branches are not treated as authoritative.
3. Vercel deployment is the project acceptance gate.
4. **Vercel READY = green.** GitHub Actions is not the acceptance gate for OTTO Cloud.
5. Notion under `Okel Dijital HQ/Projects/Otto-Cloud` records governance decisions, implementation state, and acceptance evidence.

## Current delivery focus

The current delivery stream is **Release & Rights Management (RRM)**, with organization isolation and release lifecycle behavior treated as governance-critical controls.

## Repository documentation

- `ARCHITECTURE_AUDIT.md` — architecture and migration audit
- `docs/archive/` — historical V1 material retained for provenance only
- `.env.example` — environment configuration reference

## Source of truth

For implementation truth, use **`main`**. For deployment acceptance, use Vercel. For project governance and operational decisions, use the OTTO Cloud Notion project record.

## License

Proprietary — All rights reserved.
