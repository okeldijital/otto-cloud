# 04 — Event Catalog

## Event Architecture

Every major action in the system generates an event. Events serve three purposes:

1. **Audit trail** — `audit_logs` table (persistent, structured)
2. **Activity feed** — `activities` table (user-facing timeline)
3. **Telemetry** — `usage` table (aggregated metrics for billing/analytics)

### Event Shape

All events share a common structure:

```json
{
  "event": "<module>.<action>",
  "timestamp": "2026-06-18T12:00:00Z",
  "user_id": 42,
  "organization_id": "org-uuid",
  "entity_type": "<entity>",
  "entity_id": 7,
  "entity_name": "Display Name",
  "payload": { },
  "changes": { "field": { "from": "old", "to": "new" } }
}
```

### Storage

| Store          | Retention | Purpose                     |
|----------------|-----------|-----------------------------|
| audit_logs     | Indefinite | Compliance, debugging       |
| activities     | 90 days   | User-facing activity feed   |
| usage          | Rolling   | Billing and quotas          |
| ai_audit_log   | Indefinite | AI action transparency      |

---

## Event Catalog by Module

### Foundation — Auth

| Event                  | Description              | Payload                                   |
|------------------------|--------------------------|-------------------------------------------|
| user.signed_in         | User logged in           | { method: "credentials"\|"sso" }          |
| user.signed_out        | User logged out          | { }                                       |
| user.registered        | New account created      | { email, name }                           |
| user.login_failed      | Failed login attempt     | { email, reason }                         |
| user.password_reset    | Password reset           | { method: "email"\|"admin" }              |

### Foundation — Organization

| Event                          | Description                | Payload                                   |
|--------------------------------|----------------------------|-------------------------------------------|
| organization.created           | Org created                | { name, org_type }                        |
| organization.updated           | Org settings changed       | { changed_fields[] }                      |
| organization.deleted           | Org deleted                | { reason }                                |
| organization.transferred       | Ownership transferred      | { from_user_id, to_user_id }              |
| organization.branding_updated  | Branding changed           | { changed_fields[] }                      |

### Foundation — Users & Teams

| Event                          | Description                | Payload                                   |
|--------------------------------|----------------------------|-------------------------------------------|
| user.invited                   | User invited to org        | { email, role_id, invited_by }            |
| user.joined                    | User accepted invitation   | { email }                                 |
| user.removed                   | User removed from org      | { removed_by }                            |
| user.suspended                 | User suspended             | { suspended_by, reason }                  |
| user.unsuspended               | User unsuspended           | { unsuspended_by }                        |
| user.role_changed              | Role assigned/changed      | { old_role, new_role, changed_by }        |
| team.created                   | Team created               | { name }                                  |
| team.updated                   | Team updated               | { changed_fields[] }                      |
| team.deleted                   | Team deleted               | { name }                                  |
| team.member_added              | Member added to team       | { user_id, team_id }                      |
| team.member_removed            | Member removed from team   | { user_id, team_id }                      |

### Foundation — Billing

| Event                          | Description                | Payload                                   |
|--------------------------------|----------------------------|-------------------------------------------|
| subscription.created           | Subscription started       | { plan_id, plan_name }                    |
| subscription.changed           | Plan changed               | { old_plan_id, new_plan_id }              |
| subscription.cancelled         | Subscription ended         | { reason }                                |
| subscription.payment_failed    | Payment declined           | { attempt_count, error }                  |
| billing.limit_reached          | Usage limit hit            | { metric, limit, current }                |

### Foundation — AI

| Event                          | Description                | Payload                                   |
|--------------------------------|----------------------------|-------------------------------------------|
| ai.chat.started                | AI session created         | { agent_type, session_id }                |
| ai.chat.message_sent           | Message sent to AI         | { session_id, role, content_length }      |
| ai.contract.drafted            | Contract drafted by AI     | { contract_id, source }                   |
| ai.contract.attached           | AI attached contract to release | { contract_id, release_id, confidence }   |
| ai.contract.resolved           | AI resolved contract entities | { contract_id, entity_count, confidence } |
| ai.release.integrated          | AI integrated release      | { release_id, contract_id, link_count }   |
| ai.royalty.simulated           | AI simulated royalty split | { release_id, splits_total, valid }       |
| ai.core.write_proposed         | AI proposed data changes   | { contract_id, item_count }               |
| ai.core.write_applied          | AI data changes applied    | { run_id, applied_count, conflict_count } |
| ai.core.write_rejected         | AI changes rejected by user| { run_id, reason }                        |
| ai.audit.logged                | AI action audited          | { action, tool, request_hash }            |

