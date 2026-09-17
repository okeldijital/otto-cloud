# M2KR Artwork Recovery

`recover-m2kr-artwork.ts` links already-uploaded M2KR release artwork in Cloudflare R2 to the existing release records.

## Contract

The recovery is deterministic:

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

## Dry run

```bash
npx tsx scripts/recover-m2kr-artwork.ts --spreadsheet ./M2KR.xlsx
```

The script must report a complete deterministic plan with zero skipped/unresolved rows before it can write anything.

## Apply

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

## Current database observation

The production Neon database currently contains **81 non-deleted releases** under the M2KR IAM organization `6e3b659b-f14e-484e-8ee4-a020cd4c502a`. Those releases currently have no release-scoped rows in the `attachments` table, while their legacy `cover_art_url` values point at older `assets/<uuid>.<ext>` keys. This makes the new attachment link the appropriate recovery target.
