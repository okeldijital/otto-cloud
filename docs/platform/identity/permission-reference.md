# Permission Reference & Role Matrix (v1.0)

Catalog version: `PERMISSION_CATALOG_VERSION` (SDK).

## Roles (default system templates)

| Role key | Name | Level |
|----------|------|-------|
| `owner` | Owner | All permissions |
| `administrator` / `org_admin` | Administrator | Admin suite |
| `manager` | Manager | Manage domain ops |
| `editor` | Editor | Create/edit |
| `reviewer` | Reviewer | Review + view |
| `contributor` | Contributor | Limited edit |
| `member` | Member | Same as editor (compat) |
| `viewer` | Viewer | Read-only |

## Matrix (summary)

| Module | Permission | Description | Default roles |
|--------|------------|-------------|---------------|
| Contracts | `contracts.view` | View contracts | Viewer+ |
| Contracts | `contracts.create` | Create | Contributor+ |
| Contracts | `contracts.edit` | Edit | Editor+ |
| Contracts | `contracts.review` | Review | Reviewer+ |
| Contracts | `contracts.promote` | Promote | Manager+ |
| Contracts | `contracts.delete` | Delete | Manager+ |
| Contracts | `contracts.manage` | Full manage | Manager+ |
| Rights | `rights.view` | View | Viewer+ |
| Rights | `rights.create/edit` | Mutate | Contributor+/Editor+ |
| Rights | `rights.review` | Review | Reviewer+ |
| Rights | `rights.promote/delete/manage` | Manage | Manager+ |
| Royalties | `royalties.view` | View | Viewer+ |
| Royalties | `royalties.review` | Review | Reviewer+ |
| Royalties | `royalties.manage/export` | Manage | Manager+ |
| Workspace | `workspace.view` | View | Viewer+ |
| Workspace | `workspace.edit` | Edit | Contributor+ |
| Workspace | `workspace.manage/approve` | Manage | Manager+ |
| Documents | `documents.view` | View | Viewer+ |
| Documents | `documents.upload/download` | Mutate | Contributor+ |
| Documents | `documents.delete` | Delete | Manager+ |
| AI | `ai.chat/generate/analyze` | Use AI | Contributor+/Reviewer |
| AI | `ai.admin` | AI settings | Administrator+ |
| Platform | `events.view` / `platform.events.view` | View events | Viewer+ |
| Platform | `events.replay` | Replay | Administrator+ |
| Platform | `notifications.manage` | Notifications | Administrator+ |
| Platform | `audit.view` | Audit | Administrator+ |
| Platform | `platform.admin` | Platform admin | Owner / platform |
| Identity | `users.manage/invite` | Users | Administrator+ |
| Identity | `organizations.manage` | Orgs | Administrator+ |
| Identity | `roles.manage` / `permissions.manage` | RBAC | Administrator+ |
| Identity | `security.manage` | Security | Administrator+ |

Full keys: `PERMISSION_CATALOG` via SDK.
