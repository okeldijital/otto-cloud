# OTTO Project Management Removal

## Executive decision — September 2026

OTTO is no longer a project-management, calendar, task-management, or release-planning application.

The OTTO Core product is focused on its authoritative business system of record:

- Catalog
- Releases
- Tracks
- Works
- Artists
- Labels
- Publishers
- PROs
- Core Contracts
- Rights and royalty capabilities where licensed
- Deterministic business data and relationships

## Removed from the customer product surface

The following legacy surfaces are removed:

- Office as a generic productivity/project-management module
- Tasks
- Events / calendar
- Notes
- Office reports
- Office status queue
- Generic workspaces
- Release Workspace
- Release workspace milestones, deliverables, approvals, playbooks, marketing, discussions, timelines and related project-management UI

The platform event system remains. Domain timelines, lifecycle events, projections and notifications remain where they support authoritative OTTO records.

## ReleaseFlow boundary

Release planning and execution belong to ReleaseFlow.

OTTO retains the release catalogue record and its authoritative metadata. ReleaseFlow is the future workflow/project-management layer for preparing, collaborating on, approving, scheduling and delivering releases.

A future integration will connect the two systems rather than recreating ReleaseFlow inside OTTO.

## Data preservation

Existing workspace/task/event/note tables and historical workspace records are not dropped in this slice. Production currently contains legacy workspace records, so destructive deletion would risk losing information needed for the future ReleaseFlow integration.

Those tables are now treated as legacy infrastructure with no customer-facing OTTO capability.

## Entitlement boundary

The Office and Workspace commercial capabilities are retired. OTTO Core no longer grants either capability, and the corresponding legacy product plans are deactivated by migration.

## Architectural rule

Do not reintroduce generic project-management primitives into OTTO. If a workflow requires release planning, milestones, task assignment, calendar scheduling, collaboration or campaign execution, evaluate it as ReleaseFlow functionality or as an explicit future integration capability.
