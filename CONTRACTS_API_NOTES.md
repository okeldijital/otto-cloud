# Contracts API Notes (2026-02-02)

- **Document primary flag**: `PATCH /api/contracts/:id/documents/:doc_id/make-primary` is not implemented. UI treats the latest version as primary until backend adds flag.
- **Splits editing**: Split groups and splits are live; ensure org scoping is enforced server-side for every mutation.
- **Activation guard**: Backend blocks status `Active` when no documents exist; keep this behavior aligned with UI.
