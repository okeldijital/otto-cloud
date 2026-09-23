/**
 * Server-side entity artwork resolution via the Storage Service.
 *
 * Does not re-upload or alter R2 objects. Only reads Attachment metadata
 * and issues short-lived signed download URLs.
 */

import { prisma } from "@/lib/prisma";
import { getSignedDownloadUrl } from "@/lib/storage";
import {
  getLegacyCatalogScopeId,
  getLegacyIntOrgId,
} from "@/lib/auth/migration-compat";

export type MediaEntityType =
  | "release"
  | "artist"
  | "label"
  | "user"
  | "contract"
  | "work"
  | "publisher";

export type EntityArtwork = {
  attachmentId: string;
  entityType: string;
  entityId: string;
  fileName: string;
  mimeType: string;
  category: string;
  downloadUrl: string;
  expiresIn: number;
};

function isLegacyImageCandidate(attachment: { category: string; purpose: string; fileName: string; originalName: string }): boolean {
  if (attachment.purpose === "avatar" || attachment.purpose === "artwork") return true;
  if (attachment.category !== "image") return false;
  const name = `${attachment.originalName} ${attachment.fileName}`.toLowerCase();
  return !/(^|[\s_\-])screenshot([\s_\-.]|$)/i.test(name);
}

/** Prefer explicit artwork attachments; retain a conservative legacy fallback for pre-purpose rows. */
async function resolveAttachmentEntityId(
  entityType: string,
  entityId: string
): Promise<string> {
  if (entityType !== "user") return entityId;

  // User artwork is stored against the legacy User.id because the upload
  // endpoint still writes Attachment.entityId from the legacy user record.
  // The IAM session exposes the canonical identity UUID, so normalize it
  // here rather than requiring every UI surface to know about that boundary.
  const identity = await prisma.iamIdentity.findUnique({
    where: { id: entityId },
    select: { legacyUserId: true },
  });

  return identity?.legacyUserId != null
    ? String(identity.legacyUserId)
    : entityId;
}

export async function getPrimaryAttachment(
  entityType: MediaEntityType | string,
  entityId: string | number
) {
  const type = String(entityType).toLowerCase();
  const id = await resolveAttachmentEntityId(type, String(entityId));

  const attachments = await prisma.attachment.findMany({
    where: { entityType: type, entityId: id },
    orderBy: { createdAt: "desc" },
  });
  return attachments.find(isLegacyImageCandidate) ?? null;
}

/**
 * Whether the session org may access this attachment row.
 * Handles migration-era organizationId = "1" vs catalog UUID.
 */
export function canAccessAttachment(
  attachmentOrganizationId: string,
  sessionOrganizationId: string | null | undefined
): boolean {
  if (!sessionOrganizationId) return false;
  if (attachmentOrganizationId === sessionOrganizationId) return true;

  const legacyUuid = getLegacyCatalogScopeId();
  const legacyInt = String(getLegacyIntOrgId());

  const sessionIsLegacy =
    sessionOrganizationId === legacyUuid || sessionOrganizationId === legacyInt;
  const attIsLegacy =
    attachmentOrganizationId === legacyUuid ||
    attachmentOrganizationId === legacyInt ||
    attachmentOrganizationId === "1";

  return sessionIsLegacy && attIsLegacy;
}

/**
 * Resolve primary attachment + signed download URL for an entity.
 * Returns null when no attachment exists (caller shows placeholder).
 */
export async function getEntityArtwork(
  entityType: MediaEntityType | string,
  entityId: string | number,
  options?: { expiresIn?: number; sessionOrganizationId?: string | null }
): Promise<EntityArtwork | null> {
  const attachment = await getPrimaryAttachment(entityType, entityId);
  if (!attachment) return null;

  if (
    options?.sessionOrganizationId !== undefined &&
    !canAccessAttachment(attachment.organizationId, options.sessionOrganizationId)
  ) {
    return null;
  }

  const signed = await getSignedDownloadUrl(
    { key: attachment.storageKey, bucket: attachment.bucket },
    options?.expiresIn
  );

  return {
    attachmentId: attachment.id,
    entityType: attachment.entityType,
    entityId: attachment.entityId,
    fileName: attachment.originalName || attachment.fileName,
    mimeType: attachment.mimeType,
    category: attachment.category,
    downloadUrl: signed.url,
    expiresIn: signed.expiresIn,
  };
}

/**
 * Batch resolve signed URLs for many entity ids of the same type.
 * Returns a map entityId → EntityArtwork (missing ids omitted).
 */
export async function getEntityArtworkBatch(
  entityType: MediaEntityType | string,
  entityIds: Array<string | number>,
  options?: { expiresIn?: number; sessionOrganizationId?: string | null }
): Promise<Record<string, EntityArtwork>> {
  const type = String(entityType).toLowerCase();
  const ids = [...new Set(entityIds.map(String).filter(Boolean))];
  if (!ids.length) return {};

  const attachments = await prisma.attachment.findMany({
    where: {
      entityType: type,
      entityId: { in: ids },
    },
    orderBy: { createdAt: "desc" },
  });

  // Prefer explicit artwork. For legacy rows, use only non-screenshot images.
  const primary = new Map<string, (typeof attachments)[0]>();
  for (const att of attachments) {
    if (!isLegacyImageCandidate(att)) continue;
    if (
      options?.sessionOrganizationId !== undefined &&
      !canAccessAttachment(att.organizationId, options.sessionOrganizationId)
    ) {
      continue;
    }
    if (!primary.has(att.entityId)) primary.set(att.entityId, att);
  }

  const out: Record<string, EntityArtwork> = {};
  await Promise.all(
    [...primary.entries()].map(async ([entityId, att]) => {
      try {
        const signed = await getSignedDownloadUrl(
          { key: att.storageKey, bucket: att.bucket },
          options?.expiresIn
        );
        out[entityId] = {
          attachmentId: att.id,
          entityType: att.entityType,
          entityId: att.entityId,
          fileName: att.originalName || att.fileName,
          mimeType: att.mimeType,
          category: att.category,
          downloadUrl: signed.url,
          expiresIn: signed.expiresIn,
        };
      } catch {
        /* skip failed sign */
      }
    })
  );

  return out;
}
