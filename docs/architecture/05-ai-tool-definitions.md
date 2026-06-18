# 05 — AI Tool Definitions

## Architecture

### Agent Model

Otto supports specialized AI agents. Each agent has:

1. **System prompt** — Role definition, goals, behavioral constraints
2. **Tool set** — Read/write operations the agent can invoke
3. **Context window** — Organization data, linked entities, session history
4. **Permission boundary** — Same IAM permissions as the requesting user

### Agent Registry

| Agent           | Slug           | Primary Module     | Responsibility                         |
|-----------------|----------------|--------------------|----------------------------------------|
| Executive       | `executive`    | Cross-module       | Business insights, strategy, analytics |
| Producer        | `producer`     | Production         | Recording sessions, version mgmt       |
| Marketing       | `marketing`    | Marketing          | Campaign planning, content, press      |
| Legal           | `legal`        | Contracts          | Contract analysis, compliance, risks   |
| Finance         | `finance`      | Finance            | Royalties, budgets, invoicing          |
| Publishing      | `publishing`   | Music (Works)      | Rights management, metadata, PROs      |
| A&R             | `ar`           | Music + CRM        | Talent scouting, catalog management    |
| Project Manager | `pm`           | Project Management | Task tracking, deadlines, workflows    |

### Agent Invocation

Agents are invoked via:

1. **Chat** — User selects an agent in the AI chat interface
2. **Context page** — Agent auto-selects based on the page entity type
3. **Command palette** — `⌘K > Ask AI > <agent>`
4. **API** — `POST /api/ai/chat` with `{ agent: "<slug>", message: "..." }`

---

## Tool Schema

Every tool follows a standard definition:

```typescript
interface AITool {
  name: string;              // Unique tool identifier
  description: string;       // LLM-facing description of what it does
  module: string;            // Owning module
  input_schema: {            // JSON Schema for parameters
    type: "object",
    properties: { ... },
    required: string[]
  };
  output_schema: {           // JSON Schema for return value
    type: "object",
    properties: { ... }
  };
  permission_required: string; // IAM permission code (or null for public)
  requires_review: boolean;    // Requires user approval before execution
}
```

### Permission Enforcement

Tools respect the same IAM permissions as the API. If a user lacks `artists.edit`,
the `update_artist` tool will reject the call regardless of which agent is driving it.

### Review Mode

Tools with `requires_review: true` (writes, deletes, publishes) follow a proposal
pattern rather than executing immediately:

1. Agent generates a proposal via `ai_core_write_proposal_runs`
2. User reviews proposed changes in the UI
3. User approves or rejects via `POST /api/ai/core/write/[id]/apply`
4. On approval, changes are applied and `ai_core_write_apply_events` is recorded

---

## Tool Catalog by Module

### Foundation — Organization

| Tool                      | Description                        | Permission              | Review | Agents              |
|---------------------------|------------------------------------|-------------------------|--------|---------------------|
| get_organization          | Get org profile and settings       | organization.view       | No     | All                 |
| update_organization       | Update org name, branding, config  | organization.edit       | Yes    | Executive           |
| get_branding              | Get org branding assets            | branding.manage         | No     | Marketing, Executive |
| update_branding           | Update logo, colors, signature     | branding.manage         | Yes    | Marketing           |

### Foundation — Users

| Tool                      | Description                        | Permission              | Review | Agents              |
|---------------------------|------------------------------------|-------------------------|--------|---------------------|
| get_team_members          | List team members and roles        | users.view              | No     | Executive, PM       |
| get_user                  | Get user profile                   | users.view              | No     | All                 |
| invite_user               | Invite a new team member           | users.invite            | Yes    | Executive, Admin    |
| update_user_role          | Change a user's role               | users.edit              | Yes    | Executive, Admin    |
| get_roles                 | List available roles               | roles.view              | No     | Executive, Admin    |

### Foundation — AI

| Tool                      | Description                        | Permission              | Review | Agents              |
|---------------------------|------------------------------------|-------------------------|--------|---------------------|
| list_agents               | List available AI agents           | ai.view                 | No     | All                 |
| get_agent_context         | Get current agent's context state  | ai.view                 | No     | All                 |
| get_ai_audit_log          | Review AI action history           | ai.manage               | No     | Executive           |

