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
    const limit = Math.min(Math.max(Number(searchParams.get("limit") || 500), 1), 500);

    const [platformDocs, attachments, releaseDocs] = await Promise.all([
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
      prisma.$queryRawUnsafe<any[]>(
        "SELECT rd.id, rd.storage_key, rd.file_name, rd.original_name, rd.mime_type, rd.file_size, rd.category, rd.description, rd.created_at, rd.release_id, r.title AS release_title FROM release_documents rd JOIN releases r ON r.id = rd.release_id AND r.organization_id = rd.organization_id WHERE rd.organization_id = $1::uuid AND r.organization_id = $1::uuid ORDER BY rd.created_at DESC LIMIT $2",
        ctx.organizationId,
        limit
      ),
    ]);

    const contractLinks = await prisma.contractDocumentRelation.findMany({
      where: { documentId: { in: platformDocs.map((doc) => doc.id) } },
      select: { documentId: true, contractId: true },
    });
    const contractByDocument = new Map(contractLinks.map((link) => [link.documentId, link.contractId]));
    const attachmentByKey = new Map(attachments.map((attachment) => [attachment.storageKey, attachment]));

    const platformItems = platformDocs.map((doc) => {
      const contractId = contractByDocument.get(doc.id);
      return {
        id: doc.id,
        source: "platform" as const,
        name: doc.originalFilename,
        mimeType: doc.mimeType,
        fileSize: serializeSize(doc.fileSize),
        createdAt: doc.createdAt,
        entityType: contractId ? "contract" : null,
        entityId: contractId ? String(contractId) : null,
        entityLabel: contractId ? `Contract #${contractId}` : "Unlinked",
        category: "document",
        folderName: "Contracts",
        description: null,
        downloadUrl: `/api/documents/${doc.id}/download`,
      };
    });

    const releaseItems = releaseDocs.map((doc) => {
      const attachment = attachmentByKey.get(doc.storage_key);
      return {
        id: String(doc.id),
        source: "attachment" as const,
        name: doc.original_name || doc.file_name,
        mimeType: doc.mime_type || attachment?.mimeType || "application/octet-stream",
        fileSize: serializeSize(doc.file_size) ?? attachment?.fileSize ?? null,
        createdAt: doc.created_at,
        entityType: "release",
        entityId: String(doc.release_id),
        entityLabel: doc.release_title || `Release #${doc.release_id}`,
        category: doc.category || "document",
        folderName: doc.description || "General",
        description: doc.description || null,
        downloadUrl: attachment ? `/api/files?attachmentId=${encodeURIComponent(attachment.id)}` : null,
      };
    });

    const releaseKeys = new Set(releaseDocs.map((doc) => doc.storage_key));
    const attachmentItems = attachments
      .filter((attachment) => attachment.category !== "image" && !releaseKeys.has(attachment.storageKey))
      .map((attachment) => ({
        id: attachment.id,
        source: "attachment" as const,
        name: attachment.originalName || attachment.fileName,
        mimeType: attachment.mimeType,
        fileSize: attachment.fileSize,
        createdAt: attachment.createdAt,
        entityType: attachment.entityType,
        entityId: attachment.entityId,
        entityLabel: `${attachment.entityType} #${attachment.entityId}`,
        category: attachment.category,
        folderName: "General",
        description: null,
        downloadUrl: `/api/files?attachmentId=${encodeURIComponent(attachment.id)}`,
      }));

    const items = [...platformItems, ...releaseItems, ...attachmentItems]
      .filter((item) => type === "all" || item.mimeType.toLowerCase().includes(type) || item.category.toLowerCase() === type)
      .filter((item) => entityType === "all" || item.entityType?.toLowerCase() === entityType)
      .filter((item) => !q || [item.name, item.entityLabel, item.entityType || "", item.category, item.folderName, item.description || ""].join(" ").toLowerCase().includes(q))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);

    return NextResponse.json({
      items,
      summary: {
        total: items.length,
        attached: items.filter((item) => Boolean(item.entityId)).length,
        unlinked: items.filter((item) => !item.entityId).length,
        folders: new Set(items.map((item) => item.folderName || "General")).size,
      },
    });
  } catch (error) {
    console.error("[GET /api/office/documents]", error);
    return NextResponse.json({ error: "Unable to load document repository" }, { status: 500 });
  }
}