### Module — Music

| Event                          | Description                | Payload                                   |
|--------------------------------|----------------------------|-------------------------------------------|
| artist.created                 | Artist added               | { name, artist_kind }                     |
| artist.updated                 | Artist details changed     | { changed_fields[] }                      |
| artist.deleted                 | Artist soft-deleted        | { name }                                  |
| artist.restored                | Artist restored            | { name }                                  |
| artist.merged                  | Artists merged             | { source_id, target_id }                  |
| artist.group_member_added      | Member added to group      | { group_id, member_id, role }             |
| artist.group_member_removed    | Member removed from group  | { group_id, member_id }                   |
| song.created                   | Track created              | { title, artist_id }                      |
| song.updated                   | Track updated              | { changed_fields[] }                      |
| song.deleted                   | Track soft-deleted         | { title }                                 |
| song.isrc_assigned             | ISRC assigned              | { isrc }                                  |
| song.uploaded                  | Audio file uploaded        | { file_location, size }                   |
| song.status_changed            | Status transition          | { from, to }                              |
| release.created                | Release created            | { title, release_type }                   |
| release.updated                | Release updated            | { changed_fields[] }                      |
| release.deleted                | Release soft-deleted       | { title }                                 |
| release.published              | Release published          | { }                                       |
| release.upc_assigned           | UPC assigned               | { upc }                                   |
| release.track_added            | Track added to release     | { track_id, track_title }                 |
| release.track_removed          | Track removed from release | { track_id, track_title }                 |
| release.track_reordered        | Track order changed        | { track_ids[] }                           |
| release.artwork_uploaded       | Cover art uploaded         | { url }                                   |
| release.status_changed         | Status transition          | { from, to }                              |
| release.merged                 | Releases merged            | { source_id into target_id }              |
| work.created                   | Work/composition created   | { title, iswc }                           |
| work.updated                   | Work updated               | { changed_fields[] }                      |
| work.deleted                   | Work soft-deleted          | { title }                                 |
| work.registered                | Work registered with PRO   | { pro_name, registration_ref }            |
| work.iswc_assigned             | ISWC assigned              | { iswc }                                  |

### Module — Contracts

| Event                          | Description                | Payload                                   |
|--------------------------------|----------------------------|-------------------------------------------|
| contract.created               | Contract created           | { contract_number, title, type }          |
| contract.updated               | Contract updated           | { changed_fields[] }                      |
| contract.deleted               | Contract soft-deleted      | { title }                                 |
| contract.signed                | Contract signed            | { signed_by }                             |
| contract.status_changed        | Status transition          | { from, to }                              |
| contract.expiring              | Contract nearing expiry    | { days_remaining }                        |
| contract.expired               | Contract expired           | { }                                       |
| contract.party_added           | Party added                | { entity_type, entity_id, role }          |
| contract.party_removed         | Party removed              | { party_id }                              |
| contract.document_uploaded     | Document uploaded          | { version, file_name }                    |
| contract.document_versioned    | New document version       | { old_version, new_version }              |
| contract.split_added           | Split group added          | { group_name }                            |
| contract.split_updated         | Split percentages changed  | { changed_parties[] }                     |
| contract.track_linked          | Track linked to contract   | { track_id, track_title }                 |
| contract.track_unlinked        | Track unlinked             | { track_id }                              |

### Module — Royalties & Finance

