import { prisma } from "@/lib/prisma";
import { validateReleaseMetadata } from "@/lib/releases/validation";
import { trackOrgScopeWhere } from "@/lib/auth/resource-authorization";
import type { OrganizationContext } from "@/lib/auth/organization-context";

export type ReleaseReadiness = {
  ready: boolean;
  blockers: string[];
  checks: {
    metadata: boolean;
    trackList: boolean;
    artwork: boolean;
    releaseDate: boolean;
    rights: boolean;
  };
};

export async function evaluateReleaseReadiness(
  releaseId: number,
  ctx: OrganizationContext
): Promise<ReleaseReadiness | null> {
  const release = await prisma.releases.findFirst({
    where: { id: releaseId, organization_id: ctx.organizationId, is_deleted: false },
  });
  if (!release) return null;

  const releaseRecord = release as unknown as Record<string, unknown>;
  const metadata = validateReleaseMetadata(releaseRecord, "update");
  const tracks = await prisma.tracks.findMany({
    where: { release_id: releaseId, ...(trackOrgScopeWhere(ctx) as object) },
    select: { id: true },
  });

  const artwork = releaseRecord["artwork_url"];
  const releaseDate = releaseRecord["release_date"];
  const artistIdsValue = releaseRecord["artist_ids"];

  const hasArtwork = typeof artwork === "string" && artwork.trim().length > 0;
  const hasReleaseDate =
    typeof releaseDate === "string" && !Number.isNaN(Date.parse(releaseDate));

  const trackIds = tracks.map((track) => track.id);
  const hasReleaseContract = !!(await prisma.contract_assets.findFirst({
    where: { asset_type: "Release", asset_id: releaseId },
  }));
  const hasTrackContract = trackIds.length > 0 && !!(await prisma.contract_assets.findFirst({
    where: { asset_type: "Track", asset_id: { in: trackIds } },
  }));

  const artistIds: number[] = [];
  if (release.artist_id) artistIds.push(release.artist_id);
  if (Array.isArray(artistIdsValue)) {
    artistIds.push(...artistIdsValue.filter((id): id is number => typeof id === "number"));
  }

  const hasArtistContract =
    artistIds.length > 0 &&
    !!(await prisma.contract_parties.findFirst({
      where: { entity_type: "Artist", entity_id: { in: artistIds } },
    }));
  const rights =
    hasReleaseContract || hasTrackContract || (artistIds.length === 0 ? true : hasArtistContract);

  const blockers: string[] = [];
  if (!metadata.valid) blockers.push("Required release metadata is incomplete or invalid.");
  if (tracks.length === 0) blockers.push("At least one track must be assigned to the release.");
  if (!hasArtwork) blockers.push("Artwork is required before the release can be marked ready.");
  if (!hasReleaseDate) blockers.push("A valid release date is required before the release can be marked ready.");
  if (!rights) blockers.push("Rights/ownership evidence is required for the release or its associated artist/tracks.");

  return {
    ready: blockers.length === 0,
    blockers,
    checks: {
      metadata: metadata.valid,
      trackList: tracks.length > 0,
      artwork: hasArtwork,
      releaseDate: hasReleaseDate,
      rights,
    },
  };
}
