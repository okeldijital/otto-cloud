import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { storeFile } from "@/lib/storage";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";
import {
  requireOrgAuth,
  requireDocumentInOrg,
  resourceAuthErrorResponse,
} from "@/lib/auth/resource-authorization";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const ctx = await requireOrganization();
    const orgIdStr = ctx.organizationId;
    const action = searchParams.get("action");
    if (action === "entity") {
      const entityType = searchParams.get("entity_type");
      const entityId = searchParams.get("entity_id");
      if (!entityType || !entityId) {
        return NextResponse.json({ error: "entity_type and entity_id are required" }, { status: 400 });
      }
      const docs = await prisma.documents.findMany({
        where: {
          organization_id: orgIdStr,
          related_entity_type: entityType,
          related_entity_id: parseInt(entityId),
          is_deleted: false,
        },
        orderBy: { created_at: "desc" },
      });
      return NextResponse.json(docs);
    }

    const idStr = searchParams.get("id");
    if (idStr) {
      const id = parseInt(idStr);
      const doc = await prisma.documents.findFirst({
        where: { id, organization_id: orgIdStr, is_deleted: false },
      });
      if (!doc) return NextResponse.json({ error: "Document not found" }, { status: 404 });
      return NextResponse.json(doc);
    }

    const fileType = searchParams.get("file_type");
    const category = searchParams.get("category");
    const q = searchParams.get("q");
    const limit = parseInt(searchParams.get("limit") || "100");
    const skip = parseInt(searchParams.get("skip") || "0");

    const where: any = { organization_id: orgIdStr, is_deleted: false };
    if (fileType) where.file_type = fileType;
    if (category) where.category = category;
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { filename: { contains: q, mode: "insensitive" } },
        { original_filename: { contains: q, mode: "insensitive" } },
      ];
    }

    const docs = await prisma.documents.findMany({
      where,
      skip,
      take: limit,
      orderBy: { created_at: "desc" },
    });
    return NextResponse.json(docs);
  } catch (err: any) {
    console.error("[GET /api/office/documents]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");
    const ctx = await requireOrganization();
    const orgIdStr = ctx.organizationId;
    const userId = parseInt((session.user as any).id) || 1;

    if (action === "upload") {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

      const title = formData.get("title") as string | null;
      const description = formData.get("description") as string | null;
      const category = formData.get("category") as string | null;
      const fileType = formData.get("file_type") as string | null;
      const relatedEntityType = formData.get("related_entity_type") as string | null;
      const relatedEntityId = formData.get("related_entity_id") as string | null;

      const stored = await storeFile(file, "doc", {
        domain: "office",
        allowedMime: [
          "application/pdf",
          "image/jpeg", "image/png", "image/webp",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "application/vnd.ms-excel",
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "text/plain", "text/csv",
        ],
        maxSizeBytes: 50 * 1024 * 1024,
      });

      const doc = await prisma.documents.create({
        data: {
          filename: stored.filename,
          original_filename: file.name,
          file_path: stored.url,
          file_type: fileType || undefined,
          mime_type: stored.mime_type,
          file_size: BigInt(stored.size_bytes),
          version: 1,
          title: title || file.name,
          description: description || undefined,
          category: category || undefined,
          checksum: stored.checksum,
          related_entity_type: relatedEntityType || undefined,
          related_entity_id: relatedEntityId ? parseInt(relatedEntityId) : undefined,
          uploaded_by: userId,
          organization_id: orgIdStr,
          is_deleted: false,
        },
      });
      return NextResponse.json(doc, { status: 201 });
    }

    const body = await req.json();
    const doc = await prisma.documents.create({
      data: {
        filename: body.filename || `doc-${Date.now()}`,
        original_filename: body.original_filename || body.filename || `doc-${Date.now()}`,
        file_path: body.file_path || "",
        file_type: body.file_type || undefined,
        mime_type: body.mime_type || undefined,
        file_size: body.file_size ? BigInt(body.file_size) : undefined,
        version: body.version || 1,
        title: body.title || undefined,
        description: body.description || undefined,
        tags: body.tags || undefined,
        category: body.category || undefined,
        related_entity_type: body.related_entity_type || undefined,
        related_entity_id: body.related_entity_id ? parseInt(body.related_entity_id) : undefined,
        uploaded_by: userId,
        organization_id: orgIdStr,
        checksum: body.checksum || undefined,
        is_deleted: false,
      },
    });
    return NextResponse.json(doc, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/office/documents]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing document ID" }, { status: 400 });
    const id = parseInt(idStr);

    const ctxMut = await requireOrgAuth();
    const existing = await requireDocumentInOrg(id, ctxMut);
    if (!existing) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    const body = await req.json();
    const updated = await prisma.documents.update({
      where: { id },
      data: {
        title: body.title !== undefined ? body.title : undefined,
        description: body.description !== undefined ? body.description : undefined,
        category: body.category !== undefined ? body.category : undefined,
        tags: body.tags !== undefined ? body.tags : undefined,
        file_type: body.file_type !== undefined ? body.file_type : undefined,
      },
    });
    return NextResponse.json(updated);
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[PUT /api/office/documents]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing document ID" }, { status: 400 });
    const id = parseInt(idStr);

    const ctxMut = await requireOrgAuth();
    const existing = await requireDocumentInOrg(id, ctxMut);
    if (!existing) return NextResponse.json({ error: "Document not found" }, { status: 404 });

    await prisma.documents.update({
      where: { id },
      data: { is_deleted: true },
    });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    const mappedDel = resourceAuthErrorResponse(err);
    if (mappedDel.status === 401 || mappedDel.status === 403 || mappedDel.status === 404) {
      return NextResponse.json(mappedDel.body, { status: mappedDel.status });
    }
    console.error("[DELETE /api/office/documents]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
