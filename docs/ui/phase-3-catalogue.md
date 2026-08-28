# OTTO UI — Phase 3 Catalogue

## Scope

Establish the reusable catalogue-screen presentation pattern beginning with `/catalog/artists`.

## Design source

OTTO Brand System — Direction A / Signal.

## Requirements

- Preserve existing authentication, routing, data access and authorization.
- Use the existing application shell.
- Dark-first surfaces and restrained cyan accent.
- Catalogue page header, search/filter controls, list/table presentation, empty/loading/error states and row interaction must form a reusable pattern.
- Do not introduce new styling dependencies.
- Do not invent domain fields; use the existing artist data model and route implementation.
- Validate the implementation before propagating the pattern to other catalogue screens.

## Gate

`/catalog/artists` is the reference implementation for subsequent catalogue screens. No broader catalogue rollout until the reference screen passes build and browser verification.
