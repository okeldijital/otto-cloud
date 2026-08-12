import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  uploadFile,
  validateUpload,
  logAttachmentActivity,
} from "@/lib/storage";
import { DEFAULT_FOLDER_NAMES } from "@/lib/storage/constants";
import {
  orgContextErrorResponse,
} from "@/lib/auth/organization-context";
import {
  requireActorUserId,
  requireOrgAuth,
  requireUploadEntityInOrg,
  resourceAuthErrorResponse,
} from "@/lib/auth/resource-authorization";

/**
 * Universal file upload endpoint for Otto Cloud.
 *
 * A.8 Step 5: organization from session context; entity ownership verified
 * before association. Client-supplied organizationId is ignored.
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireOrgAuth();
    const organizationId = ctx.organizationId;
    const userId = requireActorUserId(ctx);
    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const entityType = formData.get("entityType") as string | null;
    const entityId = formData.get("entityId") as string | null;
    const workspaceIdRaw =
      (formData.get("workspaceId") as string | null) || null;
    const folder =
      (formData.get("folder") as string | null) ||
      (entityType as (typeof DEFAULT_FOLDER_NAMES)[keyof typeof DEFAULT_FOLDER_NAMES]) ||
      DEFAULT_FOLDER_NAMES.misc;

    // Ignore client-supplied organization / tenant / ownership fields
    // (form may include them from older clients — never trust)

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: "entityType and entityId are required" },
        { status: 400 }
      );
    }

    const bound = await requireUploadEntityInOrg(entityType, entityId, ctx);

    let workspaceId: string | null = null;
    if (workspaceIdRaw) {
      const ws = await requireUploadEntityInOrg("workspace", workspaceIdRaw, ctx);
      workspaceId = ws.entityId;
    }

    const buffer = Buffer.from(await file.arrayBuffer());

    const validation = validateUpload({
      fileName: file.name,
      mimeType: file.type,
      fileSize: buffer.byteLength,
    });
    if (!validation.valid) {
      return NextResponse.json(
        { error: "Validation failed", details: validation.errors },
        { status: 400 }
      );
    }

    const result = await uploadFile({
      body: buffer,
      organizationId,
      folder,
      fileName: validation.sanitizedFileName,
      mimeType: file.type,
      metadata: {
        entityType: bound.entityType,
        entityId: bound.entityId,
        uploadedBy: String(userId),
      },
    });

    const attachment = await prisma.attachment.create({
      data: {
        organizationId,
        workspaceId,
        entityType: bound.entityType,
        entityId: bound.entityId,
        fileName: result.fileName,
        originalName: file.name,
        mimeType: result.mimeType,
        category: result.category,
        fileSize: result.fileSize,
        bucket: result.bucket,
        storageKey: result.key,
        checksum: result.etag ?? null,
        version: 1,
        uploadedBy: String(userId),
      },
    });

    await logAttachmentActivity({
      event: "attachment.created",
      attachmentId: attachment.id,
      organizationId,
      userId,
      entityType: bound.entityType,
      entityId: bound.entityId,
      fileName: file.name,
      ipAddress,
      userAgent,
    });

    // Never expose storageKey / bucket to the client.
    const dto = {
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
    };

    return NextResponse.json({ attachment: dto }, { status: 201 });
  } catch (err: unknown) {
    const mapped = resourceAuthErrorResponse(err);
    if (
      mapped.status === 401 ||
      mapped.status === 403 ||
      mapped.status === 400 ||
      mapped.status === 404
    ) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    const orgMapped = orgContextErrorResponse(err);
    if (orgMapped.status === 401 || orgMapped.status === 403) {
      return NextResponse.json(orgMapped.body, { status: orgMapped.status });
    }
    console.error("[POST /api/storage/upload]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
