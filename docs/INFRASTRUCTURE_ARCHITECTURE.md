# OTTO Cloud — Infrastructure Architecture

**Status:** Current architecture baseline
**Reviewed:** 2026-09-16
**Source of truth:** `main` plus the live Neon/Vercel control planes

## 1. Runtime topology

```text
GitHub / main
      |
      v
   Vercel
      |
      v
Next.js 16 application
      |
      +---------------------> Neon PostgreSQL
      |
      +---------------------> Cloudflare R2 object storage
      |
      +---------------------> Optional AI providers
                              - OpenAI
                              - Anthropic
```

The Cloud application is a single Next.js runtime. The current Vercel configuration contains no secondary container service.

## 2. Neon PostgreSQL

Live project: `otto` (`plain-tree-50826299`)

- Platform: AWS
- Region: `aws-us-east-1`
- PostgreSQL: 17
- Default/production branch: `production`
- Production branch is the primary/default branch.
- Vercel-created preview branches are used for preview deployments.
- Production compute autoscaling: 0.25–2 CU.
- Compute suspend timeout: 0 seconds.
- Logical replication: disabled.
- Public connections are currently permitted; no IP allowlist is configured.
- Project history retention is currently 6 hours.
- Neon branchable object storage is unavailable in this region and is not part of OTTO's storage architecture.

### Current branch hygiene

The project currently contains the production branch plus several Vercel preview branches and one backup branch. Preview branches are being created automatically from Vercel deployments. These branches are useful for isolation but must be treated as temporary infrastructure and cleaned up after their deployment lifecycle ends.

### Database access model

- `DATABASE_URL`: pooled runtime connection.
- `DIRECT_URL`: direct connection for migrations/admin operations.
- Prisma is the primary ORM.
- Raw SQL is used selectively where Prisma schema/client reconciliation requires it.
- Organization/tenant isolation is enforced at the application/database relationship layer.

### Infrastructure risks to resolve

1. Public database connections are enabled with no IP restriction.
2. Production branch is not marked protected in Neon.
3. Six-hour history retention is short for a commercial production system.
4. Vercel preview branches can accumulate and consume compute/storage history if not cleaned up.
5. Production backup/restore procedures need an explicit operational runbook and tested recovery point objective.

## 3. Vercel

The repository is intended to deploy as a single Next.js application.

Current repository configuration:

- Next.js framework.
- `npm run build` build command.
- `npm install --legacy-peer-deps` install command.
- `.next` output directory.
- No OCR service.
- No container service.
- No service binding.
- No OCR-specific environment contract.

The connected Vercel team currently does not expose an `otto-cloud` project through the available Vercel control-plane connection. Therefore the live Vercel production project ID, environment variables, domains, deployment history and runtime logs could not be independently verified in this audit.

This is an infrastructure-governance gap: the GitHub repository and Vercel control plane should point to one clearly identifiable production project.

## 4. Object storage

OTTO's application-level object storage target is **Cloudflare R2**.

The repository environment contract defines:

- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET_NAME`
- `R2_ENDPOINT`

The application includes AWS S3-compatible SDK dependencies, which is appropriate for Cloudflare R2's S3-compatible API.

Object storage is responsible for durable binary assets such as uploaded documents and attachments. PostgreSQL stores metadata and relationships; it should not be treated as the primary binary store.

The live R2 bucket, lifecycle rules, retention policy, object versioning, CORS policy and recovery procedure were not verifiable from the currently connected control plane. Those values must be recorded in the production infrastructure inventory before commercial launch.

## 5. AI infrastructure

AI is an **optional capability layer**, not a Core infrastructure dependency.

The repository currently carries SDKs for:

- OpenAI
- Anthropic

AI capabilities may be used by application services for intelligence features, but the Core product must remain operational without AI credentials or AI service availability.

The architecture must therefore enforce:

- no AI provider required for Core CRUD workflows;
- no AI provider required for authentication, authorization, organization isolation or primary record persistence;
- AI failures must degrade optional features rather than block Core workflows;
- provider credentials must remain server-side;
- AI usage, cost and failure telemetry should be tracked separately from Core application availability.

## 6. OCR retirement

OCR is **not part of the current OTTO Cloud infrastructure**.

The following have been retired from the repository and must not be reintroduced as runtime infrastructure without a new architecture decision:

- `ocr-worker/`
- Vercel OCR service configuration
- `OCR_WORKER_URL`
- `OCR_WORKER_TOKEN`
- `OCR_WORKER_TIMEOUT_MS`
- `OCR_LANG`
- OCR container/Docker configuration

Contract workflows now use deterministic repository/document storage and manual verification. Any future document intelligence capability must be introduced as an explicit optional AI capability, not as an implicit OCR infrastructure dependency.

## 7. Current readiness assessment

| Layer | Current state | Readiness note |
|---|---|---|
| Next.js/Vercel runtime | Partially verified | Repository configuration is aligned; live Vercel project access is unresolved. |
| Neon PostgreSQL | Live | Production branch is healthy; security, retention and branch-governance hardening remain. |
| Object storage | Application contract defined | R2 is the intended provider; live bucket controls still require verification. |
| AI | Optional | SDKs present; Core must remain independent of provider availability. |
| OCR | Retired | No runtime or deployment component should remain. |
| Disaster recovery | Incomplete | Backup/restore and tested recovery procedures require formalization. |

## 8. Required next infrastructure actions

1. Identify and verify the canonical Vercel `otto-cloud` production project and its production/preview environment configuration.
2. Verify the production R2 bucket, lifecycle, retention, access and recovery controls.
3. Protect the Neon production branch.
4. Define a stronger Neon history/backup policy appropriate for commercial production.
5. Establish preview-branch retention/cleanup rules.
6. Establish a tested production restore procedure and document the target RPO/RTO.
7. Remove the unused `@vercel/blob` dependency if repository-wide usage remains absent after dependency verification.
8. Keep AI optional and isolated from Core workflows.

## 9. Governance

This document is the repository-level infrastructure baseline. Any change to the runtime topology, database provider/region, storage provider, AI provider architecture or deployment model should update this document and the corresponding OTTO Notion infrastructure record in the same implementation slice.