### Module — Music

| Tool                      | Description                        | Permission              | Review | Agents              |
|---------------------------|------------------------------------|-------------------------|--------|---------------------|
| search_catalog            | Search across all music entities    | artists.view            | No     | All                 |
| get_artist                | Get artist profile                 | artists.view            | No     | All                 |
| list_artists              | List all artists (filterable)      | artists.view            | No     | All                 |
| create_artist             | Create a new artist                | artists.create          | Yes    | A&R, Executive      |
| update_artist             | Update artist details              | artists.edit            | Yes    | A&R, Executive      |
| merge_artists             | Merge two artist records           | artists.edit            | Yes    | A&R, Publishing     |
| get_song                  | Get track details                  | songs.view              | No     | All                 |
| list_songs                | List tracks (filterable)           | songs.view              | No     | All                 |
| create_song               | Create a new track                 | songs.create            | Yes    | A&R, Producer       |
| update_song               | Update track details               | songs.edit              | Yes    | A&R, Producer       |
| assign_isrc               | Assign ISRC to track               | songs.edit              | Yes    | Publishing          |
| get_release               | Get release details                | releases.view           | No     | All                 |
| list_releases             | List releases (filterable)         | releases.view           | No     | All                 |
| create_release            | Create a new release               | releases.create         | Yes    | A&R, Producer       |
| update_release            | Update release details             | releases.edit           | Yes    | A&R, Marketing      |
| publish_release           | Publish a release                  | releases.publish        | Yes    | Marketing           |
| assign_upc                | Assign UPC to release              | releases.edit           | Yes    | Publishing          |
| validate_release          | Check release completeness         | releases.view           | No     | All                 |
| get_release_readiness     | Get launch readiness checklist     | releases.view           | No     | PM, Marketing       |
| get_work                  | Get composition details            | works.view              | No     | All                 |
| list_works                | List works (filterable)            | works.view              | No     | All                 |
| create_work               | Create a new work                  | works.create            | Yes    | A&R, Publishing     |
| update_work               | Update work details                | works.edit              | Yes    | Publishing          |
| register_work             | Register work with a PRO           | works.edit              | Yes    | Publishing          |
| assign_iswc               | Assign ISWC to work                | works.edit              | Yes    | Publishing          |
| generate_biography        | Generate artist biography          | artists.view            | No    | A&R, Executive      |
| generate_song_credits     | Generate formatted credits string  | songs.view              | No     | Publishing          |

### Module — Contracts

| Tool                          | Description                    | Permission              | Review | Agents              |
|-------------------------------|--------------------------------|-------------------------|--------|---------------------|
| get_contract                  | Get contract details           | contracts.view          | No     | All                 |
| list_contracts                | List contracts (filterable)    | contracts.view          | No     | All                 |
| create_contract               | Create a new contract          | contracts.create        | Yes    | Legal, A&R          |
| update_contract               | Update contract terms          | contracts.edit          | Yes    | Legal               |
| sign_contract                 | Sign a contract                | contracts.sign          | Yes    | Legal, Finance      |
| summarize_contract            | Extract and summarize clauses  | contracts.view          | No     | Legal, Executive    |
| highlight_contract_risks      | Identify risky clauses         | contracts.view          | No     | Legal, Executive    |
| identify_missing_signatures   | Check signature completeness   | contracts.view          | No     | Legal               |
| get_contract_parties          | List contract parties          | contracts.view          | No     | All                 |
| add_contract_party            | Add party to contract          | contracts.edit          | Yes    | Legal, A&R          |
| remove_contract_party         | Remove party from contract     | contracts.edit          | Yes    | Legal               |
| get_contract_splits           | Get royalty split details      | contracts.view          | No     | Finance, Legal      |
| update_contract_splits        | Update split percentages       | contracts.edit          | Yes    | Finance, Legal      |
| simulate_royalties            | Simulate royalty distribution  | contracts.view          | No     | Finance             |
| attach_contract_to_release    | Link contract to release       | contracts.edit          | Yes    | Legal, A&R          |
| draft_contract_clause         | Draft a contract clause        | contracts.create        | Yes    | Legal               |

