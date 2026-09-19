# M2KR Artwork Recovery — Completed

**Status: CLOSED.** M2KR catalogue and artwork recovery was completed earlier and the recovered data is already present in the production database.

This document is retained as the deterministic recovery procedure and historical operational reference. It is **not** an outstanding migration or production recovery task. Do not rerun it against production unless a new, explicitly approved recovery operation is opened.

## Contract

The recovery procedure is deterministic:

1. Read the release spreadsheet.
2. Resolve each row to an existing M2KR release by exact `Release ID` first, then exact `Release Name`/`Release Title`/`Title`.
3. Resolve the spreadsheet attachment value to an existing R2 object by exact basename.
4. Refuse duplicate artwork basenames, duplicate release rows, missing releases, missing artwork, or an existing conflicting release attachment.
5. In `--apply` mode, create/update the release `Attachment` row and set `releases.cover_art_url` to the existing R2 object key.

The script never uploads, renames, or deletes R2 objects.

## Required environment

Use the same storage/database environment already used by Otto Cloud:

- `DATABASE_URL`
- `R2_BUCKET_NAME`
- `R2_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`

## Historical dry run

```bash
npx tsx scripts/recover-m2kr-artwork.ts --spreadsheet ./M2KR.xlsx
```

The script reports a deterministic plan and refuses to write when any row is unresolved.

## Historical apply

```bash
npx tsx scripts/recover-m2kr-artwork.ts --spreadsheet ./M2KR.xlsx --apply
```

Optional explicit columns are available when automatic header detection is not appropriate:

```bash
npx tsx scripts/recover-m2kr-artwork.ts \
  --spreadsheet ./M2KR.xlsx \
  --release-column "Release Name" \
  --artwork-column "Attachments" \
  --apply
```

Use `--prefix` when the artwork objects are stored under a known R2 prefix. Use `--replace-existing` only when an existing release attachment has been independently verified as the record to replace.

## Completion record

The production M2KR recovery has already been executed and the resulting catalogue/artwork data is present in OTTO Cloud.

- Recovery is closed.
- No new production recovery write is required by this document.
- Future contract recapture, Work reconciliation, new releases, or new assets are separate controlled work items.
- This procedure remains available for auditability and for any future, separately approved recovery operation.

