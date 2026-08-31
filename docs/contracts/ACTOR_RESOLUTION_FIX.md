# Contract Intelligence Actor Resolution

## Status

Runtime acceptance identified a contract-intake failure: `No active legacy contract actor is mapped to the authenticated user`.

## Root cause

`users.email` is globally unique, while `users.organization_id` is a UUID compatibility field. The Contract Intelligence actor lookup was incorrectly constraining the email lookup by the current catalog organization UUID. That UUID can legitimately differ from the value stored on the legacy `users` row, causing a valid authenticated user to resolve to actor `0`.

## Resolution rule

The actor is resolved server-side from the authenticated IAM session email using the unique `users.email` field. Organization authorization remains controlled by IAM membership; the legacy lookup is only an actor compatibility mapping for tables that require `users.id`.

Never accept a client-supplied actor ID and never use a hard-coded fallback user.
