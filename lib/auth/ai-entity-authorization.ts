import { prisma } from "@/lib/prisma";
import type { OrganizationContext } from "@/lib/auth/organization-context";
import {
  ResourceAuthError,
  requireAIContractDocumentInOrg,
  requireArtistInOrg,
  requireContractInOrg,
  requirePlaylistInOrg,
  requirePositiveIntId,
  requireReleaseInOrg,
  requireRoyaltyInOrg,
  requireTrackInOrg,
  requireWorkInOrg,
} from "@/lib/auth/resource-authorization";

export async function requireAIEntityInOrg(entityTypeRaw: unknown, entityIdRaw: unknown, ctx: OrganizationContext) {
  const entityType = String(entityTypeRaw ?? "").trim().toLowerCase();
  const entityId = requirePositiveIntId(entityIdRaw, "entity_id");
  if (!entityType) throw new ResourceAuthError("entity_type is required", 400, "VALIDATION_ERROR");

  switch (entityType) {
    case "artist": case "artists": await requireArtistInOrg(entityId, ctx); break;
    case "release": case "releases": await requireReleaseInOrg(entityId, ctx); break;
    case "work": case "works": await requireWorkInOrg(entityId, ctx); break;
    case "track": case "tracks": await requireTrackInOrg(entityId, ctx); break;
    case "contract": case "contracts": await requireContractInOrg(entityId, ctx); break;
    case "ai_contract_document": case "ai_contract_documents": case "contract_document": case "contract_documents": await requireAIContractDocumentInOrg(entityId, ctx); break;
    case "royalty": case "royalties": await requireRoyaltyInOrg(entityId, ctx); break;
    case "playlist": case "playlists": await requirePlaylistInOrg(entityId, ctx); break;
    case "document": case "documents": {
      const row = await prisma.documents.findFirst({ where: { id: entityId, organization_id: ctx.organizationId }, select: { id: true } });
      if (!row) throw new ResourceAuthError("Document not found", 404, "NOT_FOUND");
      break;
    }
    default: throw new ResourceAuthError("Unsupported entity_type", 400, "VALIDATION_ERROR");
  }
  return { entityType, entityId };
}
