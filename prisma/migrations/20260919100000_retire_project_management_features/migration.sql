-- Retire project-management and calendar capabilities from OTTO.
--
-- Historical workspace/event/task tables remain intact for data preservation
-- and future ReleaseFlow integration. They are no longer product capabilities
-- exposed by OTTO.

UPDATE "product_plans"
SET "features" = (
  SELECT COALESCE(jsonb_agg(feature ORDER BY feature), '[]'::jsonb)
  FROM (
    SELECT feature
    FROM jsonb_array_elements_text("features") AS feature
    WHERE feature NOT IN ('office', 'workspace')
    UNION
    SELECT 'documents'
  ) AS retained_features
)
WHERE "key" = 'OTTO_CORE';

UPDATE "product_plans"
SET "active" = false
WHERE "key" IN ('OTTO_OFFICE', 'OTTO_WORKSPACE');
