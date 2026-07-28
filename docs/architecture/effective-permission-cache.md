# Effective Permission Cache

In-process session-scoped cache.

**Key:** `identityId:organizationId:membershipVersion:roleVersion:catalogVersion`

**Invalidate on:** role change, membership change, org switch, catalog bump.

Replace with Redis for multi-instance later.
