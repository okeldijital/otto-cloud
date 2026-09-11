import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  requireArtistInOrg,
  requireOrgAuth,
  resourceAuthErrorResponse,
} from "@/lib/auth/resource-authorization";
import { getSignedDownloadUrl } from "@/lib/storage";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requireOrgAuth();
    const artistId = Number((await params).id);
    await requireArtistInOrg(artistId, ctx);

    const attachments = await prisma.attachment.findMany({
      where: {
        organizationId: ctx.organizationId,
        entityType: "artist",
        entityId: String(artistId),
      },
      orderBy: { createdAt: "desc" },
    });

    const items = await Promise.all(
      attachments.map(async (attachment) => {
        const signed = await getSignedDownloadUrl({ key: attachment.storageKey });
        return {
          id: attachment.id,
          name: attachment.originalName,
          mimeType: attachment.mimeType,
          category: attachment.category,
          size: attachment.fileSize,
          createdAt: attachment.createdAt,
          downloadUrl: signed.url,
          expiresIn: signed.expiresIn,
        };
      })
    );

    return NextResponse.json({ items });
  } catch (err) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status !== 500) return NextResponse.json(mapped.body, { status: mapped.status });
    console.error("[GET /api/artists/[id]/documents]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
