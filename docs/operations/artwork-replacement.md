# OTTO Cloud — Artwork Replacement Architecture

**Status:** Implemented  
**Date:** 2026-09-20

## Problem

Entity artwork and generic attachments previously shared the `attachments` table without an explicit asset purpose. Image attachments uploaded as screenshots or documents could therefore be selected as release artwork when the newest image was resolved.

## Contract

- `purpose=artwork` identifies artwork.
- `purpose=attachment` identifies ordinary attachments/documents.
- Artwork uploads must pass `uploadPurpose: "artwork"`.
- Replacing artwork uploads and verifies the new object first, creates the new attachment, removes prior artwork attachment rows, then attempts storage-object cleanup.
- Ordinary attachments are never removed by artwork replacement.
- Legacy image attachments use a conservative fallback that excludes screenshot-named files until their data is reconciled.

## Failure handling

The new artwork is committed before old storage objects are removed. Failure to delete an old R2 object does not invalidate the new artwork; the failure is logged for later storage reconciliation.

## Production migration

Migration: `20260920190000_attachment_purpose_artwork_replacement`

The migration adds `attachments.purpose` with a default of `attachment` and an entity/purpose index. It does not delete or rewrite existing attachment data.

## Operational rule

Do not resolve entity artwork by `category=image` alone. Artwork selection must use the explicit purpose contract, with the legacy fallback only for pre-purpose records.
