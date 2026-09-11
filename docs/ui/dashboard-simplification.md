# Dashboard and workspace simplification

## Current product surface

The Dashboard is intentionally limited to operational catalog information. The following dashboard surfaces are hidden:

- Revenue
- Contract lifecycle
- Platform events
- Revenue-by-source chart

The Workspaces module is also hidden from primary navigation. The underlying implementation is retained for later evaluation; this is a product-surface decision, not a destructive removal of workspace code or data.

## Rationale

OTTO is being simplified around the capabilities that are currently operational and directly useful to users. Deferred or insufficiently authoritative modules should not occupy the primary product surface merely because implementation exists.

Artist Documents and Artist Financials are handled directly within the Artist workspace and do not depend on the removed dashboard surfaces.
