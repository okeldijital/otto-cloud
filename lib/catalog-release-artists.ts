import { getCatalogArtistIds } from "@/lib/catalog-artist-relations";
import { prisma } from "@/lib/prisma";

/**
 * Canonical Release -> Artist read path for API compatibility.
 * The public contract remains artist_ids: number[].
 * During migration, legacy release artist fields remain a read fallback until
 * all existing records have been synchronized into release_artists.
 */
export async function getReleaseArtistIds(releaseId: number) {
  const artistIds = await getCatalogArtistIds("release", releaseId);
  if (artistIds.length) return artistIds;

  const release = await prisma.releases.findUnique({
    where: { id: releaseId },
    select: { artist_id: true, artist_ids: true },
  });
  const legacyIds: number[] = [];
  if (release?.artist_id) legacyIds.push(release.artist_id);
  if (Array.isArray(release?.artist_ids)) legacyIds.push(...(release.artist_ids as number[]));
  return [...new Set(legacyIds)];
}
