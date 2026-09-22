/*
  IAM organization-role scope hardening.

  This migration repairs existing tenant/role drift before enforcing the
  database invariant that a membership role must belong to the same tenant.
*/

-- Backfill any organization missing one or more canonical system roles.
-- The organization with the largest canonical role set is used only as the
-- source of role definitions and role-permission mappings; no user data is
-- copied between organizations.
WITH template_org AS (
  SELECT "organizationId"
  FROM iam_roles
  WHERE "organizationId" IS NOT NULL
  GROUP BY "organizationId"
  ORDER BY COUNT(*) DESC
  LIMIT 1
),
inserted_roles AS (
  INSERT INTO iam_roles (
    id, "organizationId", key, name, description, "isSystem", "createdAt", "updatedAt"
  )
  SELECT
    gen_random_uuid(),
    o.id,
    template.key,
    template.name,
    template.description,
    template."isSystem",
    NOW(),
    NOW()
  FROM iam_organizations o
  CROSS JOIN iam_roles template
  JOIN template_org t ON t."organizationId" = template."organizationId"
  WHERE NOT EXISTS (
    SELECT 1
    FROM iam_roles existing
    WHERE existing."organizationId" = o.id
      AND existing.key = template.key
  )
  RETURNING id, "organizationId", key
)
INSERT INTO iam_role_permissions (id, "roleId", "permissionId")
SELECT
  gen_random_uuid(),
  inserted.id,
  rp."permissionId"
FROM inserted_roles inserted
JOIN template_org t ON TRUE
JOIN iam_roles template
  ON template."organizationId" = t."organizationId"
 AND template.key = inserted.key
JOIN iam_role_permissions rp ON rp."roleId" = template.id
ON CONFLICT ("roleId", "permissionId") DO NOTHING;

-- Repair memberships that reference a role owned by a different organization.
-- The role key is preserved; the target organization receives its own role row.
UPDATE iam_organization_memberships m
SET "roleId" = target.id,
    "membershipVersion" = m."membershipVersion" + 1,
    "updatedAt" = NOW()
FROM iam_roles source, iam_roles target
WHERE m."roleId" = source.id
  AND target."organizationId" = m."organizationId"
  AND target.key = source.key
  AND source."organizationId" IS DISTINCT FROM m."organizationId";

-- Repair owner identity pointers where the membership record is the existing
-- source of truth and there is exactly one active owner membership.
WITH owner_candidates AS (
  SELECT
    m."organizationId",
    MIN(m."identityId"::text)::uuid AS "identityId"
  FROM iam_organization_memberships m
  WHERE m.status = 'active' AND m."isOwner" = TRUE
  GROUP BY m."organizationId"
  HAVING COUNT(*) = 1
)
UPDATE iam_organizations o
SET "ownerIdentityId" = c."identityId",
    "updatedAt" = NOW()
FROM owner_candidates c
WHERE o.id = c."organizationId"
  AND o."ownerIdentityId" IS NULL;

-- The canonical model now requires every role to belong to an organization.
ALTER TABLE iam_roles
  ALTER COLUMN "organizationId" SET NOT NULL;

-- The membership role relationship is tenant-scoped, not globally scoped.
CREATE UNIQUE INDEX IF NOT EXISTS "uq_iam_role_org_id"
  ON iam_roles (id, "organizationId");

ALTER TABLE iam_organization_memberships
  DROP CONSTRAINT IF EXISTS "iam_organization_memberships_roleId_fkey";

ALTER TABLE iam_organization_memberships
  ALTER COLUMN "roleId" SET NOT NULL;

ALTER TABLE iam_organization_memberships
  ADD CONSTRAINT "iam_organization_memberships_role_org_fkey"
  FOREIGN KEY ("roleId", "organizationId")
  REFERENCES iam_roles (id, "organizationId")
  ON DELETE RESTRICT
  ON UPDATE NO ACTION;
