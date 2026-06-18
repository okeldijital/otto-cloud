# 02 — API Surface

## Architecture

The API is implemented as **RESTful Next.js Route Handlers** at `app/api/`.

### Base URL

```
https://otto.cloud/api
```

### Authentication

Two auth modes:

| Mode     | Mechanism                                  | Header                |
|----------|--------------------------------------------|-----------------------|
| Session  | NextAuth JWT cookie                        | `Cookie: <session>`   |
| API Key  | `api_keys` table with scope validation     | `X-API-Key: <key>`    |

All endpoints require either a valid session or API key. Public API (v1) uses
API key auth exclusively.

### Standard Response Envelope

```json
{
  "data": { ... },
  "error": null,
  "meta": {
    "total": 100,
    "limit": 20,
    "offset": 0
  }
}
```

Error responses:

```json
{
  "data": null,
  "error": {
    "code": "FORBIDDEN",
    "message": "Missing permission: artists.delete"
  },
  "meta": null
}
```

### Standard HTTP Statuses

| Code | Meaning                          |
|------|----------------------------------|
| 200  | Success                          |
| 201  | Created                          |
| 400  | Bad request / validation error   |
| 401  | Unauthenticated                  |
| 403  | Forbidden (missing permission)   |
| 404  | Not found                        |
| 409  | Conflict (duplicate, constraint) |
| 422  | Unprocessable entity             |
| 429  | Rate limited                     |
| 500  | Internal error                   |

### Pagination

All list endpoints accept:

```
?limit=20&offset=0
```

Default `limit=50`, max `limit=100`.

### Permission Enforcement

Endpoints call `requirePermission("module.action")` at the handler level.
Superusers bypass all permission checks.

---

## Endpoint Catalog

### Foundation — Auth

| Method | Path                   | Auth     | Permission        | Status |
|--------|------------------------|----------|-------------------|--------|
| POST   | /api/auth/login        | None     | —                 | ✅     |
| POST   | /api/auth/register     | None     | —                 | ✅     |
| GET    | /api/auth/me           | Session  | —                 | ✅     |
| POST   | /api/auth/logout       | Session  | —                 | ✅     |

### Foundation — Organization

| Method | Path                                  | Auth     | Permission             | Status |
|--------|---------------------------------------|----------|------------------------|--------|
| GET    | /api/organizations/[id]               | Session  | organization.view      | ✅     |
| PUT    | /api/organizations/[id]               | Session  | organization.edit      | ✅     |
| DELETE | /api/organizations/[id]               | Session  | organization.delete    | ✅     |
| GET    | /api/organizations/[id]/branding      | Session  | branding.manage        | ✅     |
| PUT    | /api/organizations/[id]/branding      | Session  | branding.manage        | ✅     |
| POST   | /api/organizations/transfer           | Session  | organization.transfer  | ✅     |

### Foundation — IAM

| Method | Path                          | Auth     | Permission           | Status |
|--------|-------------------------------|----------|----------------------|--------|
| GET    | /api/iam/users                | Session  | users.view           | ✅     |
| POST   | /api/iam/users                | Session  | users.invite         | ✅     |
| GET    | /api/iam/users/[id]           | Session  | users.view           | ✅     |
| PUT    | /api/iam/users/[id]           | Session  | users.edit           | ✅     |
| DELETE | /api/iam/users/[id]           | Session  | users.delete         | ✅     |
| POST   | /api/iam/users/[id]/suspend   | Session  | users.suspend        | ✅     |
| GET    | /api/iam/roles                | Session  | roles.view           | ✅     |
| POST   | /api/iam/roles                | Session  | roles.manage         | ✅     |
| PUT    | /api/iam/roles/[id]           | Session  | roles.manage         | ✅     |
| DELETE | /api/iam/roles/[id]           | Session  | roles.manage         | ✅     |
| GET    | /api/iam/permissions          | Session  | permissions.view     | ✅     |
| GET    | /api/iam/teams                | Session  | teams.view           | ✅     |
| POST   | /api/iam/teams                | Session  | teams.manage         | ✅     |
| PUT    | /api/iam/teams/[id]           | Session  | teams.manage         | ✅     |
| DELETE | /api/iam/teams/[id]           | Session  | teams.manage         | ✅     |

### Foundation — Billing

