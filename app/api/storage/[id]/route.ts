import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { deleteFile, logAttachmentActivity } from "@/lib/storage";
import {
  orgContextErrorResponse,
} from "@/lib/auth/organization-context";
import {
  requireActorUserId,
  requireOrgAuth,
  resourceAuthErrorResponse,
} from "@/lib/auth/resource-authorization";

/**
 * Universal delete endpoint — attachment must belong to caller's organization.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const ctx = await requireOrgAuth();
    const organizationId = ctx.organizationId;
    const userId = requireActorUserId(ctx);
    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    // Atomic org-scoped lookup (fail closed)
    const attachment = await prisma.attachment.findFirst({
      where: { id, organizationId },
    });
    if (!attachment) {
      return NextResponse.json(
        { error: "Attachment not found" },
        { status: 404 }
      );
    }

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
    console.error("[DELETE /api/storage/[id]]", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
