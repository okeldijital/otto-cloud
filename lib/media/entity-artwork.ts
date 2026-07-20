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

/** Prefer image category when multiple attachments exist for an entity. */
export async function getPrimaryAttachment(
  entityType: MediaEntityType | string,
  entityId: string | number
) {
  const id = String(entityId);
  const type = String(entityType).toLowerCase();

  // Prefer image attachments (cover/profile/logo)
  const image = await prisma.attachment.findFirst({
    where: {
      entityType: type,
      entityId: id,
      category: "image",
    },
    orderBy: { createdAt: "asc" },
  });
  if (image) return image;

  return prisma.attachment.findFirst({
    where: { entityType: type, entityId: id },
    orderBy: { createdAt: "asc" },
  });
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
    orderBy: [{ category: "asc" }, { createdAt: "asc" }],
  });

  // Prefer first image per entityId
  const primary = new Map<string, (typeof attachments)[0]>();
  for (const att of attachments) {
    if (
      options?.sessionOrganizationId !== undefined &&
      !canAccessAttachment(att.organizationId, options.sessionOrganizationId)
    ) {
      continue;
    }
    const existing = primary.get(att.entityId);
    if (!existing) {
      primary.set(att.entityId, att);
      continue;
    }
    if (existing.category !== "image" && att.category === "image") {
      primary.set(att.entityId, att);
    }
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
