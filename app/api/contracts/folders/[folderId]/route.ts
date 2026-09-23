import { NextResponse } from "next/server";
import { requireProductOrganization } from "@/lib/platform/productization";
import { assertCanManageRelationships } from "@/lib/contract-relationships/permissions";
import { prisma } from "@/lib/prisma";

function normalizeName(value: unknown): string {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

async function getFolder(id: string, tenantId: string) {
  return prisma.contractFolder.findFirst({
    where: { id, tenantId },
  });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const ctx = await requireProductOrganization("contracts.core");
    assertCanManageRelationships(ctx);
    const { folderId } = await params;
    const folder = await getFolder(folderId, ctx.organizationId);
    if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 });

    const body = await req.json();
    const name = normalizeName(body?.name);
    if (!name) return NextResponse.json({ error: "Folder name is required" }, { status: 400 });
    if (name.length > 100) return NextResponse.json({ error: "Folder name must be 100 characters or fewer" }, { status: 400 });

    const duplicate = await prisma.contractFolder.findFirst({
      where: {
        tenantId: ctx.organizationId,
        name: { equals: name, mode: "insensitive" },
        id: { not: folder.id },
      },
      select: { id: true },
    });
    if (duplicate) return NextResponse.json({ error: "A folder with that name already exists" }, { status: 409 });

    const updated = await prisma.contractFolder.update({
      where: { id: folder.id },
      data: { name },
    });
    return NextResponse.json({ item: updated });
  } catch (error: any) {
    if (error?.status === 403) return NextResponse.json({ error: error.message }, { status: 403 });
    console.error("[PUT /api/contracts/folders/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const ctx = await requireProductOrganization("contracts.core");
    assertCanManageRelationships(ctx);
    const { folderId } = await params;
    const folder = await getFolder(folderId, ctx.organizationId);
    if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 });

    await prisma.contractFolder.delete({ where: { id: folder.id } });
    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    if (error?.status === 403) return NextResponse.json({ error: error.message }, { status: 403 });
    console.error("[DELETE /api/contracts/folders/:id]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
