# OTTO Core Conformance

## Canonical baseline

OTTO Core is governed by the canonical baseline documented in Notion. The repository baseline for this cleanup is commit `38b02dcc295ec74972008c31ef9787fde3f75ce6`.

## Core boundary

OTTO Core must remain fully useful without AI, OCR, automated extraction, inference, recommendations, enrichment, or other metered intelligence services.

For Contracts, Core includes deterministic storage and viewing of the original document plus manual capture and maintenance of contract metadata, parties, assets, rights, terms, splits, amendments, lifecycle state, and evidence access.

## Application cleanup

This conformance slice removes the retired intelligence application surface:

- `/api/ai`
- dashboard `/ai` routes
- `lib/document-intelligence`
- `lib/verified-contract`
- legacy AI provider/audit runtime modules
- intelligence/verification-specific package test entry points
- AI navigation from the dashboard sidebar

The deterministic contract lifecycle and human-controlled verification/editing boundary remain part of Core.

## Database retention

Historical intelligence tables are intentionally **not dropped in this application cleanup commit**. They require a separately audited production migration because they may contain customer or historical records and may be referenced by existing migrations. Their presence does not expose an application capability and does not make intelligence a Core prerequisite.

A subsequent database-conformance migration should inventory usage, establish retention requirements, and only then remove obsolete intelligence schema/data where authorized.

## Infrastructure rule

No AI/OCR worker or intelligence deployment is part of the Core runtime. Future intelligence must be implemented as an optional extension consuming canonical Core records rather than becoming a prerequisite for Core workflows.
