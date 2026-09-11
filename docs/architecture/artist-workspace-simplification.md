# Artist Workspace Simplification

The Artist detail page is an operational workspace. Users should not need deferred modules to maintain basic artist records.

## Documents
Artist-related documents are attached directly to the Artist using the existing organization-scoped attachment/storage service.

## Financials
Artist financial records are maintained directly on the Artist. Supported record types are advances, payments, expenses, and other operational records. Records are organization- and artist-scoped and totals are separated by currency.

No contract-derived financial mapping is required for the Artist workspace.

## Commercial navigation
The Artist workspace remains part of the Catalog/Core experience. Core navigation is restored in the sidebar and remains visible when the commercial-entitlement endpoint is temporarily unavailable during entitlement infrastructure bootstrap. Premium modules remain entitlement-driven when entitlement data is available.
