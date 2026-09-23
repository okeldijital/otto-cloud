import { NextResponse } from "next/server";
import { requireProductOrganization } from "@/lib/platform/productization";
import { assertCanManageRelationships } from "@/lib/contract-relationships/permissions";
import { requireContractInOrg } from "@/lib/auth/resource-authorization";
import { prisma } from "@/lib/prisma";

async function getFolder(folderId: string, tenantId: string) {
  return prisma.contractFolder.findFirst({ where: { id: folderId, tenantId } });
}

export async function POST(
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
    const contractId = Number.parseInt(String(body?.contractId || ""), 10);
    if (!Number.isFinite(contractId)) return NextResponse.json({ error: "Invalid contract ID" }, { status: 400 });

    await requireContractInOrg(contractId, ctx);

    const existing = await prisma.contractFolderMembership.findUnique({
      where: { folderId_contractId: { folderId: folder.id, contractId } },
      select: { id: true },
    });
    if (existing) return NextResponse.json({ error: "Contract is already in this folder" }, { status: 409 });

    const membership = await prisma.contractFolderMembership.create({
      data: {
        organizationId: ctx.legacyIntOrgId,
        tenantId: ctx.organizationId,
        folderId: folder.id,
        contractId,
        addedBy: ctx.userId,
      },
    });

    return NextResponse.json({ item: membership }, { status: 201 });
  } catch (error: any) {
    if (error?.status === 403) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error?.status === 404) return NextResponse.json({ error: "Contract or folder not found" }, { status: 404 });
    console.error("[POST /api/contracts/folders/:id/contracts]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
