import { prisma } from "@/lib/prisma";
import { requireReleaseInOrg, ResourceAuthError } from "@/lib/auth/resource-authorization";
import type { OrganizationContext } from "@/lib/auth/organization-context";

export type SecondaryReleaseInput = number[];

export function normalizeSecondaryReleaseIds(value: unknown, primaryReleaseId?: number | null): number[] {
  if (!Array.isArray(value)) throw new ResourceAuthError("secondary_release_ids must be an array of release IDs", 400, "VALIDATION_ERROR");
  const ids = value.map((raw) => {
    if (!Number.isInteger(raw) || (raw as number) <= 0) {
      throw new ResourceAuthError("secondary_release_ids must contain positive integer release IDs", 400, "VALIDATION_ERROR");
    }
    return raw as number;
  });
  const unique = [...new Set(ids)];
  if (primaryReleaseId != null && unique.includes(primaryReleaseId)) {
    throw new ResourceAuthError("The primary release cannot also be a secondary release", 400, "RELATIONSHIP_CONFLICT");
  }
  return unique;
}

export async function validateReleaseIdsInOrg(ids: number[], ctx: OrganizationContext): Promise<void> {
  for (const releaseId of ids) await requireReleaseInOrg(releaseId, ctx);
}

export async function replaceTrackSecondaryReleases(
  trackId: number,
  secondaryReleaseIds: unknown,
  primaryReleaseId: number | null | undefined,
  ctx: OrganizationContext,
): Promise<number[]> {
  const ids = normalizeSecondaryReleaseIds(secondaryReleaseIds, primaryReleaseId);
  await validateReleaseIdsInOrg(ids, ctx);

  await prisma.$transaction(async (tx) => {
    await tx.track_releases.deleteMany({ where: { track_id: trackId } });
    if (ids.length) {
      await tx.track_releases.createMany({
        data: ids.map((releaseId) => ({ track_id: trackId, release_id: releaseId })),
      });
    }
  });

  return ids;
}

/**
 * Apply primary and secondary release changes atomically.
 * `tracks.release_id` is the primary relationship; `track_releases` contains
 * only secondary relationships. Secondary replacement never changes primary.
 */
export async function setTrackReleaseRelations(
  trackId: number,
  primaryReleaseId: number | null,
  secondaryReleaseIds: unknown,
  ctx: OrganizationContext,
): Promise<number[]> {
  if (primaryReleaseId !== null) await requireReleaseInOrg(primaryReleaseId, ctx);
  const secondaryIds = normalizeSecondaryReleaseIds(secondaryReleaseIds, primaryReleaseId);
  await validateReleaseIdsInOrg(secondaryIds, ctx);

  await prisma.$transaction(async (tx) => {
    await tx.tracks.update({
      where: { id: trackId },
      data: { release_id: primaryReleaseId, tenant_id: ctx.organizationId },
    });
    await tx.track_releases.deleteMany({ where: { track_id: trackId } });
    if (secondaryIds.length) {
      await tx.track_releases.createMany({
        data: secondaryIds.map((releaseId) => ({ track_id: trackId, release_id: releaseId })),
      });
    }
  });

  return secondaryIds;
}
