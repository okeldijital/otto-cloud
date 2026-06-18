# 03 — Permission Matrix

## Permission Code Convention

```
<module>.<action>
```

### Actions

| Action | Meaning     |
|--------|-------------|
| view   | Read access  |
| create | Create       |
| edit   | Update       |
| delete | Soft delete  |
| manage | Admin access (varies by context) |
| sign   | Execute/sign |
| publish| Release to public |
| assign | Assign to users |
| export | Export data |
| invite | Invite users |

### Wildcard

```
<module>.*    — All actions within a module
```

### Superuser Bypass

Users with `is_superuser = true` bypass all permission checks.

---

## Role Definitions

| # | Role                  | Archetype                          |
|---|-----------------------|------------------------------------|
| 1 | Super Administrator   | Full platform control              |
| 2 | Label Owner           | Full operational control           |
| 3 | Executive             | Strategic oversight                |
| 4 | A&R                   | Artist and repertoire management   |
| 5 | Producer              | Recording projects                 |
| 6 | Artist                | Self-service view-only             |
| 7 | Marketing             | Campaigns and promotion            |
| 8 | PR                    | Media and press                    |
| 9 | Graphic Designer      | Artwork and creative assets        |
|10 | Finance               | Royalties and accounting           |
|11 | Administration        | Daily operations                   |
|12 | Guest                 | Read-only                          |

---

## Permission Matrix Per Module

### Foundation — Organization

| Permission             | SuperAdmin | LabelOwner | Exec | A&R | Prod | Artist | Mktg | PR | Designer | Finance | Admin | Guest |
|------------------------|:---------:|:----------:|:----:|:---:|:----:|:------:|:----:|:--:|:--------:|:-------:|:-----:|:-----:|
| organization.view      | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — | ✅ | ✅ | — |
| organization.edit      | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |
| organization.delete    | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |
| organization.transfer  | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |

### Foundation — Users & Teams

| Permission             | SuperAdmin | LabelOwner | Exec | A&R | Prod | Artist | Mktg | PR | Designer | Finance | Admin | Guest |
|------------------------|:---------:|:----------:|:----:|:---:|:----:|:------:|:----:|:--:|:--------:|:-------:|:-----:|:-----:|
| users.view             | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — | — | ✅ | — |
| users.invite           | ✅ | ✅ | ✅ | — | — | — | — | — | — | — | ✅ | — |
| users.edit             | ✅ | ✅ | — | — | — | — | — | — | — | — | ✅ | — |
| users.suspend          | ✅ | ✅ | — | — | — | — | — | — | — | — | ✅ | — |
| users.delete           | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |
| users.manage           | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |
| roles.view             | ✅ | ✅ | — | — | — | — | — | — | — | — | ✅ | — |
| roles.manage           | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |
| teams.view             | ✅ | ✅ | — | — | — | — | — | — | — | — | ✅ | — |
| teams.manage           | ✅ | ✅ | — | — | — | — | — | — | — | — | ✅ | — |
| permissions.view       | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |
| team.invite            | ✅ | ✅ | ✅ | — | — | — | — | — | — | — | ✅ | — |
| team.remove            | ✅ | ✅ | — | — | — | — | — | — | — | — | ✅ | — |

### Foundation — Billing

| Permission             | SuperAdmin | LabelOwner | Exec | A&R | Prod | Artist | Mktg | PR | Designer | Finance | Admin | Guest |
|------------------------|:---------:|:----------:|:----:|:---:|:----:|:------:|:----:|:--:|:--------:|:-------:|:-----:|:-----:|
| billing.view           | ✅ | ✅ | ✅ | — | — | — | — | — | — | ✅ | — | — |
| billing.manage         | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |

### Foundation — Settings

| Permission             | SuperAdmin | LabelOwner | Exec | A&R | Prod | Artist | Mktg | PR | Designer | Finance | Admin | Guest |
|------------------------|:---------:|:----------:|:----:|:---:|:----:|:------:|:----:|:--:|:--------:|:-------:|:-----:|:-----:|
| settings.view          | ✅ | ✅ | — | — | — | — | — | — | — | — | ✅ | — |
| settings.edit          | ✅ | ✅ | — | — | — | — | — | — | — | — | ✅ | — |
| api_keys.manage        | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |
| branding.manage        | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |

### Foundation — System

| Permission             | SuperAdmin | LabelOwner | Exec | A&R | Prod | Artist | Mktg | PR | Designer | Finance | Admin | Guest |
|------------------------|:---------:|:----------:|:----:|:---:|:----:|:------:|:----:|:--:|:--------:|:-------:|:-----:|:-----:|
| system.backup          | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |
| system.monitor         | ✅ | ✅ | ✅ | — | — | — | — | — | — | — | — | — |
| audit.view             | ✅ | ✅ | ✅ | — | — | — | — | — | — | — | ✅ | — |
| admin.access           | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |

### Foundation — AI

| Permission             | SuperAdmin | LabelOwner | Exec | A&R | Prod | Artist | Mktg | PR | Designer | Finance | Admin | Guest |
|------------------------|:---------:|:----------:|:----:|:---:|:----:|:------:|:----:|:--:|:--------:|:-------:|:-----:|:-----:|
| ai.view                | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ | — |
| ai.use                 | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | — | — |
| ai.manage              | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |

### Module — Music

| Permission             | SuperAdmin | LabelOwner | Exec | A&R | Prod | Artist | Mktg | PR | Designer | Finance | Admin | Guest |
|------------------------|:---------:|:----------:|:----:|:---:|:----:|:------:|:----:|:--:|:--------:|:-------:|:-----:|:-----:|
| artists.view           | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| artists.create         | ✅ | ✅ | — | ✅ | — | — | — | — | — | — | — | — |
| artists.edit           | ✅ | ✅ | — | ✅ | — | — | — | — | — | — | — | — |
| artists.delete         | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |
| songs.view             | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| songs.create           | ✅ | ✅ | — | ✅ | ✅ | — | — | — | — | — | — | — |
| songs.edit             | ✅ | ✅ | — | ✅ | ✅ | — | — | — | — | — | — | — |
| songs.delete           | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |
| releases.view          | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| releases.create        | ✅ | ✅ | — | ✅ | ✅ | — | — | — | — | — | — | — |
| releases.edit          | ✅ | ✅ | — | ✅ | ✅ | — | ✅ | — | — | — | — | — |
| releases.delete        | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |
| releases.publish       | ✅ | ✅ | — | — | — | — | ✅ | — | — | — | — | — |
| works.view             | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ | ✅ |
| works.create           | ✅ | ✅ | — | ✅ | — | — | — | — | — | — | — | — |
| works.edit             | ✅ | ✅ | — | ✅ | — | — | — | — | — | — | — | — |
| works.delete           | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |

### Module — Contracts

| Permission             | SuperAdmin | LabelOwner | Exec | A&R | Prod | Artist | Mktg | PR | Designer | Finance | Admin | Guest |
|------------------------|:---------:|:----------:|:----:|:---:|:----:|:------:|:----:|:--:|:--------:|:-------:|:-----:|:-----:|
| contracts.view         | ✅ | ✅ | ✅ | ✅ | — | ✅ | — | — | — | ✅ | ✅ | ✅ |
| contracts.create       | ✅ | ✅ | — | ✅ | — | — | — | — | — | — | — | — |
| contracts.edit         | ✅ | ✅ | — | ✅ | — | — | — | — | — | — | — | — |
| contracts.delete       | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |
| contracts.sign         | ✅ | ✅ | — | — | — | — | — | — | — | ✅ | — | — |

### Module — Royalties & Finance

| Permission             | SuperAdmin | LabelOwner | Exec | A&R | Prod | Artist | Mktg | PR | Designer | Finance | Admin | Guest |
|------------------------|:---------:|:----------:|:----:|:---:|:----:|:------:|:----:|:--:|:--------:|:-------:|:-----:|:-----:|
| royalties.view         | ✅ | ✅ | ✅ | — | — | ✅ | — | — | — | ✅ | ✅ | — |
| royalties.edit         | ✅ | ✅ | — | — | — | — | — | — | — | ✅ | — | — |
| finance.view           | ✅ | ✅ | ✅ | — | — | — | — | — | — | ✅ | — | — |
| finance.manage         | ✅ | ✅ | — | — | — | — | — | — | — | ✅ | — | — |

### Module — CRM (Network)