| Method | Path                          | Auth     | Permission      | Status |
|--------|-------------------------------|----------|-----------------|--------|
| GET    | /api/billing/plans            | Session  | billing.view    | ✅     |
| GET    | /api/billing/subscription     | Session  | billing.view    | ✅     |
| POST   | /api/billing/subscription     | Session  | billing.manage  | ✅     |
| PUT    | /api/billing/subscription     | Session  | billing.manage  | ✅     |

### Foundation — AI

| Method | Path                                            | Auth     | Permission | Status |
|--------|-------------------------------------------------|----------|------------|--------|
| POST   | /api/ai/chat                                    | Session  | ai.use     | ✅     |
| GET    | /api/ai/sessions                                | Session  | ai.view    | ✅     |
| GET    | /api/ai/sessions/[id]                           | Session  | ai.view    | ✅     |
| POST   | /api/ai/contract/draft                          | Session  | ai.use     | ✅     |
| POST   | /api/ai/contract/attach                         | Session  | ai.use     | ✅     |
| POST   | /api/ai/contract/resolve                        | Session  | ai.use     | ✅     |
| POST   | /api/ai/release/integrate                       | Session  | ai.use     | ✅     |
| POST   | /api/ai/royalty/simulate                        | Session  | ai.use     | ✅     |
| POST   | /api/ai/core/write                              | Session  | ai.use     | ✅     |
| POST   | /api/ai/core/write/[id]/apply                   | Session  | ai.use     | ✅     |
| GET    | /api/ai/audit                                   | Session  | ai.manage  | ✅     |

### Module — Music Catalog

| Method | Path                         | Auth     | Permission       | Status |
|--------|------------------------------|----------|------------------|--------|
| GET    | /api/artists                 | Session  | artists.view     | ✅     |
| POST   | /api/artists                 | Session  | artists.create   | ✅     |
| GET    | /api/artists/[id]            | Session  | artists.view     | ✅     |
| PUT    | /api/artists/[id]            | Session  | artists.edit     | ✅     |
| DELETE | /api/artists/[id]            | Session  | artists.delete   | ✅     |
| GET    | /api/tracks                  | Session  | songs.view       | ✅     |
| POST   | /api/tracks                  | Session  | songs.create     | ✅     |
| GET    | /api/tracks/[id]             | Session  | songs.view       | ✅     |
| PUT    | /api/tracks/[id]             | Session  | songs.edit       | ✅     |
| DELETE | /api/tracks/[id]             | Session  | songs.delete     | ✅     |
| GET    | /api/releases                | Session  | releases.view    | ✅     |
| POST   | /api/releases                | Session  | releases.create  | ✅     |
| GET    | /api/releases/[id]           | Session  | releases.view    | ✅     |
| PUT    | /api/releases/[id]           | Session  | releases.edit    | ✅     |
| DELETE | /api/releases/[id]           | Session  | releases.delete  | ✅     |
| GET    | /api/works                   | Session  | works.view       | ✅     |
| POST   | /api/works                   | Session  | works.create     | ✅     |
| GET    | /api/works/[id]              | Session  | works.view       | ✅     |
| PUT    | /api/works/[id]              | Session  | works.edit       | ✅     |
| DELETE | /api/works/[id]              | Session  | works.delete     | ✅     |

### Module — Contracts

| Method | Path                                   | Auth     | Permission        | Status |
|--------|----------------------------------------|----------|-------------------|--------|
| GET    | /api/contracts                         | Session  | contracts.view    | ✅     |
| POST   | /api/contracts                         | Session  | contracts.create  | ✅     |
| GET    | /api/contracts/[id]                    | Session  | contracts.view    | ✅     |
| PUT    | /api/contracts/[id]                    | Session  | contracts.edit    | ✅     |
| DELETE | /api/contracts/[id]                    | Session  | contracts.delete  | ✅     |
| POST   | /api/contracts/[id]/sign               | Session  | contracts.sign    | ✅     |
| GET    | /api/contracts/[id]/parties            | Session  | contracts.view    | ✅     |
| POST   | /api/contracts/[id]/parties            | Session  | contracts.edit    | ✅     |
| DELETE | /api/contracts/[id]/parties/[pid]      | Session  | contracts.edit    | ✅     |
| GET    | /api/contracts/[id]/documents          | Session  | contracts.view    | ✅     |
| POST   | /api/contracts/[id]/documents          | Session  | contracts.edit    | ✅     |
| GET    | /api/contracts/[id]/splits             | Session  | contracts.view    | ✅     |
| POST   | /api/contracts/[id]/splits             | Session  | contracts.edit    | ✅     |
| GET    | /api/contracts/[id]/tracks             | Session  | contracts.view    | ✅     |
| POST   | /api/contracts/[id]/tracks             | Session  | contracts.edit    | ✅     |

