import { NextResponse } from "next/server";
import { requireOrganization } from "@/lib/auth/organization-context";
import { prisma } from "@/lib/prisma";

function serializeSize(value: bigint | number | null | undefined) {
  if (value === null || value === undefined) return null;
  return Number(value);
}

export async function GET(req: Request) {
  try {
    const ctx = await requireOrganization();
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim().toLowerCase();
    const type = (searchParams.get("type") || "all").trim().toLowerCase();
    const entityType = (searchParams.get("entity_type") || "all").trim().toLowerCase();
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 200), 1), 500);

    const [platformDocs, attachments] = await Promise.all([
      prisma.documentAsset.findMany({
        where: { organizationId: ctx.organizationId, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.attachment.findMany({
        where: { organizationId: ctx.organizationId },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
    ]);

    const contractLinks = await prisma.contractDocumentRelation.findMany({
      where: { documentId: { in: platformDocs.map((doc) => doc.id) } },
      select: { documentId: true, contractId: true },
    });
    const contractByDocument = new Map(contractLinks.map((link) => [link.documentId, link.contractId]));

    const platformItems = platformDocs.map((doc) => {
      const contractId = contractByDocument.get(doc.id);
      return {
        id: doc.id,
        source: "platform",
        name: doc.originalFilename,
        mimeType: doc.mimeType,
        fileSize: serializeSize(doc.fileSize),
        createdAt: doc.createdAt,
        entityType: contractId ? "contract" : null,
        entityId: contractId ? String(contractId) : null,
        entityLabel: contractId ? `Contract #${contractId}` : "Unlinked",
        category: "document",
        downloadUrl: `/api/documents/${doc.id}/download`,
      };
    });

    const attachmentItems = attachments
      .filter((attachment) => attachment.category !== "image")
      .map((attachment) => ({
        id: attachment.id,
        source: "attachment",
        name: attachment.originalName || attachment.fileName,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize,
        createdAt: attachment.createdAt,
        entityType: attachment.entityType,
        entityId: attachment.entityId,
        entityLabel: `${attachment.entityType} #${attachment.entityId}`,
        category: attachment.category,
        downloadUrl: `/api/files?attachmentId=${encodeURIComponent(attachment.id)}`,
      }));

    const items = [...platformItems, ...attachmentItems]
      .filter((item) => type === "all" || item.mimeType.toLowerCase().includes(type) || item.category.toLowerCase() === type)
      .filter((item) => entityType === "all" || item.entityType?.toLowerCase() === entityType)
      .filter((item) => {
        if (!q) return true;
        return [item.name, item.entityLabel, item.entityType || "", item.category]
          .join(" ")
          .toLowerCase()
          .includes(q);
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    return NextResponse.json({
      items,
      summary: {
        total: items.length,
        attached: items.filter((item) => Boolean(item.entityId)).length,
        unlinked: items.filter((item) => !item.entityId).length,
        types: new Set(items.map((item) => item.category)).size,
      },
    });
  } catch (error) {
    console.error("[GET /api/office/documents]", error);
    return NextResponse.json({ error: "Unable to load document repository" }, { status: 500 });
  }
}
