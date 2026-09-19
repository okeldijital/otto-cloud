# OTTO Cloud Architecture Audit

## Purpose

This document is the current architecture baseline for OTTO Cloud. It supersedes the earlier desktop-parity audit for product-scope decisions.

## Current OTTO Core customer surface

OTTO Core is the record-label operating system for:

- Catalog Management
- Documents
- Network
- Administration of Works
- Personal Settings
- Organization administration
- Platform administration for authorized platform administrators

The current Core shell explicitly excludes:

- AI
- Royalties
- generic project management
- Tasks
- Events / calendar
- Notes as a project-management primitive
- Workspaces
- Release planning / Release Workspace

Release planning and execution belong to the future ReleaseFlow product. OTTO should integrate with ReleaseFlow rather than recreate its project-management surface.

## Administration boundaries

### Settings

Settings is personal account configuration.

It contains profile/account information only. Organization administration and platform administration are separate surfaces.

### Organization

Organization Settings owns organization-scoped administration:

- membership
- invitations
- roles
- permissions
- organization security

### Admin Control

Admin Control is platform-authority-only and contains:

- Organizations
- Users
- Systems

Systems reports live application/database health. It does not implement database backup storage.

### Systems and backups

OTTO Cloud does not treat the Vercel application filesystem as durable backup storage.

Production database backups are an infrastructure responsibility. The Core application may report operational health, but backup artifacts must use a durable infrastructure service with an explicit retention and restore policy.

## Product entitlements

Core currently grants:

- catalog
- contracts.core
- documents

Network, Rights, Contracts OCR, and future optional capabilities remain separately entitled.

AI and Royalties are not part of the current Core customer surface.

The product entitlement database migration must be applied in production before the entitlement resolver can be considered operationally green.

## Documents

Documents remains a first-class Core capability and is not considered project management.

The Documents surface provides the central document repository, folders, attachments, upload/download and repository aggregation.

## Data preservation

Removing project-management functionality does not require destructive deletion of historical workspace/task/event/note data. Historical tables may remain available for future ReleaseFlow integration or controlled migration.

## Validation requirement

Before merging a meaningful architecture slice:

1. inspect the implementation and affected services;
2. validate the resulting diff;
3. verify CI/build status;
4. audit the production/preview runtime where possible;
5. update this document and the corresponding Notion architectural decision;
6. only then merge.