### Module — Royalties & Finance

| Tool                      | Description                        | Permission              | Review | Agents              |
|---------------------------|------------------------------------|-------------------------|--------|---------------------|
| get_royalties             | Get royalty data (filterable)      | royalties.view          | No     | Finance, Executive  |
| list_royalty_statements   | List royalty statements            | royalties.view          | No     | Finance             |
| get_financial_summary     | Get financial overview             | finance.view            | No     | Finance, Executive  |
| get_invoice               | Get invoice details                | invoices.view           | No     | Finance             |
| list_invoices             | List invoices (filterable)         | invoices.view           | No     | Finance             |
| create_invoice            | Create an invoice                  | invoices.create         | Yes    | Finance             |
| get_budget                | Get budget details                 | budgets.view            | No     | Finance, Marketing  |
| list_budgets              | List budgets (filterable)          | budgets.view            | No     | Finance             |
| create_budget             | Create a budget                    | budgets.manage          | Yes    | Finance             |
| record_expense            | Record an expense                  | expenses.create         | Yes    | Finance, Marketing  |
| get_expenses              | List expenses (filterable)         | expenses.view           | No     | Finance             |
| calculate_royalties       | Calculate royalties for a period   | royalties.edit          | Yes    | Finance             |

### Module — CRM / Network

| Tool                      | Description                        | Permission              | Review | Agents              |
|---------------------------|------------------------------------|-------------------------|--------|---------------------|
| get_contact               | Get individual contact             | network.view            | No     | All                 |
| list_contacts             | List contacts (filterable)         | network.view            | No     | All                 |
| create_contact            | Create a new contact               | network.create          | Yes    | A&R, Marketing, PR  |
| update_contact            | Update contact details             | network.edit            | Yes    | A&R, Marketing, PR  |
| get_relationship          | Get relationship between entities  | network.view            | No     | All                 |
| create_relationship       | Link two entities                  | network.create          | Yes    | A&R, Marketing      |

### Module — Marketing (Future)

| Tool                      | Description                        | Permission              | Review | Agents              |
|---------------------------|------------------------------------|-------------------------|--------|---------------------|
| get_campaign              | Get campaign details               | marketing.view          | No     | Marketing, Executive|
| list_campaigns            | List campaigns (filterable)        | marketing.view          | No     | Marketing, Executive|
| create_campaign           | Create a new campaign              | marketing.create        | Yes    | Marketing           |
| update_campaign           | Update campaign details            | marketing.edit          | Yes    | Marketing           |
| launch_campaign           | Launch a campaign                  | marketing.publish       | Yes    | Marketing           |
| get_campaign_analytics    | Get campaign performance data      | marketing.analytics     | No     | Marketing, Executive|
| draft_press_release       | Draft a press release              | marketing.create        | No     | Marketing, PR       |
| generate_social_copy      | Generate social media posts        | marketing.create        | No     | Marketing           |
| get_content_calendar      | Get upcoming content schedule      | marketing.view          | No     | Marketing, PM       |

### Module — Production (Future)

| Tool                      | Description                        | Permission              | Review | Agents              |
|---------------------------|------------------------------------|-------------------------|--------|---------------------|
| get_session               | Get recording session details      | production.view         | No     | Producer            |
| list_sessions             | List sessions (filterable)         | production.view         | No     | Producer, A&R       |
| create_session            | Book a recording session           | production.create       | Yes    | Producer, A&R       |
| update_session            | Update session details             | production.edit         | Yes    | Producer            |
| get_versions              | List versions for a track          | production.view         | No     | Producer            |
| upload_version            | Upload new version                 | production.upload       | Yes    | Producer, Artist    |
| submit_for_review         | Submit version for mix/master review| production.review       | Yes    | Producer            |
| approve_review            | Approve mix or master              | production.approve      | Yes    | Producer, A&R       |
| reject_review             | Reject with feedback               | production.review       | Yes    | Producer, A&R       |
| get_studio                | Get studio details                 | production.view         | No     | Producer            |
| list_studios              | List studios (filterable)          | production.view         | No     | Producer            |
| book_studio               | Book studio time                   | production.create       | Yes    | Producer            |

