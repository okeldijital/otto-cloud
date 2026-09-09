/**
 * Organization-scoped Label relationship contract.
 *
 * Labels are organization-owned catalogue entities. Related catalog rows
 * (artists, releases) MUST be filtered to the active organization, and the
 * database enforces the same organization boundary through composite FKs.
 */

export type LabelCatalogRelation = "artists" | "releases";

export function parsePositiveIntId(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!/^\d+$/.test(value)) return null;
  const id = Number.parseInt(value, 10);
  return id > 0 ? id : null;
}

export function labelRelatedCatalogWhere(
  relation: LabelCatalogRelation,
  labelId: number,
  organizationId: string
): {
  label_id: number;
  organization_id: string;
  is_deleted: boolean;
} {
  if (!Number.isInteger(labelId) || labelId <= 0) {
    throw new Error("labelId must be a positive integer");
  }
  if (!organizationId) {
    throw new Error("organizationId is required for Label relation queries");
  }
  if (relation !== "artists" && relation !== "releases") {
    throw new Error("Unsupported Label catalog relation");
  }
  return {
    label_id: labelId,
    organization_id: organizationId,
    is_deleted: false,
  };
}
