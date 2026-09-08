import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getFileBuffer } from "@/lib/storage";
import {
  requireAttachmentInOrg,
  requireOrgAuth,
  resourceAuthErrorResponse,
  requireUploadEntityInOrg,
} from "@/lib/auth/resource-authorization";

/**
 * Files API.
 *
 * GET /api/files?entityType=track&entityId=123 lists organization-scoped
 * attachments bound to an entity.
 * GET /api/files?attachmentId=... downloads one attachment by id.
 * Raw storage paths are never accepted.
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireOrgAuth();
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType") || searchParams.get("entity_type");
    const entityId = searchParams.get("entityId") || searchParams.get("entity_id");
    const attachmentId =
      searchParams.get("attachmentId") ||
      searchParams.get("id") ||
      searchParams.get("attachment_id");

    if (searchParams.get("path")) {
      return NextResponse.json(
        {
          error:
            "Path-based file access is disabled. Use attachmentId or /api/storage/download/{id}.",
          code: "PATH_ACCESS_DISABLED",
        },
        { status: 400 }
      );
    }

    if (entityType || entityId) {
      if (!entityType || !entityId) {
        return NextResponse.json(
          { error: "entityType and entityId are required" },
          { status: 400 }
        );
      }

      const bound = await requireUploadEntityInOrg(entityType, entityId, ctx);
      const attachments = await prisma.attachment.findMany({
        where: {
          organizationId: ctx.organizationId,
          entityType: bound.entityType,
          entityId: bound.entityId,
        },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          entityType: true,
          entityId: true,
          fileName: true,
          originalName: true,
          mimeType: true,
          category: true,
          fileSize: true,
          version: true,
          createdAt: true,
        },
      });

      return NextResponse.json({ items: attachments });
    }

    if (!attachmentId) {
      return NextResponse.json(
        { error: "Missing attachmentId parameter" },
        { status: 400 }
      );
    }

    const attachment = await requireAttachmentInOrg(attachmentId, ctx);
    const buffer = await getFileBuffer(attachment.storageKey);
    if (!buffer) return NextResponse.json({ error: "File not found" }, { status: 404 });

    const name = attachment.originalName || attachment.storageKey;
    const ext = name.split(".").pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      gif: "image/gif",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      csv: "text/csv",
      txt: "text/plain",
    };

    const mimeType =
      attachment.mimeType || mimeMap[ext || ""] || "application/octet-stream";

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeType,
        "Content-Length": String(buffer.length),
        "Content-Disposition": `inline; filename="${name.replace(/"/g, "")}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[GET /api/files]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
