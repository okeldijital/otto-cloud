import { prisma } from "@/lib/prisma";

export type StatusQueueSeverity = "critical" | "warning";

export type StatusQueueItem = {
  id: string;
  severity: StatusQueueSeverity;
  entityType: string;
  entityId: string;
  entityTitle: string;
  issueType: string;
  summary: string;
  href: string;
};

type QueueRow = {
  issue_type: string;
  severity: StatusQueueSeverity;
  entity_type: string;
  entity_id: string;
  entity_title: string;
  summary: string;
  href: string;
};

export async function getStatusQueue(organizationId: string): Promise<StatusQueueItem[]> {
  const rows = await prisma.$queryRaw<QueueRow[]>`
    WITH release_track_counts AS (
      SELECT r.id, COUNT(t.id)::int AS track_count
      FROM releases r
      LEFT JOIN tracks t ON t.release_id = r.id
      WHERE r.organization_id = ${organizationId}
      GROUP BY r.id
    ),
    release_artist_counts AS (
      SELECT r.id, COUNT(ra.artist_id)::int AS artist_count
      FROM releases r
      LEFT JOIN release_artists ra ON ra.release_id = r.id
      WHERE r.organization_id = ${organizationId}
      GROUP BY r.id
    ),
    release_contract_counts AS (
      SELECT r.id, COUNT(cr.id)::int AS contract_count
      FROM releases r
      LEFT JOIN contract_relationships cr
        ON cr."targetEntityType" = 'release'
       AND cr."targetEntityId" = r.id::text
       AND cr."relationshipType" = 'applies_to'
       AND cr.status = 'active'
       AND cr."organizationId" = r.organization_id::uuid
      WHERE r.organization_id = ${organizationId}
      GROUP BY r.id
    ),
    contract_link_counts AS (
      SELECT c.id, COUNT(cr.id)::int AS link_count
      FROM contracts c
      LEFT JOIN contract_relationships cr
        ON cr.contractId = c.id
       AND cr."organizationId" = ${organizationId}::uuid
       AND cr.status = 'active'
      WHERE c.organization_id = ${organizationId}
      GROUP BY c.id
    )
    SELECT
      'release.missing_tracks' AS issue_type,
      'critical'::text AS severity,
      'release' AS entity_type,
      r.id::text AS entity_id,
      r.title AS entity_title,
      'Release has no tracks attached.' AS summary,
      '/catalog/releases/' || r.id::text AS href
    FROM releases r
    JOIN release_track_counts rtc ON rtc.id = r.id
    WHERE r.organization_id = ${organizationId}
      AND rtc.track_count = 0

    UNION ALL

    SELECT
      'release.missing_artists',
      'critical'::text,
      'release',
      r.id::text,
      r.title,
      'Release has no artist relationship.',
      '/catalog/releases/' || r.id::text
    FROM releases r
    JOIN release_artist_counts rac ON rac.id = r.id
    WHERE r.organization_id = ${organizationId}
      AND rac.artist_count = 0

    UNION ALL

    SELECT
      'release.missing_contract',
      'critical'::text,
      'release',
      r.id::text,
      r.title,
      'Release has no active contract relationship.',
      '/catalog/releases/' || r.id::text
    FROM releases r
    JOIN release_contract_counts rcc ON rcc.id = r.id
    WHERE r.organization_id = ${organizationId}
      AND rcc.contract_count = 0

    UNION ALL

    SELECT
      'track.unassigned_release',
      'warning'::text,
      'track',
      t.id::text,
      t.title,
      'Track has no primary release relationship.',
      '/catalog/tracks/' || t.id::text
    FROM tracks t
    WHERE t.organization_id = ${organizationId}
      AND t.release_id IS NULL

    UNION ALL

    SELECT
      'contract.unlinked',
      'warning'::text,
      'contract',
      c.id::text,
      COALESCE(c.title, 'Contract #' || c.id::text),
      'Contract has no active relationship to a catalog entity.',
      '/contracts/' || c.id::text
    FROM contracts c
    JOIN contract_link_counts clc ON clc.id = c.id
    WHERE c.organization_id = ${organizationId}
      AND clc.link_count = 0

    ORDER BY
      CASE severity WHEN 'critical' THEN 0 ELSE 1 END,
      entity_type,
      entity_title
  `;

  return rows.map((row) => ({
    ...row,
    id: `${row.issue_type}:${row.entity_type}:${row.entity_id}`,
  }));
}

export function summarizeStatusQueue(items: StatusQueueItem[]) {
  return {
    total: items.length,
    critical: items.filter((item) => item.severity === "critical").length,
    warning: items.filter((item) => item.severity === "warning").length,
    entities: new Set(items.map((item) => `${item.entityType}:${item.entityId}`)).size,
  };
}