# Organization Context Audit

**Generated:** 2026-07-20  
**Scope:** `app/`, `lib/`, `components/`, `hooks/`  
**Total matching lines:** 540

## Classification legend

| Code | Meaning |
|------|--------|
| KEEP-FIELD | Prisma/DB column name in queries or payloads; value must come from context |
| MIGRATE-RESOLVER | Resolves org from session/manual logic → use `getOrganizationContext()` |
| MIGRATE-HARDCODE | Hardcoded UUID/default org → compatibility layer only |
| MIGRATE-TENANT | Uses `tenant_id` as scope → fold into organization context |
| GLOBAL-ENTITY | Entity has no org column (tracks/labels/publishers) |
| DEFER | Keyword match; low risk or intentional |

## Summary by classification

- **KEEP-FIELD**: 317
- **MIGRATE-RESOLVER**: 150
- **MIGRATE-TENANT**: 64
- **MIGRATE-HARDCODE**: 7
- **DEFER**: 2

## Occurrence inventory (106 files)

### `app/(dashboard)/admin/page.tsx`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 118 | `<td className="p-4 text-sm font-mono text-text-secondary">{org.organization_id}</td>` | KEEP-FIELD | organization_id field; supply value via context |
| 161 | `<td className="p-4 text-sm font-mono text-text-secondary">{u.organization_id?.slice(0, 8)}...</td>` | KEEP-FIELD | organization_id field; supply value via context |

### `app/(dashboard)/settings/organization/page.tsx`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 12 | `import { useOrg } from "@/contexts/OrgContext";` | DEFER | Matched keyword; review |