| Event                          | Description                | Payload                                   |
|--------------------------------|----------------------------|-------------------------------------------|
| royalty.statement_imported     | Royalty data imported      | { source, line_count, total_amount }      |
| royalty.statement_generated    | Statement generated        | { period, artist_count, total }           |
| invoice.created                | Invoice created            | { number, amount, client }                |
| invoice.sent                   | Invoice sent               | { method }                                |
| invoice.paid                   | Invoice paid               | { payment_ref, amount }                   |
| invoice.overdue                | Invoice overdue            | { days_overdue }                          |
| invoice.cancelled              | Invoice cancelled          | { reason }                                |
| budget.created                 | Budget created             | { name, total }                           |
| budget.updated                 | Budget updated             | { changed_fields[] }                      |
| expense.recorded               | Expense logged             | { category, amount, budget_id }           |
| expense.approved               | Expense approved           | { approved_by }                           |

### Module — Marketing (Future)

| Event                          | Description                | Payload                                   |
|--------------------------------|----------------------------|-------------------------------------------|
| campaign.created               | Campaign created           | { name, release_id, budget }              |
| campaign.updated               | Campaign updated           | { changed_fields[] }                      |
| campaign.launched              | Campaign launched          | { }                                       |
| campaign.paused                | Campaign paused            | { reason }                                |
| campaign.completed             | Campaign ended             | { }                                       |
| campaign.budget_updated        | Budget changed             | { from, to }                              |
| campaign.asset_added           | Asset uploaded             | { asset_type, file_name }                 |
| campaign.milestone_reached     | Milestone completed        | { milestone_name, date }                  |

### Module — CRM / Network

| Event                          | Description                | Payload                                   |
|--------------------------------|----------------------------|-------------------------------------------|
| individual.created             | Contact added              | { name, email, role }                     |
| individual.updated             | Contact updated            | { changed_fields[] }                      |
| individual.deleted             | Contact removed            | { name }                                  |
| organization.created           | Contact org added          | { name, org_type }                        |
| organization.updated           | Contact org updated        | { changed_fields[] }                      |
| organization.deleted           | Contact org removed        | { name }                                  |
| relationship.created           | Relationship linked        | { source, target, type }                  |
| relationship.updated           | Relationship changed       | { changed_fields[] }                      |
| relationship.deleted           | Relationship removed       | { source, target }                        |

### Module — Production (Future)

| Event                          | Description                | Payload                                   |
|--------------------------------|----------------------------|-------------------------------------------|
| session.created                | Recording session booked   | { artist, studio, date }                  |
| session.started                | Session began              | { }                                       |
| session.completed              | Session ended              | { duration, asset_count }                 |
| session.cancelled              | Session cancelled          | { reason }                                |
| version.uploaded               | New version added          | { track_id, label, file_size }            |
| version.mix_submitted          | Mix ready for review       | { version_id, submitted_by }              |
| version.mix_approved           | Mix approved               | { approved_by, comments }                 |
| version.mix_rejected           | Mix needs changes          | { rejected_by, comments }                 |
| version.master_submitted       | Master ready for review    | { version_id, submitted_by }              |
| version.master_approved        | Master approved            | { approved_by, comments }                 |
| version.master_rejected        | Master needs changes       | { rejected_by, comments }                 |
| studio.created                 | Studio added               | { name, location }                        |
| studio.updated                 | Studio details changed     | { changed_fields[] }                      |
| studio.deleted                 | Studio removed             | { name }                                  |

### Module — Project Management (Office)

| Event                          | Description                | Payload                                   |
|--------------------------------|----------------------------|-------------------------------------------|
| task.created                   | Task created               | { title, assigned_to, linked_entity }     |
| task.updated                   | Task updated               | { changed_fields[] }                      |
| task.completed                 | Task marked done           | { completed_by }                          |
| task.reopened                  | Task reopened              | { }                                       |
| task.assigned                  | Task reassigned            | { from, to }                              |
| task.deleted                   | Task soft-deleted          | { title }                                 |
| note.created                   | Note created               | { title, linked_entity }                  |
| note.updated                   | Note updated               | { changed_fields[] }                      |
| note.deleted                   | Note soft-deleted          | { title }                                 |
| event.created                  | Calendar event created     | { title, start_date, category }           |
| event.updated                  | Calendar event updated     | { changed_fields[] }                      |
| event.deleted                  | Calendar event deleted     | { title }                                 |
| document.uploaded              | Document uploaded          | { filename, file_type, linked_entity }    |
| document.updated               | Document updated           | { changed_fields[] }                      |
| document.deleted               | Document soft-deleted      | { filename }                              |
| document.versioned             | New document version       | { old_version, new_version }              |