| Permission             | SuperAdmin | LabelOwner | Exec | A&R | Prod | Artist | Mktg | PR | Designer | Finance | Admin | Guest |
|------------------------|:---------:|:----------:|:----:|:---:|:----:|:------:|:----:|:--:|:--------:|:-------:|:-----:|:-----:|
| network.view           | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | — | — | ✅ | ✅ |
| network.create         | ✅ | ✅ | — | ✅ | — | — | ✅ | ✅ | — | — | ✅ | — |
| network.edit           | ✅ | ✅ | — | ✅ | — | — | ✅ | ✅ | — | — | ✅ | — |
| network.delete         | ✅ | ✅ | — | — | — | — | — | ✅ | — | — | — | — |

### Module — Project Management (Office)

| Permission             | SuperAdmin | LabelOwner | Exec | A&R | Prod | Artist | Mktg | PR | Designer | Finance | Admin | Guest |
|------------------------|:---------:|:----------:|:----:|:---:|:----:|:------:|:----:|:--:|:--------:|:-------:|:-----:|:-----:|
| office.view            | ✅ | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | ✅ | — | ✅ | ✅ |
| office.create          | ✅ | ✅ | — | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ | — |
| office.edit            | ✅ | ✅ | — | ✅ | — | — | ✅ | ✅ | ✅ | — | ✅ | — |
| office.delete          | ✅ | ✅ | — | — | — | — | — | — | — | — | ✅ | — |

### Module — Tasks

| Permission             | SuperAdmin | LabelOwner | Exec | A&R | Prod | Artist | Mktg | PR | Designer | Finance | Admin | Guest |
|------------------------|:---------:|:----------:|:----:|:---:|:----:|:------:|:----:|:--:|:--------:|:-------:|:-----:|:-----:|
| tasks.view             | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| tasks.create           | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | — |
| tasks.edit             | ✅ | ✅ | — | ✅ | ✅ | — | ✅ | ✅ | ✅ | — | ✅ | — |
| tasks.assign           | ✅ | ✅ | ✅ | — | — | — | — | — | — | — | ✅ | — |

### Module — Reports

| Permission             | SuperAdmin | LabelOwner | Exec | A&R | Prod | Artist | Mktg | PR | Designer | Finance | Admin | Guest |
|------------------------|:---------:|:----------:|:----:|:---:|:----:|:------:|:----:|:--:|:--------:|:-------:|:-----:|:-----:|
| reports.view           | ✅ | ✅ | ✅ | ✅ | — | ✅ | ✅ | — | — | ✅ | ✅ | ✅ |
| reports.create         | ✅ | ✅ | ✅ | — | — | — | ✅ | — | — | ✅ | — | — |
| reports.export         | ✅ | ✅ | ✅ | — | — | — | — | — | — | ✅ | — | — |

---

## Future Module: Production

| Permission               | SuperAdmin | LabelOwner | Exec | A&R | Prod | Artist | Mktg | PR | Designer | Finance | Admin | Guest |
|--------------------------|:---------:|:----------:|:----:|:---:|:----:|:------:|:----:|:--:|:--------:|:-------:|:-----:|:-----:|
| production.view          | ✅ | ✅ | ✅ | ✅ | ✅ | — | — | — | — | — | ✅ | — |
| production.create        | ✅ | ✅ | — | ✅ | ✅ | — | — | — | — | — | — | — |
| production.edit          | ✅ | ✅ | — | — | ✅ | — | — | — | — | — | — | — |
| production.delete        | ✅ | ✅ | — | — | — | — | — | — | — | — | — | — |
| production.upload        | ✅ | ✅ | — | — | ✅ | ✅ | — | — | — | — | — | — |
| production.review        | ✅ | ✅ | — | ✅ | ✅ | — | — | — | — | — | — | — |
| production.approve       | ✅ | ✅ | — | — | ✅ | — | — | — | — | — | — | — |

## Future Module: Marketing

