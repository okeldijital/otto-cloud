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

export type RightsReadinessInput = {
  hasArtists: boolean;
  artistCoverage: boolean;
  releaseCoverage: boolean;
  trackCoverage: boolean;
};

export type ReleaseArtworkInput = {
  attachmentExists: boolean;
  artworkUrl?: unknown;
  legacyCoverArtUrl?: unknown;
};

/** Release artwork may be represented by the current Attachment/Storage Service or legacy URL fields. */
export function hasReleaseArtwork(input: ReleaseArtworkInput): boolean {
  return (
    input.attachmentExists ||
    (typeof input.artworkUrl === "string" && input.artworkUrl.trim().length > 0) ||
    (typeof input.legacyCoverArtUrl === "string" && input.legacyCoverArtUrl.trim().length > 0)
  );
}

/**
 * Rights readiness is coverage-based rather than "any contract exists".
 *
 * A release is covered when:
 * - every associated artist has an active, organization-scoped contract
 *   relationship of `represents`, and
 * - either the release itself has an active `applies_to` contract or every
 *   track has an active `applies_to` contract.
 *
 * When no artist is associated with the release, artist coverage is not a
 * blocker. This preserves the existing release model while preventing an
 * unrelated or foreign contract from satisfying readiness.
 */
export function buildRightsReadiness(input: RightsReadinessInput): boolean {
  const artistCoverage = !input.hasArtists || input.artistCoverage;
  return artistCoverage && (input.releaseCoverage || input.trackCoverage);
}

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
  const legacyCoverArt = releaseRecord["cover_art_url"];
  const releaseDate = releaseRecord["release_date"];
  const artistIdsValue = releaseRecord["artist_ids"];

  const releaseAttachment = await prisma.attachment.findFirst({
    where: {
      organizationId: ctx.organizationId,
      entityType: "release",
      entityId: String(releaseId),
    },
    select: { id: true },
  });

  // Release artwork is stored through the universal Attachment/Storage Service by the release UI.
  // Legacy URL fields remain supported for compatibility with older releases.
  const hasArtwork = hasReleaseArtwork({
    attachmentExists: releaseAttachment !== null,
    artworkUrl: artwork,
    legacyCoverArtUrl: legacyCoverArt,
  });
  const hasReleaseDate =
    typeof releaseDate === "string" && !Number.isNaN(Date.parse(releaseDate));

  const trackIds = tracks.map((track) => track.id);

  const artistIds: number[] = [];
  if (release.artist_id) artistIds.push(release.artist_id);
  if (Array.isArray(artistIdsValue)) {
    artistIds.push(...artistIdsValue.filter((id): id is number => typeof id === "number"));
  }
  const uniqueArtistIds = [...new Set(artistIds)];
  const trackEntityIds = trackIds.map(String);
  const artistEntityIds = uniqueArtistIds.map(String);

  const [releaseRelationships, trackRelationships, artistRelationships] = await Promise.all([
    prisma.contractRelationship.findMany({
      where: {
        organizationId: ctx.organizationId,
        targetEntityType: "release",
        targetEntityId: String(releaseId),
        relationshipType: "applies_to",
        status: "active",
      },
      select: { contractId: true },
    }),
    trackEntityIds.length > 0
      ? prisma.contractRelationship.findMany({
          where: {
            organizationId: ctx.organizationId,
            targetEntityType: "track",
            targetEntityId: { in: trackEntityIds },
            relationshipType: "applies_to",
            status: "active",
          },
          select: { contractId: true, targetEntityId: true },
        })
      : Promise.resolve([] as Array<{ contractId: number; targetEntityId: string }>),
    artistEntityIds.length > 0
      ? prisma.contractRelationship.findMany({
          where: {
            organizationId: ctx.organizationId,
            targetEntityType: "artist",
            targetEntityId: { in: artistEntityIds },
            relationshipType: "represents",
            status: "active",
          },
          select: { contractId: true, targetEntityId: true },
        })
      : Promise.resolve([] as Array<{ contractId: number; targetEntityId: string }>),
  ]);

  const contractIds = [
    ...new Set([
      ...releaseRelationships.map((r) => r.contractId),
      ...trackRelationships.map((r) => r.contractId),
      ...artistRelationships.map((r) => r.contractId),
    ]),
  ];

  const verifiedContracts =
    contractIds.length > 0
      ? await prisma.verifiedContract.findMany({
          where: {
            organizationId: ctx.organizationId,
            contractId: { in: contractIds },
            isCurrent: true,
            status: "active",
          },
          select: { contractId: true, extractionId: true },
        })
      : [];

  const extractionIds = verifiedContracts.map((v) => v.extractionId).filter(Boolean);
  const verifiedTerms =
    extractionIds.length > 0
      ? await prisma.verifiedField.findMany({
          where: {
            organizationId: ctx.organizationId,
            extractionId: { in: extractionIds },
            fieldKey: "term",
            decision: { in: ["accepted", "edited"] },
          },
          select: { extractionId: true },
        })
      : [];

  const readyContractIds = new Set(
    verifiedContracts
      .filter((v) => verifiedTerms.some((term) => term.extractionId === v.extractionId))
      .map((v) => v.contractId)
  );

  const releaseCoverage = releaseRelationships.some((r) => readyContractIds.has(r.contractId));

  const coveredTracks = new Set(
    trackRelationships
      .filter((r) => readyContractIds.has(r.contractId))
      .map((r) => r.targetEntityId)
  );
  const trackCoverage =
    trackIds.length > 0 && trackIds.every((id) => coveredTracks.has(String(id)));

  const coveredArtists = new Set(
    artistRelationships
      .filter((r) => readyContractIds.has(r.contractId))
      .map((r) => r.targetEntityId)
  );
  const artistCoverage =
    uniqueArtistIds.length === 0 ||
    uniqueArtistIds.every((id) => coveredArtists.has(String(id)));

  const rights = buildRightsReadiness({
    hasArtists: uniqueArtistIds.length > 0,
    artistCoverage,
    releaseCoverage,
    trackCoverage,
  });

  const blockers: string[] = [];
  if (!metadata.valid) blockers.push("Required release metadata is incomplete or invalid.");
  if (tracks.length === 0) blockers.push("At least one track must be assigned to the release.");
  if (!hasArtwork) blockers.push("Artwork is required before the release can be marked ready.");
  if (!hasReleaseDate) blockers.push("A valid release date is required before the release can be marked ready.");
  if (!rights) blockers.push("Rights/ownership evidence is required for the release and its associated artists/tracks.");

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