### Module — Workspaces

| Event                          | Description                | Payload                                   |
|--------------------------------|----------------------------|-------------------------------------------|
| workspace.created              | Workspace created          | { name, template_id }                     |
| workspace.updated              | Workspace updated          | { changed_fields[] }                      |
| workspace.archived             | Workspace archived         | { }                                       |
| workspace.deleted              | Workspace soft-deleted     | { name }                                  |
| workspace.member_added         | Member invited             | { user_id, role }                         |
| workspace.member_removed       | Member removed             | { user_id }                               |
| workspace.member_accepted      | Invitation accepted        | { user_id }                               |
| workspace.status_changed       | Status transition          | { from, to }                              |
| workspace.file_uploaded        | File added                 | { filename, category }                    |
| workspace.timeline_event       | Timeline entry added       | { event_type, summary }                   |

### Module — Reports & Analytics

| Event                          | Description                | Payload                                   |
|--------------------------------|----------------------------|-------------------------------------------|
| report.generated               | Report created             | { report_type, row_count, format }        |
| report.exported                | Report exported            | { format, filename }                      |
| report.scheduled               | Recurring report set       | { cron, recipients[] }                    |
| data.imported                  | Data imported              | { source, entity_type, row_count }        |
| data.exported                  | Data exported              | { entity_type, format, row_count }        |

### Module — System

| Event                          | Description                | Payload                                   |
|--------------------------------|----------------------------|-------------------------------------------|
| system.backup.created          | Backup created             | { filename, size, kind }                  |
| system.backup.restored         | Backup restored            | { backup_id, status }                     |
| system.status_quo_detected     | Data quality issue found   | { entity_type, issue_type, severity }     |
| system.status_quo_resolved     | Issue resolved             | { entity_type, issue_type, resolved_by }  |
| system.rate_limit_hit          | Rate limit exceeded        | { api_key_id, endpoint }                  |
| system.error                   | Server error               | { route, status_code, message }           |

---

## Event Channel Architecture

Events are currently written directly to the database via `recordAudit()`.
Future channels should include:

| Channel    | Purpose                          | Consumer                              |
|------------|----------------------------------|---------------------------------------|
| DB         | Persistent storage               | audit_logs, activities, usage tables  |
| Webhook    | External integrations            | Partner platforms, Zapier-like flows  |
| In-App     | Real-time UI updates             | Notification badge, activity feed     |
| WebSocket  | Live collaboration               | Multi-user sessions, real-time sync   |
| Email      | Digest / alert                   | Configurable per-user or per-event    |

### Webhook Events (Future)

When webhook support is added, external systems subscribe to event patterns:

```
POST /api/webhooks
{
  "url": "https://partner.com/otto-events",
  "events": ["release.published", "contract.signed", "invoice.paid"],
  "secret": "whsec_..."
}
```

Events are delivered as `POST` to the registered URL with the standard event
payload and an `X-Otto-Signature` HMAC header.

---

## How Events Are Recorded

### Current Implementation

In API route handlers:

```typescript
import { recordAudit } from "@/lib/audit";

export async function POST(req: Request) {
  // ... create entity
  await recordAudit({
    action: "artist.created",
    entity_type: "artist",
    entity_id: newArtist.id,
    entity_name: newArtist.name,
    changes: { name: newArtist.name, artist_kind: newArtist.artist_kind },
    user_id: userId,
    organization_id: orgId,
  });
}
```

### Future: Automatic Event Recording

Events should be recorded automatically via middleware, Prisma hooks, or a
dedicated event bus rather than manually in each handler. This prevents events
from being missed when new endpoints are added.

```typescript
// Proposed: event bus middleware
eventBus.emit("artist.created", {
  entity_type: "artist",
  entity_id: newArtist.id,
  entity_name: newArtist.name,
  payload: { name: newArtist.name, artist_kind: newArtist.artist_kind },
  user_id: userId,
  organization_id: orgId,
});
```

The event bus would then fan out to all registered channels (DB, webhook,
websocket, etc.) without each handler needing to know about the infrastructure.
