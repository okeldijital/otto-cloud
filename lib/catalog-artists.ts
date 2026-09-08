import { prisma } from "@/lib/prisma";

export async function getReleaseArtistIds(releaseId: number): Promise<number[]> {
  const rows = await prisma.$queryRaw<Array<{ artist_id: number }>>`
    SELECT artist_id FROM release_artists WHERE release_id = ${releaseId} ORDER BY position ASC
  `;
  return rows.map((row) => row.artist_id);
}

export async function getTrackArtistIds(trackId: number): Promise<number[]> {
  const rows = await prisma.$queryRaw<Array<{ artist_id: number }>>`
    SELECT artist_id FROM track_artists WHERE track_id = ${trackId} ORDER BY position ASC
  `;
  return rows.map((row) => row.artist_id);
}

export async function replaceReleaseArtists(releaseId: number, artistIds: number[]) {
  const ids = [...new Set(artistIds)];
  await prisma.$transaction(async (tx) => {
    if (ids.length) {
      const artists = await tx.artists.findMany({ where: { id: { in: ids } }, select: { id: true } });
      if (artists.length !== ids.length) throw new Error("One or more artist IDs are invalid.");
    }
    await tx.$executeRaw`DELETE FROM release_artists WHERE release_id = ${releaseId}`;
    for (let i = 0; i < ids.length; i++) {
      await tx.$executeRaw`INSERT INTO release_artists (release_id, artist_id, position) VALUES (${releaseId}, ${ids[i]}, ${i + 1})`;
    }
  });
  return ids;
}

export async function replaceTrackArtists(trackId: number, artistIds: number[]) {
  const ids = [...new Set(artistIds)];
  await prisma.$transaction(async (tx) => {
    if (ids.length) {
      const artists = await tx.artists.findMany({ where: { id: { in: ids } }, select: { id: true } });
      if (artists.length !== ids.length) throw new Error("One or more artist IDs are invalid.");
    }
    await tx.$executeRaw`DELETE FROM track_artists WHERE track_id = ${trackId}`;
    for (let i = 0; i < ids.length; i++) {
      await tx.$executeRaw`INSERT INTO track_artists (track_id, artist_id, position) VALUES (${trackId}, ${ids[i]}, ${i + 1})`;
    }
  });
  return ids;
}