### `app/api/admin-of-works/works/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 12 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 19 | `where: { organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 27 | `prisma.works_admin.count({ where: { organization_id: orgId } }),` | KEEP-FIELD | organization_id field; supply value via context |
| 42 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 47 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/admin/orgs/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 21 | `organization_id: org.organization_id,` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/admin/users/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 17 | `organization_id: true,` | KEEP-FIELD | organization_id field; supply value via context |
| 43 | `select: { id: true, email: true, name: true, is_active: true, is_superuser: true, role: true, organization_id:` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/ai/analytics/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 13 | `const orgIdStr = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 19 | `prisma.contracts.count({ where: { organization_id: orgIdInt } }),` | KEEP-FIELD | organization_id field; supply value via context |
| 20 | `prisma.artists.count({ where: { organization_id: orgIdStr } }),` | KEEP-FIELD | organization_id field; supply value via context |
| 21 | `prisma.releases.count({ where: { organization_id: orgIdStr } }),` | KEEP-FIELD | organization_id field; supply value via context |
| 23 | `prisma.works.count({ where: { organization_id: orgIdStr } }),` | KEEP-FIELD | organization_id field; supply value via context |
| 24 | `prisma.ai_sessions.count({ where: { organization_id: orgIdStr } }),` | KEEP-FIELD | organization_id field; supply value via context |
| 28 | `prisma.ai_contract_resolution_runs.count({ where: { organization_id: orgIdStr } }),` | KEEP-FIELD | organization_id field; supply value via context |
| 29 | `prisma.ai_core_write_proposal_runs.count({ where: { organization_id: orgIdInt } }),` | KEEP-FIELD | organization_id field; supply value via context |
| 30 | `prisma.ai_release_integration_runs.count({ where: { organization_id: orgIdInt } }),` | KEEP-FIELD | organization_id field; supply value via context |
| 31 | `prisma.ai_royalty_simulation_runs.count({ where: { organization_id: orgIdInt } }),` | KEEP-FIELD | organization_id field; supply value via context |
| 37 | `where: { organization_id: orgIdInt },` | KEEP-FIELD | organization_id field; supply value via context |
| 59 | `where: { organization_id: orgIdInt },` | KEEP-FIELD | organization_id field; supply value via context |
| 67 | `where: { organization_id: orgIdInt },` | KEEP-FIELD | organization_id field; supply value via context |
| 72 | `where: { organization_id: orgIdInt },` | KEEP-FIELD | organization_id field; supply value via context |
| 77 | `total_contracts: await prisma.contracts.count({ where: { organization_id: orgIdInt } }),` | KEEP-FIELD | organization_id field; supply value via context |
| 86 | `prisma.artists.count({ where: { organization_id: orgIdStr } }),` | KEEP-FIELD | organization_id field; supply value via context |
| 87 | `prisma.releases.count({ where: { organization_id: orgIdStr } }),` | KEEP-FIELD | organization_id field; supply value via context |
| 89 | `prisma.works.count({ where: { organization_id: orgIdStr } }),` | KEEP-FIELD | organization_id field; supply value via context |
| 94 | `where: { organization_id: orgIdStr },` | KEEP-FIELD | organization_id field; supply value via context |
| 100 | `where: { organization_id: orgIdStr },` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/ai/audit/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 15 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 45 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 71 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/ai/contracts/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 13 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 19 | `where: { id: parseInt(id), organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 27 | `where: { organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 45 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 54 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 69 | `where: { id: parseInt(run_id), organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 101 | `where: { OR: nameFilters, organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 126 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/ai/core-write/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 13 | `const orgIdStr = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 24 | `where: { id: parseInt(id), organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 35 | `where: { organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 56 | `const orgIdStr = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 66 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 78 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 98 | `where: { id: parseInt(run_id), organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 105 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/ai/draft/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 14 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 42 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 71 | `where: { organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 83 | `where: { id, organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 104 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 108 | `where: { organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 119 | `where: { id, organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/ai/release-integration/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 13 | `const orgIdStr = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 24 | `where: { id: parseInt(id), organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 32 | `where: { organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 50 | `const orgIdStr = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 66 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 79 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 92 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 111 | `where: { id: parseInt(run_id), organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 119 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/ai/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 13 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 37 | `where: { id: sessionId, organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 45 | `where: { organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 80 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 90 | `where: { id: parseInt(session_id), organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 95 | `data: { organization_id: orgId, user_id: userId },` | KEEP-FIELD | organization_id field; supply value via context |
| 142 | `where: { id, organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/ai/royalty/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 24 | `const orgIdStr = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 35 | `where: { id: parseInt(id), organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 42 | `where: { organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 62 | `const orgIdStr = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 136 | `where: { organization_id: orgId, release_id: parseInt(release_id), request_hash: requestHash },` | KEEP-FIELD | organization_id field; supply value via context |
| 142 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/api-keys/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 12 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 14 | `where: { organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 43 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 55 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 86 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 92 | `where: { id: parseInt(id), organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/artists/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 65 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 114 | `where: { id, organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 139 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 157 | `const where: any = { organization_id: orgId };` | KEEP-FIELD | organization_id field; supply value via context |
| 184 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 194 | `organization_id: typeof orgId === "string" ? null : orgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 202 | `where: { name: body.name, organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 214 | `data: { ...artistData, organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 224 | `organization_id: typeof orgId === "string" ? null : orgId,` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/auth/register/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 23 | `const newOrgId = uuidv4();` | MIGRATE-HARDCODE | Generates UUID; org creation must be explicit |
| 24 | `const tenantId = uuidv4();` | MIGRATE-HARDCODE | Generates UUID; org creation must be explicit |
| 31 | `organization_id: newOrgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 32 | `tenant_id: tenantId,` | MIGRATE-TENANT | tenant_id field usage |
| 39 | `id: tenantId,` | MIGRATE-TENANT | tenantId camelCase |
| 50 | `tenant_id: tenantId,` | MIGRATE-TENANT | tenant_id field usage |

### `app/api/contracts/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 68 | `const orgIdStr = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 78 | `where: { id, organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 113 | `where: { id, organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 128 | `where: { organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 137 | `prisma.contracts.count({ where: { organization_id: orgId } }),` | KEEP-FIELD | organization_id field; supply value via context |
| 167 | `const orgIdStr = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 175 | `where: { contract_id: parseInt(id), track_id: parseInt(track_id), organization_id: String(orgId) },` | KEEP-FIELD | organization_id field; supply value via context |
| 182 | `organization_id: String(orgId),` | KEEP-FIELD | organization_id field; supply value via context |
| 195 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 230 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 246 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 261 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 276 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 307 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 325 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/export/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 19 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |

### `app/api/iam/audit/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 12 | `const orgId = (user as any).organization_id;` | KEEP-FIELD | organization_id field; supply value via context |
| 13 | `const tenantId = (user as any).tenant_id \|\| orgId;` | MIGRATE-TENANT | tenant_id field usage |
| 20 | `const where: any = { tenant_id: tenantId };` | MIGRATE-TENANT | tenant_id field usage |

### `app/api/iam/roles/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 39 | `organization_id: body.organization_id \|\| null,` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/iam/teams/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 13 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 27 | `where: { organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 39 | `const orgId = (user as any).organization_id;` | KEEP-FIELD | organization_id field; supply value via context |
| 61 | `where: { organization_id_name: { organization_id: orgId, name: body.name } },` | KEEP-FIELD | organization_id field; supply value via context |
| 66 | `data: { name: body.name, description: body.description \|\| null, organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 86 | `const orgId = (user as any).organization_id;` | KEEP-FIELD | organization_id field; supply value via context |
| 87 | `const team = await prisma.teams.findFirst({ where: { id: body.id, organization_id: orgId } });` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/iam/users/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 14 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 15 | `const tenantId = (session.user as any).tenant_id \|\| orgId;` | MIGRATE-RESOLVER | Direct session cast org/tenant read |
| 23 | `select: { id: true, email: true, name: true, is_active: true, is_superuser: true, role: true, department: true` | KEEP-FIELD | organization_id field; supply value via context |
| 38 | `where: { tenant_id: tenantId },` | MIGRATE-TENANT | tenant_id field usage |
| 61 | `const orgId = (actor as any).organization_id;` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/import/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 17 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |

### `app/api/invitations/accept/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 32 | `tenant_id: invitation.tenant_id,` | MIGRATE-TENANT | tenant_id field usage |
| 42 | `organization_id: invitation.tenant_id,` | MIGRATE-TENANT | tenant_id field usage |
| 43 | `tenant_id: invitation.tenant_id,` | MIGRATE-TENANT | tenant_id field usage |
| 49 | `where: { tenant_id_user_id: { tenant_id: invitation.tenant_id, user_id: user.id } },` | MIGRATE-TENANT | Session/user tenant_id as active org proxy |
| 52 | `tenant_id: invitation.tenant_id,` | MIGRATE-TENANT | tenant_id field usage |
| 72 | `organization_id: invitation.tenant_id,` | MIGRATE-TENANT | tenant_id field usage |

### `app/api/invitations/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 34 | `const orgId = (user as any).organization_id;` | KEEP-FIELD | organization_id field; supply value via context |
| 35 | `const tenantId = (user as any).tenant_id \|\| orgId;` | MIGRATE-TENANT | tenant_id field usage |
| 38 | `where: { tenant_id: tenantId },` | MIGRATE-TENANT | tenant_id field usage |
| 52 | `const orgId = (user as any).organization_id;` | KEEP-FIELD | organization_id field; supply value via context |
| 53 | `const tenantId = (user as any).tenant_id \|\| orgId;` | MIGRATE-TENANT | tenant_id field usage |
| 62 | `tenant_id: tenantId,` | MIGRATE-TENANT | tenant_id field usage |
| 78 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/network/health/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 11 | `const orgIdStr = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |

### `app/api/network/individuals/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 5 | `import { getOrgIds } from "@/lib/org";` | MIGRATE-RESOLVER | Legacy helper → re-export from organization-context |
| 13 | `const { intOrgId } = getOrgIds(session);` | MIGRATE-RESOLVER | Legacy helper → re-export from organization-context |
| 19 | `where: { id, organization_id: intOrgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 33 | `where: { organization_id: intOrgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 55 | `const { intOrgId } = getOrgIds(session);` | MIGRATE-RESOLVER | Legacy helper → re-export from organization-context |
| 70 | `organization_id: intOrgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 74 | `if (body.organization_ids?.length) {` | KEEP-FIELD | organization_id field; supply value via context |
| 75 | `for (const orgId2 of body.organization_ids) {` | KEEP-FIELD | organization_id field; supply value via context |
| 77 | `data: { individual_id: individual.id, organization_id: parseInt(orgId2) },` | KEEP-FIELD | organization_id field; supply value via context |
| 95 | `const { intOrgId } = getOrgIds(session);` | MIGRATE-RESOLVER | Legacy helper → re-export from organization-context |
| 100 | `const existing = await prisma.individuals.findFirst({ where: { id, organization_id: intOrgId } });` | KEEP-FIELD | organization_id field; supply value via context |
| 117 | `if (body.organization_ids !== undefined) {` | KEEP-FIELD | organization_id field; supply value via context |
| 119 | `for (const orgId2 of body.organization_ids) {` | KEEP-FIELD | organization_id field; supply value via context |
| 121 | `data: { individual_id: id, organization_id: parseInt(orgId2) },` | KEEP-FIELD | organization_id field; supply value via context |
| 139 | `const { intOrgId } = getOrgIds(session);` | MIGRATE-RESOLVER | Legacy helper → re-export from organization-context |
| 144 | `const existing = await prisma.individuals.findFirst({ where: { id, organization_id: intOrgId } });` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/network/organizations/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 51 | `const orgIdStr = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 60 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 113 | `await prisma.individual_organizations.deleteMany({ where: { organization_id: id } });` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/notifications/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 12 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 17 | `const where: any = { is_read: false, organization_id: orgId };` | KEEP-FIELD | organization_id field; supply value via context |
| 23 | `const where: any = { organization_id: orgId };` | KEEP-FIELD | organization_id field; supply value via context |
| 49 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 64 | `const where: any = { is_read: false, organization_id: orgId };` | KEEP-FIELD | organization_id field; supply value via context |
| 74 | `const where: any = { organization_id: orgId };` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/office/audit-logs/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 12 | `const orgIdStr = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 42 | `if (orgId) where.organization_id = orgId;` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/office/documents/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 13 | `const orgIdStr = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 24 | `organization_id: orgIdStr,` | KEEP-FIELD | organization_id field; supply value via context |
| 38 | `where: { id, organization_id: orgIdStr, is_deleted: false },` | KEEP-FIELD | organization_id field; supply value via context |
| 50 | `const where: any = { organization_id: orgIdStr, is_deleted: false };` | KEEP-FIELD | organization_id field; supply value via context |
| 81 | `const orgIdStr = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 126 | `organization_id: orgIdStr,` | KEEP-FIELD | organization_id field; supply value via context |
| 150 | `organization_id: orgIdStr,` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/office/events/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 12 | `const orgIdStr = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 19 | `organization_id: orgIdStr,` | KEEP-FIELD | organization_id field; supply value via context |
| 33 | `where: { id, organization_id: orgIdStr, is_deleted: false },` | KEEP-FIELD | organization_id field; supply value via context |
| 49 | `const where: any = { organization_id: orgIdStr, is_deleted: false };` | KEEP-FIELD | organization_id field; supply value via context |
| 83 | `const orgIdStr = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 104 | `organization_id: orgIdStr,` | KEEP-FIELD | organization_id field; supply value via context |
| 130 | `organization_id: orgIdStr,` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/office/notes/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 5 | `import { getOrgIds } from "@/lib/org";` | MIGRATE-RESOLVER | Legacy helper → re-export from organization-context |
| 13 | `const { uuidOrgId } = getOrgIds(session);` | MIGRATE-RESOLVER | Legacy helper → re-export from organization-context |
| 19 | `where: { id, organization_id: uuidOrgId, is_deleted: false },` | KEEP-FIELD | organization_id field; supply value via context |
| 33 | `const where: any = { organization_id: uuidOrgId, is_deleted: false };` | KEEP-FIELD | organization_id field; supply value via context |
| 68 | `const { uuidOrgId } = getOrgIds(session);` | MIGRATE-RESOLVER | Legacy helper → re-export from organization-context |
| 85 | `organization_id: uuidOrgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 106 | `organization_id: uuidOrgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 123 | `const { uuidOrgId } = getOrgIds(session);` | MIGRATE-RESOLVER | Legacy helper → re-export from organization-context |
| 128 | `const existing = await prisma.notes.findFirst({ where: { id, organization_id: uuidOrgId, is_deleted: false } }` | KEEP-FIELD | organization_id field; supply value via context |
| 160 | `const { uuidOrgId } = getOrgIds(session);` | MIGRATE-RESOLVER | Legacy helper → re-export from organization-context |
| 165 | `const existing = await prisma.notes.findFirst({ where: { id, organization_id: uuidOrgId, is_deleted: false } }` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/office/reports/runs/[runId]/data/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 13 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 17 | `where: { id: runId, organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/office/status-quo/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 12 | `const orgIdStr = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 18 | `where: { id, organization_id: orgIdStr },` | KEEP-FIELD | organization_id field; supply value via context |
| 33 | `const where: any = { organization_id: orgIdStr };` | KEEP-FIELD | organization_id field; supply value via context |
| 61 | `const orgIdStr = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 70 | `where: { id: itemId, organization_id: orgIdStr },` | KEEP-FIELD | organization_id field; supply value via context |
| 88 | `organization_id: orgIdStr,` | KEEP-FIELD | organization_id field; supply value via context |
| 103 | `organization_id: orgIdStr,` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/office/tasks/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 12 | `const orgIdStr = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 18 | `where: { id, organization_id: orgIdStr, is_deleted: false },` | KEEP-FIELD | organization_id field; supply value via context |
| 34 | `const where: any = { organization_id: orgIdStr, is_deleted: false };` | KEEP-FIELD | organization_id field; supply value via context |
| 70 | `const orgIdStr = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 88 | `organization_id: orgIdStr,` | KEEP-FIELD | organization_id field; supply value via context |
| 109 | `organization_id: orgIdStr,` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/organizations/ai/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 10 | `const tenantId = (session.user as any).tenant_id;` | MIGRATE-RESOLVER | Direct session cast org/tenant read |
| 11 | `if (!tenantId) return NextResponse.json({ error: "No organization context" }, { status: 400 });` | MIGRATE-TENANT | tenantId camelCase |
| 14 | `where: { id: tenantId },` | MIGRATE-TENANT | tenantId camelCase |
| 33 | `const tenantId = (session.user as any).tenant_id;` | MIGRATE-RESOLVER | Direct session cast org/tenant read |
| 34 | `if (!tenantId) return NextResponse.json({ error: "No organization context" }, { status: 400 });` | MIGRATE-TENANT | tenantId camelCase |
| 56 | `where: { id: tenantId },` | MIGRATE-TENANT | tenantId camelCase |

### `app/api/organizations/branding/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 10 | `const tenantId = (session.user as any).tenant_id;` | MIGRATE-RESOLVER | Direct session cast org/tenant read |
| 11 | `if (!tenantId) return NextResponse.json({ error: "No organization context" }, { status: 400 });` | MIGRATE-TENANT | tenantId camelCase |
| 14 | `where: { id: tenantId },` | MIGRATE-TENANT | tenantId camelCase |
| 37 | `const tenantId = (session.user as any).tenant_id;` | MIGRATE-RESOLVER | Direct session cast org/tenant read |
| 38 | `if (!tenantId) return NextResponse.json({ error: "No organization context" }, { status: 400 });` | MIGRATE-TENANT | tenantId camelCase |
| 61 | `where: { id: tenantId },` | MIGRATE-TENANT | tenantId camelCase |

### `app/api/organizations/current/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 10 | `const tenantId = (session.user as any).tenant_id;` | MIGRATE-RESOLVER | Direct session cast org/tenant read |
| 11 | `if (!tenantId) return NextResponse.json({ error: "No organization context" }, { status: 400 });` | MIGRATE-TENANT | tenantId camelCase |
| 14 | `where: { id: tenantId },` | MIGRATE-TENANT | tenantId camelCase |
| 30 | `const tenantId = (session.user as any).tenant_id;` | MIGRATE-RESOLVER | Direct session cast org/tenant read |
| 31 | `if (!tenantId) return NextResponse.json({ error: "No organization context" }, { status: 400 });` | MIGRATE-TENANT | tenantId camelCase |
| 55 | `where: { id: tenantId },` | MIGRATE-TENANT | tenantId camelCase |

### `app/api/organizations/members/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 11 | `const tenantId = (session.user as any).tenant_id;` | MIGRATE-RESOLVER | Direct session cast org/tenant read |
| 12 | `if (!tenantId) return NextResponse.json({ error: "No organization context" }, { status: 400 });` | MIGRATE-TENANT | tenantId camelCase |
| 15 | `where: { tenant_id: tenantId },` | MIGRATE-TENANT | tenant_id field usage |
| 62 | `const tenantId = (session.user as any).tenant_id;` | MIGRATE-RESOLVER | Direct session cast org/tenant read |
| 64 | `if (!tenantId \|\| isNaN(actorId)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });` | MIGRATE-TENANT | tenantId camelCase |
| 77 | `where: { tenant_id_user_id: { tenant_id: tenantId, user_id: existingUser.id } },` | MIGRATE-TENANT | Session/user tenant_id as active org proxy |
| 85 | `tenant_id: tenantId,` | MIGRATE-TENANT | tenant_id field usage |
| 97 | `const token = uuidv4().replace(/-/g, "").slice(0, 32);` | MIGRATE-HARDCODE | Generates UUID; org creation must be explicit |
| 100 | `tenant_id: tenantId,` | MIGRATE-TENANT | tenant_id field usage |
| 120 | `const tenantId = (session.user as any).tenant_id;` | MIGRATE-RESOLVER | Direct session cast org/tenant read |
| 121 | `if (!tenantId) return NextResponse.json({ error: "No organization context" }, { status: 400 });` | MIGRATE-TENANT | tenantId camelCase |
| 129 | `where: { id: tenantId },` | MIGRATE-TENANT | tenantId camelCase |
| 138 | `where: { tenant_id: tenantId, user_id: userId },` | MIGRATE-TENANT | tenant_id field usage |

### `app/api/organizations/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 64 | `const tenantId = uuidv4();` | MIGRATE-HARDCODE | Generates UUID; org creation must be explicit |
| 68 | `id: tenantId,` | MIGRATE-TENANT | tenantId camelCase |
| 79 | `tenant_id: tenantId,` | MIGRATE-TENANT | tenant_id field usage |
| 89 | `data: { tenant_id: tenantId },` | MIGRATE-TENANT | tenant_id field usage |

### `app/api/organizations/switch/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 15 | `const { tenant_id } = body;` | MIGRATE-TENANT | tenant_id field usage |
| 17 | `if (!tenant_id) {` | MIGRATE-TENANT | tenant_id field usage |
| 18 | `return NextResponse.json({ error: "tenant_id is required" }, { status: 400 });` | MIGRATE-TENANT | tenant_id field usage |
| 22 | `where: { tenant_id_user_id: { tenant_id, user_id: userId } },` | MIGRATE-TENANT | tenant_id field usage |
| 41 | `data: { tenant_id },` | MIGRATE-TENANT | tenant_id field usage |
| 44 | `return NextResponse.json({ success: true, tenant_id });` | MIGRATE-TENANT | tenant_id field usage |

### `app/api/organizations/transfer/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 10 | `const tenantId = (session.user as any).tenant_id;` | MIGRATE-RESOLVER | Direct session cast org/tenant read |
| 12 | `if (!tenantId \|\| isNaN(userId)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });` | MIGRATE-TENANT | tenantId camelCase |
| 23 | `where: { id: tenantId },` | MIGRATE-TENANT | tenantId camelCase |
| 33 | `where: { tenant_id_user_id: { tenant_id: tenantId, user_id: new_owner_id } },` | MIGRATE-TENANT | tenant_id field usage |
| 41 | `where: { id: tenantId },` | MIGRATE-TENANT | tenantId camelCase |

### `app/api/release-workspace/[id]/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 11 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 51 | `if (workspace.organization_id !== orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });` | KEEP-FIELD | organization_id field; supply value via context |
| 65 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 73 | `if (existing.organization_id !== orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/release-workspace/approvals/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 15 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 17 | `where: { workspace_id: parseInt(workspaceId), organization_id: orgId, is_deleted: false },` | KEEP-FIELD | organization_id field; supply value via context |
| 31 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 40 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 61 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |

### `app/api/release-workspace/deliverables/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 17 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 19 | `where: { workspace_id: parseInt(workspaceId), organization_id: orgId, is_deleted: false },` | KEEP-FIELD | organization_id field; supply value via context |
| 34 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 41 | `data: { ...parsed.data, organization_id: orgId, created_by: userId, due_date: parsed.data.due_date ? new Date(` | KEEP-FIELD | organization_id field; supply value via context |
| 61 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |

### `app/api/release-workspace/discussions/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 14 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 17 | `where: { workspace_id: parseInt(workspaceId), organization_id: orgId, is_deleted: false },` | KEEP-FIELD | organization_id field; supply value via context |
| 32 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 40 | `data: { ...parsed.data, organization_id: orgId, created_by: userId },` | KEEP-FIELD | organization_id field; supply value via context |
| 48 | `data: { ...parsed.data, organization_id: orgId, user_id: userId },` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/release-workspace/marketing/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 15 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 18 | `where: { workspace_id: parseInt(workspaceId), organization_id: orgId, is_deleted: false },` | KEEP-FIELD | organization_id field; supply value via context |
| 33 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 41 | `data: { ...parsed.data, organization_id: orgId, created_by: userId, due_date: parsed.data.due_date ? new Date(` | KEEP-FIELD | organization_id field; supply value via context |
| 52 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 74 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |

### `app/api/release-workspace/milestones/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 14 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 16 | `where: { workspace_id: parseInt(workspaceId), organization_id: orgId, is_deleted: false },` | KEEP-FIELD | organization_id field; supply value via context |
| 30 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 37 | `data: { ...parsed.data, organization_id: orgId, created_by: userId, due_date: parsed.data.due_date ? new Date(` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/release-workspace/playbook/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 11 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 14 | `where: { organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 35 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 57 | `workspace_id: workspaceId, organization_id: orgId, name: task.title,` | KEEP-FIELD | organization_id field; supply value via context |
| 68 | `workspace_id: workspaceId, organization_id: orgId, name: milestone.name,` | KEEP-FIELD | organization_id field; supply value via context |
| 78 | `workspace_id: workspaceId, organization_id: orgId, name: deliverable.name,` | KEEP-FIELD | organization_id field; supply value via context |
| 88 | `workspace_id: workspaceId, organization_id: orgId, name: approval.name,` | KEEP-FIELD | organization_id field; supply value via context |
| 109 | `where: { organization_id: orgId, slug: parsed.data.slug },` | KEEP-FIELD | organization_id field; supply value via context |
| 114 | `data: { ...parsed.data, organization_id: orgId, created_by: userId },` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/release-workspace/publications/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 17 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 19 | `where: { workspace_id: parseInt(workspaceId), organization_id: orgId, is_deleted: false },` | KEEP-FIELD | organization_id field; supply value via context |
| 33 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 42 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 63 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |

### `app/api/release-workspace/readiness/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 13 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |

### `app/api/release-workspace/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 11 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 20 | `where: { release_id: parseInt(releaseId), organization_id: orgId, is_deleted: false },` | KEEP-FIELD | organization_id field; supply value via context |
| 66 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 79 | `where: { release_id: release.id, organization_id: orgId, is_deleted: false },` | KEEP-FIELD | organization_id field; supply value via context |
| 97 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 150 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 197 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/release-workspace/videos/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 15 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 17 | `where: { workspace_id: parseInt(workspaceId), organization_id: orgId, is_deleted: false },` | KEEP-FIELD | organization_id field; supply value via context |
| 31 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 40 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 61 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |

### `app/api/releases/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 12 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 68 | `where: { organization_id: orgId, is_deleted: false },` | KEEP-FIELD | organization_id field; supply value via context |
| 73 | `prisma.releases.count({ where: { organization_id: orgId, is_deleted: false } }),` | KEEP-FIELD | organization_id field; supply value via context |
| 142 | `organization_id: newRelease.organization_id,` | KEEP-FIELD | organization_id field; supply value via context |
| 159 | `workspace_id: workspace.id, organization_id: newRelease.organization_id,` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/reports/[runId]/data/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 13 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 17 | `where: { id: runId, organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/reports/[runId]/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 12 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 16 | `where: { id: runId, organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/reports/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 12 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 25 | `where: { organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 30 | `prisma.report_runs.count({ where: { organization_id: orgId } }),` | KEEP-FIELD | organization_id field; supply value via context |
| 45 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |

### `app/api/search/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 24 | `if (!user \|\| !user.organization_id) {` | KEEP-FIELD | organization_id field; supply value via context |
| 28 | `const orgId = user.organization_id;` | KEEP-FIELD | organization_id field; supply value via context |
| 48 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 60 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 84 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 96 | `organization_id: parseInt(orgId) \|\| 0, // In db contracts might use Int, handle safely` | KEEP-FIELD | organization_id field; supply value via context |
| 131 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 142 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/storage/[id]/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 27 | `const organizationId: string = user.organization_id;` | KEEP-FIELD | organization_id field; supply value via context |
| 38 | `if (attachment.organizationId !== organizationId) {` | KEEP-FIELD | organization_id field; supply value via context |
| 56 | `organizationId,` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/storage/download/[id]/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 26 | `const organizationId: string = user.organization_id;` | KEEP-FIELD | organization_id field; supply value via context |
| 37 | `if (attachment.organizationId !== organizationId) {` | KEEP-FIELD | organization_id field; supply value via context |
| 49 | `organizationId,` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/storage/upload/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 28 | `const organizationId: string = user.organization_id;` | KEEP-FIELD | organization_id field; supply value via context |
| 33 | `if (!organizationId) {` | KEEP-FIELD | organization_id field; supply value via context |
| 73 | `organizationId,` | KEEP-FIELD | organization_id field; supply value via context |
| 86 | `organizationId,` | KEEP-FIELD | organization_id field; supply value via context |
| 106 | `organizationId,` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/subscriptions/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 11 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 15 | `where: { organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 31 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 43 | `where: { organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 62 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 83 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 95 | `where: { organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/usage/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 13 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 20 | `const where: any = { organization_id: orgId, period };` | KEEP-FIELD | organization_id field; supply value via context |
| 44 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 55 | `where: { organization_id: orgId, metric, period },` | KEEP-FIELD | organization_id field; supply value via context |
| 70 | `data: { organization_id: orgId, metric, value, period, tokens_used: BigInt(tokens_used) },` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/users/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 24 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 28 | `where: { organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 38 | `select: { id: true, email: true, name: true, is_active: true, is_superuser: true, role: true, createdAt: true,` | KEEP-FIELD | organization_id field; supply value via context |
| 73 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 81 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/v1/catalog/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 14 | `const where = { organization_id: orgId };` | KEEP-FIELD | organization_id field; supply value via context |
| 20 | `const where = { organization_id: orgId };` | KEEP-FIELD | organization_id field; supply value via context |
| 31 | `const where = { organization_id: orgId };` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/v1/contracts/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 12 | `const filter: any = { organization_id: orgId };` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/v1/helpers.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 32 | `const orgId = result.key.organization_id;` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/works/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 23 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 27 | `where: { organization_id: orgId, is_deleted: false },` | KEEP-FIELD | organization_id field; supply value via context |
| 32 | `prisma.works.count({ where: { organization_id: orgId, is_deleted: false } }),` | KEEP-FIELD | organization_id field; supply value via context |
| 48 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 51 | `where: { title: body.title, organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 61 | `data: { ...body, organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/workspace/[id]/approvals/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 15 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 18 | `where: { workspace_id: workspaceId, organization_id: orgId, is_deleted: false },` | KEEP-FIELD | organization_id field; supply value via context |
| 34 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 42 | `data: { ...parsed.data, organization_id: orgId, requested_by: userId, due_date: parsed.data.due_date ? new Dat` | KEEP-FIELD | organization_id field; supply value via context |
| 64 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |

### `app/api/workspace/[id]/deliverables/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 15 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 18 | `where: { workspace_id: workspaceId, organization_id: orgId, is_deleted: false },` | KEEP-FIELD | organization_id field; supply value via context |
| 34 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 42 | `data: { ...parsed.data, organization_id: orgId, created_by: userId, due_date: parsed.data.due_date ? new Date(` | KEEP-FIELD | organization_id field; supply value via context |
| 63 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |

### `app/api/workspace/[id]/dependencies/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 13 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 16 | `where: { workspace_id: wpId, organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 20 | `where: { workspace_id: wpId, organization_id: orgId, is_deleted: false },` | KEEP-FIELD | organization_id field; supply value via context |
| 45 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 62 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |
| 93 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 106 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/workspace/[id]/discussions/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 33 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 43 | `data: { channel_id: parsed.data.channel_id, user_id: userId, organization_id: orgId, content: parsed.data.cont` | KEEP-FIELD | organization_id field; supply value via context |
| 52 | `data: { ...parsed.data, organization_id: orgId, created_by: userId },` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/workspace/[id]/fields/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 12 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 16 | `select: { template_id: true, organization_id: true },` | KEEP-FIELD | organization_id field; supply value via context |
| 18 | `if (!workspace \|\| workspace.organization_id !== orgId) {` | KEEP-FIELD | organization_id field; supply value via context |
| 30 | `where: { workspace_id: wpId, organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 62 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 67 | `select: { organization_id: true },` | KEEP-FIELD | organization_id field; supply value via context |
| 69 | `if (!workspace \|\| workspace.organization_id !== orgId) {` | KEEP-FIELD | organization_id field; supply value via context |
| 85 | `create: { workspace_id: wpId, organization_id: orgId, field_key: fieldKey, field_value: stringValue, updated_b` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/workspace/[id]/marketing/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 13 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 16 | `where: { workspace_id: workspaceId, organization_id: orgId, is_deleted: false },` | KEEP-FIELD | organization_id field; supply value via context |
| 33 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 41 | `data: { ...parsed.data, organization_id: orgId, created_by: userId },` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/workspace/[id]/milestones/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 13 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 16 | `where: { workspace_id: workspaceId, organization_id: orgId, is_deleted: false },` | KEEP-FIELD | organization_id field; supply value via context |
| 32 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 40 | `data: { ...parsed.data, organization_id: orgId, created_by: userId, due_date: parsed.data.due_date ? new Date(` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/workspace/[id]/playbook/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 11 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 14 | `where: { organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 28 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 37 | `const parsed = createPlaybookSchema.safeParse({ ...body, organization_id: orgId });` | KEEP-FIELD | organization_id field; supply value via context |
| 41 | `data: { ...parsed.data, organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/workspace/[id]/publications/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 13 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 16 | `where: { workspace_id: workspaceId, organization_id: orgId, is_deleted: false },` | KEEP-FIELD | organization_id field; supply value via context |
| 32 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 40 | `data: { ...parsed.data, organization_id: orgId, created_by: userId, scheduled_at: parsed.data.scheduled_at ? n` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/workspace/[id]/readiness/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 12 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |

### `app/api/workspace/[id]/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 13 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 51 | `if (workspace.organization_id !== orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });` | KEEP-FIELD | organization_id field; supply value via context |
| 66 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 71 | `if (existing.organization_id !== orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });` | KEEP-FIELD | organization_id field; supply value via context |
| 104 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 108 | `if (existing.organization_id !== orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/workspace/[id]/videos/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 14 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 17 | `where: { workspace_id: workspaceId, organization_id: orgId, is_deleted: false },` | KEEP-FIELD | organization_id field; supply value via context |
| 33 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 41 | `data: { ...parsed.data, organization_id: orgId, created_by: userId, due_date: parsed.data.due_date ? new Date(` | KEEP-FIELD | organization_id field; supply value via context |
| 62 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |

### `app/api/workspaces/[id]/files/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 12 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 17 | `if (!workspace \|\| workspace.organization_id !== orgId) {` | KEEP-FIELD | organization_id field; supply value via context |
| 45 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 52 | `if (!workspace \|\| workspace.organization_id !== orgId) {` | KEEP-FIELD | organization_id field; supply value via context |
| 86 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 95 | `if (!workspace \|\| workspace.organization_id !== orgId) {` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/workspaces/[id]/members/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 10 | `if (ws.organization_id !== orgId) return null;` | KEEP-FIELD | organization_id field; supply value via context |
| 19 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 44 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 85 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 119 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |

### `app/api/workspaces/[id]/notifications/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 11 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 16 | `if (!workspace \|\| workspace.organization_id !== orgId) {` | KEEP-FIELD | organization_id field; supply value via context |
| 38 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 46 | `if (!workspace \|\| workspace.organization_id !== orgId) {` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/workspaces/[id]/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 12 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 37 | `if (workspace.organization_id !== orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });` | KEEP-FIELD | organization_id field; supply value via context |
| 51 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 59 | `if (existing.organization_id !== orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });` | KEEP-FIELD | organization_id field; supply value via context |
| 93 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 99 | `if (existing.organization_id !== orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/workspaces/[id]/timeline/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 12 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 17 | `if (!workspace \|\| workspace.organization_id !== orgId) {` | KEEP-FIELD | organization_id field; supply value via context |
| 48 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 55 | `if (!workspace \|\| workspace.organization_id !== orgId) {` | KEEP-FIELD | organization_id field; supply value via context |

### `app/api/workspaces/route.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 12 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 31 | `if (workspace.organization_id !== orgId) return NextResponse.json({ error: "Forbidden" }, { status: 403 });` | KEEP-FIELD | organization_id field; supply value via context |
| 41 | `const where: any = { organization_id: orgId, is_deleted: false };` | KEEP-FIELD | organization_id field; supply value via context |
| 73 | `const orgId = (session.user as any).organization_id;` | MIGRATE-RESOLVER | Direct session organization_id read |
| 83 | `where: { organization_id: orgId, name: parsed.data.name, is_deleted: false },` | KEEP-FIELD | organization_id field; supply value via context |
| 92 | `organization_id: orgId,` | KEEP-FIELD | organization_id field; supply value via context |

### `app/providers.tsx`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 7 | `import { OrgProvider } from "@/contexts/OrgContext";` | DEFER | Matched keyword; review |

### `lib/ai-audit.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 20 | `return { organization_id: Number(orgId) \|\| orgId } as any;` | KEEP-FIELD | organization_id field; supply value via context |
| 287 | `organization_id: String(Number(orgId) \|\| orgId),` | KEEP-FIELD | organization_id field; supply value via context |

### `lib/api-keys.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 58 | `return key.organization_id;` | KEEP-FIELD | organization_id field; supply value via context |

### `lib/audit.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 10 | `organization_id?: string;` | KEEP-FIELD | organization_id field; supply value via context |
| 25 | `organization_id: entry.organization_id ? parseInt(entry.organization_id) \|\| null : null,` | KEEP-FIELD | organization_id field; supply value via context |
| 36 | `organization_id?: string;` | KEEP-FIELD | organization_id field; supply value via context |
| 44 | `if (params.organization_id) where.organization_id = parseInt(params.organization_id) \|\| params.organization_` | KEEP-FIELD | organization_id field; supply value via context |

### `lib/auth.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 36 | `select: { tenant_id: true },` | MIGRATE-TENANT | tenant_id field usage |
| 43 | `tenant_id: tenantUser?.tenant_id \|\| user.tenant_id,` | MIGRATE-TENANT | Session/user tenant_id as active org proxy |
| 44 | `organization_id: user.organization_id,` | KEEP-FIELD | organization_id field; supply value via context |
| 59 | `token.tenant_id = (user as any).tenant_id;` | MIGRATE-TENANT | Session/user tenant_id as active org proxy |
| 60 | `token.organization_id = (user as any).organization_id;` | KEEP-FIELD | organization_id field; supply value via context |
| 69 | `(session.user as any).tenant_id = token.tenant_id as string;` | MIGRATE-RESOLVER | Direct session cast org/tenant read |
| 70 | `(session.user as any).organization_id = token.organization_id as string;` | MIGRATE-RESOLVER | Direct session organization_id read |

### `lib/branding.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 21 | `export async function getOrgBranding(tenantId: string): Promise<BrandingConfig> {` | MIGRATE-TENANT | tenantId camelCase |
| 22 | `if (!tenantId) return DEFAULT_BRANDING;` | MIGRATE-TENANT | tenantId camelCase |
| 25 | `where: { id: tenantId },` | MIGRATE-TENANT | tenantId camelCase |

### `lib/export.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 142 | `where.organization_id = options.orgId;` | KEEP-FIELD | organization_id field; supply value via context |
| 144 | `where.organization_id = options.orgId;` | KEEP-FIELD | organization_id field; supply value via context |

### `lib/features.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 12 | `where: { organization_id: orgId },` | KEEP-FIELD | organization_id field; supply value via context |
| 27 | `? await prisma.usage.findFirst({ where: { organization_id: orgId, metric, period } })` | KEEP-FIELD | organization_id field; supply value via context |
| 46 | `where: { organization_id: orgId, metric, period },` | KEEP-FIELD | organization_id field; supply value via context |

### `lib/iam.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 9 | `organization_id: string;` | KEEP-FIELD | organization_id field; supply value via context |
| 111 | `return currentUser.organization_id === targetOrgId;` | KEEP-FIELD | organization_id field; supply value via context |
| 150 | `export async function isOrgOwner(userId: number, tenantId: string): Promise<boolean> {` | MIGRATE-TENANT | tenantId camelCase |
| 152 | `where: { id: tenantId },` | MIGRATE-TENANT | tenantId camelCase |

### `lib/import.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 172 | `const orgField = ["individuals", "organizations"].includes(entity) ? "organization_id" : "organization_id";` | KEEP-FIELD | organization_id field; supply value via context |

### `lib/org.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 1 | `export function getOrgIds(session: any): {` | MIGRATE-RESOLVER | Legacy helper → re-export from organization-context |
| 4 | `tenantId: string \| null;` | MIGRATE-TENANT | tenantId camelCase |
| 7 | `const uuidOrgId = user?.organization_id \|\| "00000000-0000-0000-0000-000000000001";` | MIGRATE-HARDCODE | Hardcoded legacy catalog scope UUID |
| 9 | `const tenantId = user?.tenant_id \|\| null;` | MIGRATE-TENANT | tenant_id field usage |
| 10 | `return { uuidOrgId, intOrgId, tenantId };` | MIGRATE-TENANT | tenantId camelCase |
| 13 | `export function getOrgFromSession(session: any): {` | MIGRATE-RESOLVER | Legacy helper → re-export from organization-context |
| 14 | `tenantId: string \| null;` | MIGRATE-TENANT | tenantId camelCase |
| 21 | `tenantId: user?.tenant_id \|\| null,` | MIGRATE-TENANT | tenant_id field usage |
| 22 | `orgId: user?.organization_id \|\| "00000000-0000-0000-0000-000000000001",` | MIGRATE-HARDCODE | Hardcoded legacy catalog scope UUID |
| 31 | `return user?.tenant_id === targetTenantId;` | MIGRATE-TENANT | tenant_id field usage |

### `lib/permissions.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 10 | `organization_id: string;` | KEEP-FIELD | organization_id field; supply value via context |
| 43 | `return currentUser.organization_id === targetOrgId;` | KEEP-FIELD | organization_id field; supply value via context |

### `lib/reports.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 4 | `return { organization_id: Number(orgId) \|\| orgId } as any;` | KEEP-FIELD | organization_id field; supply value via context |
| 290 | `organization_id: String(orgId),` | KEEP-FIELD | organization_id field; supply value via context |

### `lib/storage/activity.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 26 | `organizationId: string;` | KEEP-FIELD | organization_id field; supply value via context |
| 41 | `organizationId: params.organizationId,` | KEEP-FIELD | organization_id field; supply value via context |
| 55 | `organizationId: string;` | KEEP-FIELD | organization_id field; supply value via context |
| 66 | `organizationId,` | KEEP-FIELD | organization_id field; supply value via context |
| 81 | `organization_id: organizationId,` | KEEP-FIELD | organization_id field; supply value via context |
| 89 | `organizationId,` | KEEP-FIELD | organization_id field; supply value via context |

### `lib/storage/legacy.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 57 | `organizationId: DEFAULT_ORG_ID,` | KEEP-FIELD | organization_id field; supply value via context |

### `lib/storage/types.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 30 | `organizationId: string;` | KEEP-FIELD | organization_id field; supply value via context |
| 111 | `organizationId: string;` | KEEP-FIELD | organization_id field; supply value via context |

### `lib/storage/upload.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 23 | `*   organizations/{organizationId}/{folder}/{uuid}-{filename}` | KEEP-FIELD | organization_id field; supply value via context |
| 28 | `organizationId,` | KEEP-FIELD | organization_id field; supply value via context |
| 57 | `organizationId,` | KEEP-FIELD | organization_id field; supply value via context |
| 71 | `organizationId,` | KEEP-FIELD | organization_id field; supply value via context |

### `lib/storage/utils.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 8 | `* Format: `organizations/{organizationId}/{folder}/{uuid}-{filename}`` | KEEP-FIELD | organization_id field; supply value via context |
| 15 | `organizationId: string;` | KEEP-FIELD | organization_id field; supply value via context |
| 20 | `const { organizationId, folder, fileName, uuid } = params;` | KEEP-FIELD | organization_id field; supply value via context |
| 21 | `const id = uuid ?? uuidv4();` | MIGRATE-HARDCODE | Generates UUID; org creation must be explicit |
| 24 | `return [DEFAULT_KEY_PREFIX, organizationId, folder, segment].join("/");` | KEEP-FIELD | organization_id field; supply value via context |

### `lib/workspace-engine/notifications.ts`

| Line | Snippet | Classification | Purpose / Action |
|------|---------|----------------|------------------|
| 5 | `organization_id: string;` | KEEP-FIELD | organization_id field; supply value via context |
| 14 | `const { workspace_id, organization_id, user_ids, type, title, message, link } = input;` | KEEP-FIELD | organization_id field; supply value via context |
| 20 | `organization_id,` | KEEP-FIELD | organization_id field; supply value via context |
| 34 | `organization_id,` | KEEP-FIELD | organization_id field; supply value via context |
| 53 | `organizationId: string` | KEEP-FIELD | organization_id field; supply value via context |
| 58 | `organization_id: organizationId,` | KEEP-FIELD | organization_id field; supply value via context |
| 69 | `organizationId: string` | KEEP-FIELD | organization_id field; supply value via context |
| 74 | `organization_id: organizationId,` | KEEP-FIELD | organization_id field; supply value via context |
| 85 | `organizationId: string,` | KEEP-FIELD | organization_id field; supply value via context |
| 94 | `organization_id: organizationId,` | KEEP-FIELD | organization_id field; supply value via context |
| 105 | `organizationId: string,` | KEEP-FIELD | organization_id field; supply value via context |
| 111 | `organization_id: organizationId,` | KEEP-FIELD | organization_id field; supply value via context |
| 122 | `organizationId: string` | KEEP-FIELD | organization_id field; supply value via context |
| 127 | `organization_id: organizationId,` | KEEP-FIELD | organization_id field; supply value via context |
| 138 | `organizationId: string,` | KEEP-FIELD | organization_id field; supply value via context |
| 145 | `organization_id: organizationId,` | KEEP-FIELD | organization_id field; supply value via context |

## Migration priority

### P0 — Auth & context (do first)

- `lib/auth.ts`, `lib/org.ts`, `lib/iam.ts`, `lib/permissions.ts`
- `app/api/auth/register/route.ts`, `app/api/organizations/switch/route.ts`
- `app/api/organizations/route.ts`, `app/api/organizations/current/route.ts`
- `app/api/invitations/**`

### P1 — Catalog list APIs (empty UI bug)

- `app/api/artists/route.ts`, `app/api/releases/route.ts`
- `app/api/tracks/route.ts`, `app/api/works/route.ts`
- `app/api/labels/route.ts`, `app/api/publishers/route.ts`
- `app/api/v1/catalog/route.ts`

### P2 — Remaining org-scoped modules

- Contracts, individuals, workspaces, office, AI, reports, royalties, network

### Global entities (no `organization_id` column)

| Entity | Prisma model | Isolation |
|--------|--------------|----------|
| Tracks | `tracks` | None today; scope via release/work (DEFERRED schema) |
| Labels | `labels` | Global catalog entity (DEFERRED) |
| Publishers | `publishers` | Global catalog entity (DEFERRED) |