### Module — Royalties

| Method | Path                          | Auth     | Permission       | Status |
|--------|-------------------------------|----------|------------------|--------|
| GET    | /api/royalties                | Session  | royalties.view   | ✅     |
| POST   | /api/royalties                | Session  | royalties.edit   | ✅     |
| GET    | /api/royalties/[id]           | Session  | royalties.view   | ✅     |
| PUT    | /api/royalties/[id]           | Session  | royalties.edit   | ✅     |

### Module — CRM (Network)

| Method | Path                                  | Auth     | Permission     | Status |
|--------|---------------------------------------|----------|----------------|--------|
| GET    | /api/network/individuals              | Session  | network.view   | ✅     |
| POST   | /api/network/individuals              | Session  | network.create | ✅     |
| GET    | /api/network/individuals/[id]         | Session  | network.view   | ✅     |
| PUT    | /api/network/individuals/[id]         | Session  | network.edit   | ✅     |
| DELETE | /api/network/individuals/[id]         | Session  | network.delete | ✅     |
| GET    | /api/network/organizations            | Session  | network.view   | ✅     |
| POST   | /api/network/organizations            | Session  | network.create | ✅     |
| GET    | /api/network/organizations/[id]       | Session  | network.view   | ✅     |
| PUT    | /api/network/organizations/[id]       | Session  | network.edit   | ✅     |
| DELETE | /api/network/organizations/[id]       | Session  | network.delete | ✅     |
| GET    | /api/network/relationships            | Session  | network.view   | ✅     |

### Module — Project Management (Office)

| Method | Path                             | Auth     | Permission   | Status |
|--------|----------------------------------|----------|--------------|--------|
| GET    | /api/office/tasks                | Session  | tasks.view   | ✅     |
| POST   | /api/office/tasks                | Session  | tasks.create | ✅     |
| GET    | /api/office/tasks/[id]           | Session  | tasks.view   | ✅     |
| PUT    | /api/office/tasks/[id]           | Session  | tasks.edit   | ✅     |
| DELETE | /api/office/tasks/[id]           | Session  | tasks.edit   | ✅     |
| GET    | /api/office/notes                | Session  | office.view  | ✅     |
| POST   | /api/office/notes                | Session  | office.create| ✅     |
| GET    | /api/office/notes/[id]           | Session  | office.view  | ✅     |
| PUT    | /api/office/notes/[id]           | Session  | office.edit  | ✅     |
| DELETE | /api/office/notes/[id]           | Session  | office.delete| ✅     |
| GET    | /api/office/events               | Session  | office.view  | ✅     |
| POST   | /api/office/events               | Session  | office.create| ✅     |
| GET    | /api/office/events/[id]          | Session  | office.view  | ✅     |
| PUT    | /api/office/events/[id]          | Session  | office.edit  | ✅     |
| DELETE | /api/office/events/[id]          | Session  | office.delete| ✅     |
| GET    | /api/office/documents            | Session  | office.view  | ✅     |
| POST   | /api/office/documents            | Session  | office.create| ✅     |
| GET    | /api/office/documents/[id]       | Session  | office.view  | ✅     |
| PUT    | /api/office/documents/[id]       | Session  | office.edit  | ✅     |
| DELETE | /api/office/documents/[id]       | Session  | office.delete| ✅     |

### Module — Workspaces

| Method | Path                                         | Auth     | Permission  | Status |
|--------|----------------------------------------------|----------|-------------|--------|
| GET    | /api/workspaces                              | Session  | —           | ✅     |
| POST   | /api/workspaces                              | Session  | —           | ✅     |
| GET    | /api/workspaces/[id]                         | Session  | —           | ✅     |
| PUT    | /api/workspaces/[id]                         | Session  | —           | ✅     |
| DELETE | /api/workspaces/[id]                         | Session  | —           | ✅     |
| GET    | /api/workspaces/[id]/members                 | Session  | —           | ✅     |
| POST   | /api/workspaces/[id]/members                 | Session  | —           | ✅     |
| DELETE | /api/workspaces/[id]/members/[mid]           | Session  | —           | ✅     |
| GET    | /api/workspaces/[id]/timeline                | Session  | —           | ✅     |
| POST   | /api/workspaces/[id]/timeline                | Session  | —           | ✅     |
| GET    | /api/workspaces/[id]/files                   | Session  | —           | ✅     |
| POST   | /api/workspaces/[id]/files                   | Session  | —           | ✅     |
| GET    | /api/workspaces/[id]/notifications           | Session  | —           | ✅     |
| POST   | /api/workspaces/[id]/notifications/read      | Session  | —           | ✅     |
| GET    | /api/workspaces/templates                    | Session  | —           | ✅     |

