import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFile, logAttachmentActivity } from "@/lib/storage";

/**
 * Universal delete endpoint.
 *
 * Verifies ownership, deletes the underlying storage object via the Storage
 * Service, then hard-deletes the Attachment record (the project has no
 * soft-delete convention for this table). Emits `attachment.deleted` and
 * writes an audit/activity entry.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = session.user as any;
    const organizationId: string = user.organization_id;
    const userId: number = parseInt(user.id) || 1;
    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    const attachment = await prisma.attachment.findUnique({
      where: { id },
    });
    if (!attachment) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 });
    }
    if (attachment.organizationId !== organizationId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete the underlying object via the Storage Service. This is the only
    // place storage deletion is triggered; no module touches the provider.
    await deleteFile({ key: attachment.storageKey, bucket: attachment.bucket });

    const entityType = attachment.entityType;
    const entityId = attachment.entityId;

    await prisma.attachment.delete({
      where: { id: attachment.id },
    });

    await logAttachmentActivity({
      event: "attachment.deleted",
      attachmentId: attachment.id,
      organizationId,
      userId,
      entityType,
      entityId,
      fileName: attachment.originalName,
      ipAddress,
      userAgent,
    });

    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/storage/[id]]", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
