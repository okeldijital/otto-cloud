import { prisma } from "@/lib/prisma";
import { validateReleaseMetadata } from "@/lib/releases/validation";

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
  organizationId: string
): Promise<ReleaseReadiness | null> {
  const release = await prisma.releases.findFirst({
    where: { id: releaseId, organization_id: organizationId, is_deleted: false },
  });
  if (!release) return null;

  const metadata = validateReleaseMetadata(release as unknown as Record<string, unknown>, "update");
  const tracks = await prisma.tracks.findMany({
    where: { release_id: releaseId, organization_id: organizationId },
    select: { id: true },
  });

  const hasArtwork = typeof release.artwork_url === "string" && release.artwork_url.trim().length > 0;
  const hasReleaseDate = typeof release.release_date === "string" && !Number.isNaN(Date.parse(release.release_date));

  const trackIds = tracks.map((track) => track.id);
  const hasReleaseContract = !!(await prisma.contract_assets.findFirst({
    where: { asset_type: "Release", asset_id: releaseId },
  }));
  const hasTrackContract = trackIds.length > 0 && !!(await prisma.contract_assets.findFirst({
    where: { asset_type: "Track", asset_id: { in: trackIds } },
  }));
  const artistIds: number[] = [];
  if (release.artist_id) artistIds.push(release.artist_id);
  if (Array.isArray(release.artist_ids)) artistIds.push(...(release.artist_ids as number[]));
  const hasArtistContract = artistIds.length > 0 && !!(await prisma.contract_parties.findFirst({
    where: { entity_type: "Artist", entity_id: { in: artistIds } },
  }));
  const rights = hasReleaseContract || hasTrackContract || (artistIds.length === 0 ? true : hasArtistContract);

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
