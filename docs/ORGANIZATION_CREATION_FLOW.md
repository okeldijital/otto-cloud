# Organization Creation Flow

## UX contract

Creating an organization is a first-class workspace action exposed from the organization switcher.

The creation flow should:

- ask only for the organization name;
- explain that the new organization is a separate tenant/workspace;
- make the authenticated user the owner through the canonical IAM service;
- refresh the membership list after creation;
- activate the newly created organization immediately;
- refresh the dashboard so client-side tenant-scoped loaders mount against the new organization;
- surface creation or activation failures without silently dismissing the form.

## Architecture

```text
OrganizationSwitcher
        ↓
CreateOrganizationModal
        ↓
OrgContext.createOrganization()
        ↓
POST /api/auth/organizations
        ↓
canonical OrganizationService
        ↓
owner membership + system roles
        ↓
refresh memberships
        ↓
POST /api/auth/organizations/switch
        ↓
active IAM organization
        ↓
router.refresh()
```

The organization API remains the source of truth for creation. The client does not construct organization records or memberships itself.

## Tenant boundary

A newly created organization must begin with its own membership and empty tenant-scoped data. Activation must occur through the same canonical organization-switching path used for existing organizations so the authenticated request context and client UI remain aligned.