### Module — Search

| Method | Path                        | Auth     | Permission | Status |
|--------|-----------------------------|----------|------------|--------|
| GET    | /api/search?q=              | Session  | —          | ✅     |

Global search across artists, tracks, releases, contracts, workspaces, individuals,
organizations, tasks, notes, and events.

### Module — System

| Method | Path                          | Auth     | Permission       | Status |
|--------|-------------------------------|----------|------------------|--------|
| GET    | /api/admin/audit-log          | Session  | audit.view       | ✅     |
| GET    | /api/admin/backup             | Session  | system.backup    | ✅     |
| POST   | /api/admin/backup             | Session  | system.backup    | ✅     |
| POST   | /api/admin/backup/restore     | Session  | system.backup    | ✅     |
| GET    | /api/admin/status-quo         | Session  | system.monitor   | ✅     |
| POST   | /api/admin/status-quo/resolve | Session  | system.monitor   | ✅     |
| GET    | /api/admin/usage              | Session  | system.monitor   | ✅     |

### Public API (v1)

| Method | Path                      | Auth     | Scope             | Status |
|--------|---------------------------|----------|-------------------|--------|
| GET    | /api/v1                   | API Key  | —                 | ✅     |
| GET    | /api/v1/catalog           | API Key  | catalog:read      | ✅     |
| GET    | /api/v1/royalties         | API Key  | royalties:read    | ✅     |
| GET    | /api/v1/contracts         | API Key  | contracts:read    | ✅     |
| GET    | /api/v1/reports           | API Key  | reports:read      | ✅     |

### Module — Reports

| Method | Path                          | Auth     | Permission       | Status |
|--------|-------------------------------|----------|------------------|--------|
| GET    | /api/reports                  | Session  | reports.view     | ✅     |
| POST   | /api/reports                  | Session  | reports.create   | ✅     |
| GET    | /api/reports/[id]             | Session  | reports.view     | ✅     |
| POST   | /api/reports/[id]/run         | Session  | reports.create   | ✅     |
| GET    | /api/reports/runs/[id]        | Session  | reports.view     | ✅     |
| GET    | /api/export                   | Session  | reports.export   | ✅     |
| POST   | /api/import                   | Session  | reports.create   | ✅     |

---

## Endpoint Gaps (Not Yet Implemented)

### Music Module — Missing

| Method | Path                              | Permission     |
|--------|-----------------------------------|----------------|
| POST   | /api/tracks/[id]/link-contract    | songs.edit     |
| POST   | /api/releases/[id]/publish        | releases.publish|
| GET    | /api/releases/[id]/readiness      | releases.view  |
| POST   | /api/works/[id]/register          | works.edit     |
| GET    | /api/catalog/labels               | catalog.view   |
| GET    | /api/catalog/publishers           | catalog.view   |
| GET    | /api/catalog/pros                 | catalog.view   |
| GET    | /api/catalog/platforms            | catalog.view   |

### Production Module — Missing (Entire Module)

| Method | Path                                      | Permission          |
|--------|-------------------------------------------|---------------------|
| GET    | /api/production/sessions                  | production.view     |
| POST   | /api/production/sessions                  | production.create   |
| PUT    | /api/production/sessions/[id]             | production.edit     |
| GET    | /api/production/sessions/[id]/assets      | production.view     |
| POST   | /api/production/sessions/[id]/assets      | production.edit     |
| GET    | /api/production/versions                  | production.view     |
| POST   | /api/production/versions                  | production.create   |
| GET    | /api/production/versions/[id]             | production.view     |
| POST   | /api/production/versions/[id]/mix-review  | production.edit     |
| POST   | /api/production/versions/[id]/master-review| production.edit    |
| GET    | /api/production/studios                   | production.view     |
| POST   | /api/production/studios                   | production.create   |
| POST   | /api/production/studios/[id]/book         | production.edit     |

### Marketing Module — Missing (Entire Module)