| Permission               | SuperAdmin | LabelOwner | Exec | A&R | Prod | Artist | Mktg | PR | Designer | Finance | Admin | Guest |
|--------------------------|:---------:|:----------:|:----:|:---:|:----:|:------:|:----:|:--:|:--------:|:-------:|:-----:|:-----:|
| marketing.view           | ✅ | ✅ | ✅ | ✅ | — | — | ✅ | ✅ | — | — | ✅ | — |
| marketing.create         | ✅ | ✅ | — | — | — | — | ✅ | — | — | — | — | — |
| marketing.edit           | ✅ | ✅ | — | — | — | — | ✅ | — | — | — | — | — |
| marketing.delete         | ✅ | ✅ | — | — | — | — | ✅ | — | — | — | — | — |
| marketing.publish        | ✅ | ✅ | — | — | — | — | ✅ | — | — | — | — | — |
| marketing.analytics      | ✅ | ✅ | ✅ | — | — | — | ✅ | — | — | — | — | — |

## Future Module: Finance (Invoicing & Accounting)

| Permission               | SuperAdmin | LabelOwner | Exec | A&R | Prod | Artist | Mktg | PR | Designer | Finance | Admin | Guest |
|--------------------------|:---------:|:----------:|:----:|:---:|:----:|:------:|:----:|:--:|:--------:|:-------:|:-----:|:-----:|
| invoices.view            | ✅ | ✅ | ✅ | — | — | — | — | — | — | ✅ | — | — |
| invoices.create          | ✅ | ✅ | — | — | — | — | — | — | — | ✅ | — | — |
| invoices.edit            | ✅ | ✅ | — | — | — | — | — | — | — | ✅ | — | — |
| invoices.send            | ✅ | ✅ | — | — | — | — | — | — | — | ✅ | — | — |
| budgets.view             | ✅ | ✅ | ✅ | — | — | — | ✅ | — | — | ✅ | — | — |
| budgets.manage           | ✅ | ✅ | — | — | — | — | — | — | — | ✅ | — | — |
| expenses.view            | ✅ | ✅ | ✅ | — | — | — | ✅ | — | — | ✅ | — | — |
| expenses.create          | ✅ | ✅ | — | — | — | — | ✅ | — | — | ✅ | — | — |
| accounting.view          | ✅ | ✅ | ✅ | — | — | — | — | — | — | ✅ | — | — |
| accounting.manage        | ✅ | ✅ | — | — | — | — | — | — | — | ✅ | — | — |

---

## Role-to-Permission Summary (by module count)

| Role          | Modules with Full CRUD                            | Read-Only Modules       |
|---------------|---------------------------------------------------|-------------------------|
| SuperAdmin    | All                                                | —                       |
| LabelOwner    | All                                                | —                       |
| Executive     | Reports, Tasks                                    | Music, Contracts, Finance, Network |
| A&R           | Music (create/edit), Contracts (create/edit), Network | Reports, Production (future) |
| Producer      | Music (create/edit for songs), Production (future) | Music (view)            |
| Artist        | Tasks (create), Production (upload, future)       | Music, Contracts, Royalties |
| Marketing     | Music (edit releases, publish), Marketing (future), Network | Reports, Analytics |
| PR            | Network (full), Office (create/edit)              | Music (view)            |
| Designer      | Office (create/edit)                              | Music (view)            |
| Finance       | Royalties, Finance, Reports                       | Music, Contracts        |
| Admin         | Users, Teams, Settings, Office, Tasks             | Music, Contracts, Network |
| Guest         | —                                                 | Music, Contracts, Network, Office, Reports |

---

## How Permissions Map to the API

Each API route checks a permission via `requirePermission("<module>.<action>")`.

```typescript
// Example: POST /api/artists
export async function POST(req: Request) {
  const { user, error } = await requirePermission("artists.create");
  if (error) return error;
  // ... create artist
}
```

This maps directly to the matrix above. If a role has `artists.create` checked,
it can call `POST /api/artists`. If not, the route returns `403 Forbidden`.

### Permission Code to API Method Mapping

| Permission          | API Methods                                          |
|---------------------|------------------------------------------------------|
| *.view              | GET /api/<resource>, GET /api/<resource>/[id]        |
| *.create            | POST /api/<resource>                                 |
| *.edit              | PUT /api/<resource>/[id]                             |
| *.delete            | DELETE /api/<resource>/[id]                          |
| *.publish           | POST /api/<resource>/[id]/publish                    |
| *.sign              | POST /api/<resource>/[id]/sign                       |
| *.manage            | Module-specific admin endpoints                      |
| *.export            | GET /api/export                                      |
| *.invite            | POST /api/iam/users (with invite)                    |
| *.assign            | PATCH /api/office/tasks/[id] (assignee change)       |
