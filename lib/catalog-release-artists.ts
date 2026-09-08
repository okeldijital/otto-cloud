import { getCatalogArtistIds } from "@/lib/catalog-artist-relations";

/**
 * Canonical Release -> Artist read path for API compatibility.
 * The public contract remains artist_ids: number[].
 */
export async function getReleaseArtistIds(releaseId: number) {
  return getCatalogArtistIds("release", releaseId);
}