| Method | Path                                      | Permission          |
|--------|-------------------------------------------|---------------------|
| GET    | /api/marketing/campaigns                  | marketing.view      |
| POST   | /api/marketing/campaigns                  | marketing.create    |
| PUT    | /api/marketing/campaigns/[id]             | marketing.edit      |
| DELETE | /api/marketing/campaigns/[id]             | marketing.delete    |
| GET    | /api/marketing/campaigns/[id]/calendar    | marketing.view      |
| POST   | /api/marketing/campaigns/[id]/calendar    | marketing.edit      |
| GET    | /api/marketing/campaigns/[id]/assets      | marketing.view      |
| POST   | /api/marketing/campaigns/[id]/assets      | marketing.edit      |
| GET    | /api/marketing/campaigns/[id]/analytics   | marketing.view      |
| GET    | /api/marketing/press                      | marketing.view      |
| POST   | /api/marketing/press                      | marketing.create    |

### Business Module — Missing (Partial)

| Method | Path                                      | Permission          |
|--------|-------------------------------------------|---------------------|
| GET    | /api/finance/invoices                     | finance.view        |
| POST   | /api/finance/invoices                     | finance.manage      |
| PUT    | /api/finance/invoices/[id]                | finance.manage      |
| GET    | /api/finance/budgets                      | finance.view        |
| POST   | /api/finance/budgets                      | finance.manage      |
| PUT    | /api/finance/budgets/[id]                 | finance.manage      |
| GET    | /api/finance/expenses                     | finance.view        |
| POST   | /api/finance/expenses                     | finance.manage      |
| GET    | /api/finance/accounting                   | finance.view        |

### CRM Module — Missing

| Method | Path                                      | Permission          |
|--------|-------------------------------------------|---------------------|
| GET    | /api/network/playlists                    | network.view        |
| POST   | /api/network/playlists                    | network.create      |
| PUT    | /api/network/playlists/[id]               | network.edit        |
| GET    | /api/network/platforms                    | network.view        |
| POST   | /api/network/platforms                    | network.create      |

### Cross-Module — Missing

| Method | Path                                      | Permission          |
|--------|-------------------------------------------|---------------------|
| GET    | /api/notifications                        | —                   |
| POST   | /api/notifications/[id]/read              | —                   |
| GET    | /api/activity                            | —                   |
| GET    | /api/objects/[type]/[id]/timeline         | —                   |
| GET    | /api/objects/[type]/[id]/links            | —                   |
| POST   | /api/objects/[type]/[id]/links            | —                   |
| GET    | /api/objects/[type]/[id]/tasks            | tasks.view          |
| POST   | /api/objects/[type]/[id]/tasks            | tasks.create        |
| GET    | /api/objects/[type]/[id]/notes            | office.view         |
| POST   | /api/objects/[type]/[id]/notes            | office.create       |
| GET    | /api/objects/[type]/[id]/events           | office.view         |
| POST   | /api/objects/[type]/[id]/events           | office.create       |
| GET    | /api/objects/[type]/[id]/documents        | office.view         |
| POST   | /api/objects/[type]/[id]/documents        | office.create       |

The `/api/objects/` prefix is the polymorphic access pattern for Principle 3
(Everything Can Be Linked). Any `entity_type`/`entity_id` pair can have tasks,
notes, events, documents, and timeline queries.

---

## API Convention Summary

### CRUD Pattern

```
GET    /api/<resource>          # List (paginated, filterable)
POST   /api/<resource>          # Create
GET    /api/<resource>/[id]     # Read
PUT    /api/<resource>/[id]     # Update (full replace)
PATCH  /api/<resource>/[id]     # Partial update (future)
DELETE /api/<resource>/[id]     # Soft delete
```

### Nested Resources

```
GET  /api/<resource>/[id]/<child>       # List children
POST /api/<resource>/[id]/<child>       # Create child
GET  /api/<resource>/[id]/<child>/[cid] # Read child
PUT  /api/<resource>/[id]/<child>/[cid] # Update child
```

### Filtering

List endpoints support query parameter filtering:

```
?status=active
?type=solo
?artist_id=42
?q=search+term        # text search
```

### Sorting

```
?sort=name            # ascending (default)
?sort=-created_at     # descending (prefix with -)
```

### Soft Delete Convention

`DELETE` sets `is_deleted = true` and returns `204 No Content`.
Subsequent `GET` requests exclude deleted records unless `?include_deleted=true`.
