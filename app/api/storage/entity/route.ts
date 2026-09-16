import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  getEntityArtwork,
  getEntityArtworkBatch,
  canAccessAttachment,
} from "@/lib/media/entity-artwork";
import { getSignedDownloadUrl } from "@/lib/storage";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";

/**
 * Resolve entity artwork via Storage Service signed URLs.
 *
 * GET /api/storage/entity?entityType=release&entityId=1
 * GET /api/storage/entity?entityType=release&ids=1,2,3  (batch)
 * GET /api/storage/entity?entityType=release&entityId=1&includeAttachments=true
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOrganization();
    const { searchParams } = new URL(req.url);
    const entityType = (searchParams.get("entityType") || "").trim().toLowerCase();
    const entityId = searchParams.get("entityId");
    const idsParam = searchParams.get("ids");
    const includeAttachments = searchParams.get("includeAttachments") === "true";

    if (!entityType) {
      return NextResponse.json({ error: "entityType is required" }, { status: 400 });
    }

    if (idsParam) {
      const ids = idsParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const map = await getEntityArtworkBatch(entityType, ids, {
        sessionOrganizationId: ctx.organizationId,
      });
      return NextResponse.json({ items: map });
    }

    if (!entityId) {
      return NextResponse.json(
        { error: "entityId or ids is required" },
        { status: 400 }
      );
    }

    const artwork = await getEntityArtwork(entityType, entityId, {
      sessionOrganizationId: ctx.organizationId,
    });

    if (!includeAttachments) {
      if (!artwork) return NextResponse.json({ artwork: null }, { status: 200 });
      return NextResponse.json({ artwork });
    }

    const attachments = await prisma.attachment.findMany({
      where: {
        entityType,
        entityId: String(entityId),
      },
      orderBy: { createdAt: "asc" },
    });

    const accessible = attachments.filter((attachment) =>
      canAccessAttachment(attachment.organizationId, ctx.organizationId)
    );

    const resolvedAttachments = await Promise.all(
      accessible.map(async (attachment) => {
        try {
          const signed = await getSignedDownloadUrl({
            key: attachment.storageKey,
            bucket: attachment.bucket,
          });
          return {
            id: attachment.id,
            entityType: attachment.entityType,
            entityId: attachment.entityId,
            fileName: attachment.fileName,
            originalName: attachment.originalName || attachment.fileName,
            mimeType: attachment.mimeType,
            category: attachment.category,
            fileSize: attachment.fileSize,
            version: attachment.version,
            createdAt: attachment.createdAt,
            downloadUrl: signed.url,
            expiresIn: signed.expiresIn,
          };
        } catch {
          return null;
        }
      })
    );

    return NextResponse.json({
      artwork,
      attachments: resolvedAttachments.filter(Boolean),
    });
  } catch (err) {
    const mapped = orgContextErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[GET /api/storage/entity]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
