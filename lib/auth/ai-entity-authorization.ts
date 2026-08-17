import type { OrganizationContext } from "@/lib/auth/organization-context";
import {
  requireAIContractDocumentInOrg,
  requireArtistInOrg,
  requireContractInOrg,
  requirePositiveIntId,
  requirePlaylistInOrg,
  requireReleaseInOrg,
  requireRoyaltyInOrg,
  requireTrackInOrg,
  requireWorkInOrg,
} from "@/lib/auth/resource-authorization";

/**
 * Validate an AI-provided entity reference against the active organization.
 *
 * AI workflows accept entity_type/entity_id pairs from the client. Those pairs
 * are data references, not authorization. Every supported numeric entity is
 * resolved through the canonical org-bound resource helper before it can be
 * persisted. Unknown types and foreign/non-existent ids fail closed.
 */
export async function requireAIEntityInOrg(
  entityTypeRaw: unknown,
  entityIdRaw: unknown,
  ctx: OrganizationContext
): Promise<{ entityType: string; entityId: number }> {
  const entityType = String(entityTypeRaw ?? "").trim().toLowerCase();
  if (!entityType) {
    throw new Error("VALIDATION_ERROR: entity_type is required");
  }

  const entityId = requirePositiveIntId(entityIdRaw, "entity_id");

  switch (entityType) {
    case "artist":
    case "artists":
      await requireArtistInOrg(entityId, ctx);
      break;
    case "release":
    case "releases":
      await requireReleaseInOrg(entityId, ctx);
      break;
    case "work":
    case "works":
      await requireWorkInOrg(entityId, ctx);
      break;
    case "track":
    case "tracks":
      await requireTrackInOrg(entityId, ctx);
      break;
    case "contract":
    case "contracts":
      await requireContractInOrg(entityId, ctx);
      break;
    case "contract_document":
    case "contract_documents":
    case "ai_contract_document":
    case "ai_contract_documents":
      await requireAIContractDocumentInOrg(entityId, ctx);
      break;
    case "royalty":
    case "royalties":
      await requireRoyaltyInOrg(entityId, ctx);
      break;
    case "playlist":
    case "playlists":
      await requirePlaylistInOrg(entityId, ctx);
      break;
    default:
      throw new Error(`VALIDATION_ERROR: unsupported entity_type '${entityType}'`);
  }

  return { entityType, entityId };
}