### Module — Project Management

| Tool                      | Description                        | Permission              | Review | Agents              |
|---------------------------|------------------------------------|-------------------------|--------|---------------------|
| get_task                  | Get task details                   | tasks.view              | No     | All                 |
| list_tasks                | List tasks (filterable)            | tasks.view              | No     | All                 |
| create_task               | Create a new task                  | tasks.create            | Yes    | PM, All             |
| update_task               | Update task details                | tasks.edit              | Yes    | PM, Assignee        |
| assign_task               | Assign task to user                | tasks.assign            | Yes    | PM, Executive       |
| complete_task             | Mark task complete                 | tasks.edit              | Yes    | Assignee            |
| get_calendar              | Get upcoming events                | office.view             | No     | All                 |
| create_event              | Create calendar event              | office.create           | Yes    | PM, All             |
| get_timeline              | Get project timeline for an entity | office.view             | No     | All                 |
| generate_status_report    | Generate project status summary    | tasks.view              | No     | PM, Executive       |

### Module — Reports & Analytics

| Tool                      | Description                        | Permission              | Review | Agents              |
|---------------------------|------------------------------------|-------------------------|--------|---------------------|
| get_report                | Get report details                 | reports.view            | No     | All                 |
| list_reports              | List available reports             | reports.view            | No     | All                 |
| create_report             | Create a new report definition     | reports.create          | Yes    | Executive, Finance  |
| run_report                | Execute a report                   | reports.create          | Yes    | Executive, Finance  |
| export_data               | Export data to CSV/XLSX/JSON       | reports.export          | Yes    | Executive, Finance  |
| get_analytics_dashboard   | Get analytics overview             | reports.view            | No     | Executive           |
| get_revenue_analytics     | Get revenue breakdown              | finance.view            | No     | Executive, Finance  |
| get_streaming_analytics   | Get streaming performance data     | reports.view            | No     | Marketing, Executive|

---

## Tool Assignment by Agent

### Executive

```
search_catalog, get_artist, list_artists, get_release, list_releases,
get_song, get_contract, list_contracts, summarize_contract,
get_financial_summary, get_royalties, get_revenue_analytics,
get_analytics_dashboard, get_streaming_analytics, generate_status_report,
get_team_members, get_organization, update_organization,
list_campaigns, get_campaign_analytics, run_report, create_report,
get_agent_context, get_ai_audit_log, list_agents
```

Context: Org-wide view across all modules. Read-heavy with limited write access.

### Producer

```
get_artist, list_artists, get_song, list_songs, create_song, update_song,
get_release, list_releases, create_release, update_release,
get_session, list_sessions, create_session, update_session,
get_versions, upload_version, submit_for_review, approve_review, reject_review,
get_studio, list_studios, book_studio,
get_task, list_tasks, create_task, update_task,
get_contract, list_contracts, search_catalog
```

Context: Recording sessions and tracks. Write access to production objects.

### Marketing

```
get_artist, list_artists, get_song, get_release, list_releases,
update_release, publish_release, validate_release, get_release_readiness,
get_campaign, list_campaigns, create_campaign, update_campaign, launch_campaign,
get_campaign_analytics, get_content_calendar,
draft_press_release, generate_social_copy, generate_biography,
get_contact, list_contacts, create_contact, update_contact,
get_task, list_tasks, create_task, get_budget, list_budgets,
get_streaming_analytics, search_catalog,
get_organization, get_branding, update_branding
```

Context: Release lifecycle and audience reach. Campaigns, press, and social.

### Legal

```
get_contract, list_contracts, create_contract, update_contract, sign_contract,
summarize_contract, highlight_contract_risks, identify_missing_signatures,
get_contract_parties, add_contract_party, remove_contract_party,
get_contract_splits, update_contract_splits, simulate_royalties,
attach_contract_to_release, draft_contract_clause,
get_artist, get_release, get_song,
search_catalog, get_organization
```

Context: Contract lifecycle. Read-write on contracts, read-only on catalog.

### Finance

