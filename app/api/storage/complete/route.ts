import { NextRequest, NextResponse } from "next/server";
import { HeadObjectCommand } from "@aws-sdk/client-s3";
import { prisma } from "@/lib/prisma";
import { deleteFile, detectMimeCategory, storageClient, storageConfig, sanitizeFilename, validateUpload } from "@/lib/storage";
import { getMediaImageMaxBytes } from "@/lib/storage/image-policy";
import { logAttachmentActivity } from "@/lib/storage";
import { orgContextErrorResponse } from "@/lib/auth/organization-context";
import { isGlobalReferenceDataAuthority } from "@/lib/auth/privilege-authorization";
import {
  requireActorUserId,
  requireOrgAuth,
  requireUploadEntityInOrg,
  resourceAuthErrorResponse,
} from "@/lib/auth/resource-authorization";

/**
 * Finalize a browser-to-R2 upload by verifying the object exists and creating
 * the canonical organization-scoped attachment row.
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireOrgAuth();
    const userId = requireActorUserId(ctx);
    const body = await req.json();
    const entityType = String(body?.entityType || "").trim().toLowerCase();
    const entityId = String(body?.entityId || "").trim();
    const key = String(body?.key || "").trim();
    const fileName = String(body?.fileName || "").trim();
    const originalName = String(body?.originalName || fileName).trim();
    const mimeType = String(body?.mimeType || "").trim();
    const expectedSize = Number(body?.fileSize);
    const uploadPurpose = String(body?.uploadPurpose || "attachment").trim().toLowerCase();

    if (!entityType || !entityId || !key || !fileName || !mimeType) {
      return NextResponse.json(
        { error: "entityType, entityId, key, fileName and mimeType are required" },
        { status: 400 }
      );
    }

    if (!["attachment", "artwork"].includes(uploadPurpose)) {
      return NextResponse.json(
        { error: "uploadPurpose must be attachment or artwork" },
        { status: 400 }
      );
    }

    const artworkEntityTypes = new Set(["release", "artist", "label", "publisher", "pro", "individual", "organization"]);
    if (uploadPurpose === "artwork" && !artworkEntityTypes.has(entityType)) {
      return NextResponse.json(
        { error: "Artwork uploads are not supported for this entity type" },
        { status: 400 }
      );
    }
    if (uploadPurpose === "artwork" && ["publisher", "pro"].includes(entityType) && !isGlobalReferenceDataAuthority(ctx)) {
      return NextResponse.json(
        { error: "Global reference-data authority required", code: "GLOBAL_REFERENCE_DATA_AUTHORITY_REQUIRED" },
        { status: 403 }
      );
    }

    const bound = await requireUploadEntityInOrg(entityType, entityId, ctx);
    const maxImageBytes =
      uploadPurpose === "artwork"
        ? getMediaImageMaxBytes(entityType, mimeType)
        : null;
    const validation = validateUpload({
      fileName,
      mimeType,
      fileSize: expectedSize,
      maxSizeBytes: maxImageBytes ?? undefined,
    });
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 }
      );
    }

    const expectedPrefix = `organizations/${ctx.organizationId}/${entityType}/`;
    if (!key.startsWith(expectedPrefix)) {
      return NextResponse.json({ error: "Invalid storage key" }, { status: 400 });
    }

    const head = await storageClient.send(
      new HeadObjectCommand({ Bucket: storageConfig.bucket, Key: key })
    );
    const actualSize = Number(head.ContentLength ?? 0);
    if (!actualSize || actualSize !== expectedSize) {
      return NextResponse.json({ error: "Uploaded object size does not match" }, { status: 400 });
    }
    if (head.ContentType && head.ContentType !== mimeType) {
      return NextResponse.json({ error: "Uploaded object MIME type does not match" }, { status: 400 });
    }

    const previousArtwork = uploadPurpose === "artwork"
      ? await prisma.attachment.findMany({
          where: {
            organizationId: ctx.organizationId,
            entityType: bound.entityType,
            entityId: bound.entityId,
            purpose: "artwork",
          },
          orderBy: { createdAt: "desc" },
        })
      : [];

    const attachment = await prisma.$transaction(async (tx) => {
      const created = await tx.attachment.create({
        data: {
          organizationId: ctx.organizationId,
          entityType: bound.entityType,
          entityId: bound.entityId,
          fileName: sanitizeFilename(fileName),
          originalName,
          mimeType,
          category: detectMimeCategory(mimeType),
          purpose: uploadPurpose,
          fileSize: actualSize,
          bucket: storageConfig.bucket,
          storageKey: key,
          checksum: head.ETag ?? null,
          version: 1,
          uploadedBy: String(userId),
        },
      });
      if (uploadPurpose === "artwork" && previousArtwork.length) {
        await tx.attachment.deleteMany({
          where: { id: { in: previousArtwork.map((item) => item.id) }, organizationId: ctx.organizationId },
        });
      }
      return created;
    });

    if (previousArtwork.length) {
      await Promise.all(previousArtwork.map(async (previous) => {
        try {
          await deleteFile({ key: previous.storageKey, bucket: previous.bucket });
        } catch (error) {
          console.error("[POST /api/storage/complete] Failed to remove replaced artwork object", {
            attachmentId: previous.id, storageKey: previous.storageKey, error,
          });
        }
      }));
      await Promise.all(previousArtwork.map((previous) => logAttachmentActivity({
        event: "attachment.deleted", attachmentId: previous.id, organizationId: ctx.organizationId, userId,
        entityType: bound.entityType, entityId: bound.entityId,
        fileName: previous.originalName || previous.fileName,
        ipAddress: req.headers.get("x-forwarded-for") || undefined,
        userAgent: req.headers.get("user-agent") || undefined,
      })));
    }

    await logAttachmentActivity({
      event: "attachment.created",
      attachmentId: attachment.id,
      organizationId: ctx.organizationId,
      userId,
      entityType: bound.entityType,
      entityId: bound.entityId,
      fileName: originalName,
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    return NextResponse.json({
      attachment: {
        id: attachment.id,
        entityType: attachment.entityType,
        entityId: attachment.entityId,
        fileName: attachment.fileName,
        originalName: attachment.originalName,
        mimeType: attachment.mimeType,
        category: attachment.category,
        fileSize: attachment.fileSize,
        version: attachment.version,
        createdAt: attachment.createdAt,
      },
    }, { status: 201 });
  } catch (err: unknown) {
    const mapped = resourceAuthErrorResponse(err);
    if ([400, 401, 403, 404].includes(mapped.status)) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    const orgMapped = orgContextErrorResponse(err);
    if ([401, 403].includes(orgMapped.status)) {
      return NextResponse.json(orgMapped.body, { status: orgMapped.status });
    }
    console.error("[POST /api/storage/complete]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
