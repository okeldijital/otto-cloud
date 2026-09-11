# Artist Workspace Simplification

## Purpose

The Artist detail page is an operational workspace. Users should not need Contracts, Office, Royalties, or other deferred modules to maintain basic artist records.

## Documents

Artist-related documents are attached directly to the Artist. Examples include identification, proof of payment, advance support, tax records, and other supporting files. This uses the existing organization-scoped attachment/storage service.

## Financials

Artist financial records are maintained directly on the Artist. The first supported record types are advances, payments, expenses, and other operational records. Records are organization- and artist-scoped and totals are separated by currency.

No contract-derived financial mapping is required for the Artist workspace.

## Commercial navigation

The Artist workspace remains part of the Catalog/Core experience. Core navigation must remain visible even when the commercial-entitlement API is temporarily unavailable during entitlement infrastructure bootstrap. Premium modules remain entitlement-driven.
