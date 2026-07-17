import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  uploadFile,
  validateUpload,
  detectMimeCategory,
  logAttachmentActivity,
} from "@/lib/storage";
import { DEFAULT_FOLDER_NAMES } from "@/lib/storage/constants";

/**
 * Universal file upload endpoint for Otto Cloud.
 *
 * Every module uploads through here and receives an `Attachment` record. No
 * module uploads to Cloudflare R2 directly. The raw storage key is persisted
 * server-side only and never returned to the client.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const organizationId: string = user.organization_id;
    const userId: number = parseInt(user.id) || 1;
    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    if (!organizationId) {
      return NextResponse.json({ error: "Missing organization context" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const entityType = formData.get("entityType") as string | null;
    const entityId = formData.get("entityId") as string | null;
    const workspaceId = (formData.get("workspaceId") as string | null) || null;
    const folder =
      (formData.get("folder") as string | null) ||
      (entityType as (typeof DEFAULT_FOLDER_NAMES)[keyof typeof DEFAULT_FOLDER_NAMES]) ||
      DEFAULT_FOLDER_NAMES.misc;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!entityType || !entityId) {
      return NextResponse.json(
        { error: "entityType and entityId are required" },
        { status: 400 }
      );
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
        entityType,
        entityId,
        uploadedBy: String(userId),
      },
    });

    const attachment = await prisma.attachment.create({
      data: {
        organizationId,
        workspaceId,
        entityType,
        entityId,
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
      entityType,
      entityId,
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
  } catch (err: any) {
    console.error("[POST /api/storage/upload]", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