```
get_contract, list_contracts, sign_contract, get_contract_splits,
update_contract_splits, simulate_royalties,
get_royalties, list_royalty_statements, calculate_royalties,
get_financial_summary, get_invoice, list_invoices, create_invoice,
get_budget, list_budgets, create_budget,
record_expense, get_expenses,
get_revenue_analytics, run_report, export_data,
get_organization, search_catalog
```

Context: Money flow. Royalties, invoices, budgets, expenses.

### Publishing

```
get_work, list_works, create_work, update_work,
register_work, assign_iswc, assign_isrc, assign_upc,
get_song, list_songs, create_song, update_song,
get_release, list_releases, update_release,
get_artist, list_artists, update_artist, merge_artists,
generate_song_credits, validate_release,
get_contract, list_contracts, get_contract_splits,
search_catalog
```

Context: Rights and metadata. ISRC, ISWC, UPC, PRO registration, credits.

### A&R

```
search_catalog, get_artist, list_artists, create_artist, update_artist,
get_song, list_songs, create_song, update_song,
get_release, list_releases, create_release, update_release,
get_work, list_works, create_work,
get_contract, list_contracts, create_contract, update_contract,
add_contract_party, attach_contract_to_release,
get_contact, list_contacts, create_contact, update_contact,
create_relationship, generate_biography,
get_session, list_sessions, approve_review, reject_review,
get_task, list_tasks, create_task,
get_organization
```

Context: Talent and catalog. Full CRUD on music and contracts, read on finance.

### Project Manager

```
get_task, list_tasks, create_task, update_task, assign_task, complete_task,
get_calendar, create_event, get_timeline, generate_status_report,
get_release, list_releases, get_release_readiness, validate_release,
get_workspace, list_workspaces, create_workspace, update_workspace,
get_campaign, get_content_calendar,
get_team_members, get_user,
get_contract, summarize_contract,
get_session, list_sessions,
search_catalog
```

Context: Deadlines and delivery. Task management, scheduling, status tracking.

---

## Tool Implementation Pattern

Each tool is implemented as an async function that:

1. Validates the user has the required permission
2. Calls the appropriate service or API handler
3. Records an audit event
4. Returns structured data to the LLM

```typescript
// Example tool implementation
export const get_release_readiness: AITool = {
  name: "get_release_readiness",
  description: "Check if a release is ready to launch. Returns a checklist of required items.",
  module: "music",
  input_schema: {
    type: "object",
    properties: {
      release_id: { type: "integer", description: "Release ID" },
    },
    required: ["release_id"],
  },
  permission_required: "releases.view",
  requires_review: false,

  async execute(userId: number, orgId: string, args: { release_id: number }) {
    const { error } = await requirePermission("releases.view");
    if (error) throw new Error("Permission denied");

    const release = await prisma.releases.findUnique({
      where: { id: args.release_id, organization_id: orgId },
      include: { tracks: true, artists: true },
    });

    const checklist = [
      { item: "Tracks added", met: release.tracks.length > 0 },
      { item: "Cover art uploaded", met: !!release.cover_art_url },
      { item: "UPC assigned", met: !!release.upc_code },
      { item: "Artist assigned", met: !!release.artist_id },
      { item: "Release date set", met: !!release.release_date },
    ];

    return {
      release_id: release.id,
      release_title: release.title,
      readiness: checklist.every(c => c.met) ? "ready" : "incomplete",
      checklist,
      missing_items: checklist.filter(c => !c.met).map(c => c.item),
    };
  },
};
```

---

## Tool Discovery

Agents discover available tools via the tool registry at startup. Each tool
is registered with its metadata:

```typescript
const toolRegistry = new Map<string, AITool>();

export function registerTool(tool: AITool) {
  toolRegistry.set(tool.name, tool);
}

export function getToolsForAgent(agentSlug: string): AITool[] {
  // Returns tools from agent's assigned modules
  // Permission-filtered at runtime per user
}
```

The registry enables:

- **Agent-specific tool lists** — Each agent only sees its assigned tools
- **Permission gating** — Tools are filtered by the user's IAM permissions
- **Discovery** — Agents can list available tools for the user
- **Extensibility** — New modules register their tools without modifying agent code
