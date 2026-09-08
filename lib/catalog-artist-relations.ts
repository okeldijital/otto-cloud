import { prisma } from "@/lib/prisma";

export type CatalogArtistRelationEntity = "release" | "track";

function tableFor(entity: CatalogArtistRelationEntity) {
  return entity === "release" ? '"release_artists"' : '"track_artists"';
}

function idColumnFor(entity: CatalogArtistRelationEntity) {
  return entity === "release" ? '"release_id"' : '"track_id"';
}

/**
 * Canonical catalog artist relation access.
 * The public application contract remains artist_ids: number[], while persistence
 * is normalized in release_artists / track_artists.
 */
export async function getCatalogArtistIds(entity: CatalogArtistRelationEntity, entityId: number) {
  const table = tableFor(entity);
  const idColumn = idColumnFor(entity);
  const rows = await prisma.$queryRawUnsafe<Array<{ artist_id: number }>>(
    `SELECT artist_id FROM ${table} WHERE ${idColumn} = $1 ORDER BY position ASC`,
    entityId,
  );
  return rows.map((row) => row.artist_id);
}

export async function replaceCatalogArtistIds(
  entity: CatalogArtistRelationEntity,
  entityId: number,
  organizationId: string,
  artistIds: number[],
) {
  const uniqueArtistIds = [...new Set(artistIds)];
  if (uniqueArtistIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new Error("artist_ids must contain positive integer artist IDs");
  }

  if (uniqueArtistIds.length) {
    const artists = await prisma.artists.findMany({
      where: {
        id: { in: uniqueArtistIds },
        organization_id: organizationId,
        is_deleted: false,
      },
      select: { id: true },
    });
    if (artists.length !== uniqueArtistIds.length) {
      throw new Error("One or more artists are not accessible to this organization");
    }
  }

  const table = tableFor(entity);
  const idColumn = idColumnFor(entity);

  await prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(`DELETE FROM ${table} WHERE ${idColumn} = $1`, entityId);
    for (let position = 0; position < uniqueArtistIds.length; position += 1) {
      await tx.$executeRawUnsafe(
        `INSERT INTO ${table} (${idColumn}, "artist_id", "position") VALUES ($1, $2, $3)`,
        entityId,
        uniqueArtistIds[position],
        position,
      );
    }
  });

  return uniqueArtistIds;
}
