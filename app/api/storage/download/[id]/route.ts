import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSignedDownloadUrl, logAttachmentActivity } from "@/lib/storage";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import { canAccessAttachment } from "@/lib/media/entity-artwork";

/**
 * Universal download endpoint.
 *
 * Resolves an `Attachment` by id, enforces organization ownership, then returns
 * a short-lived signed URL. The storage key/bucket/credentials are never exposed
 * to the client.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await requireOrganization();
    const organizationId = ctx.organizationId;
    const userId = ctx.userId;
    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    const attachment = await prisma.attachment.findUnique({
      where: { id },
    });
    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }
    if (!canAccessAttachment(attachment.organizationId, organizationId)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const redirect = searchParams.get("redirect") === "true";

    const signed = await getSignedDownloadUrl({ key: attachment.storageKey });

    await logAttachmentActivity({
      event: "attachment.downloaded",
      attachmentId: attachment.id,
      organizationId,
      userId,
      entityType: attachment.entityType,
      entityId: attachment.entityId,
      fileName: attachment.originalName,
      ipAddress,
      userAgent,
    });

    if (redirect) {
      return NextResponse.redirect(signed.url);
    }

    return NextResponse.json({
      url: signed.url,
      expiresIn: signed.expiresIn,
      fileName: attachment.originalName,
      mimeType: attachment.mimeType,
    });
  } catch (err: any) {
    const mapped = orgContextErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[GET /api/storage/download/[id]]", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
