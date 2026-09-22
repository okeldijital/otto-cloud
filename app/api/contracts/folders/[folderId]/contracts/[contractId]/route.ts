import { NextResponse } from "next/server";
import { requireProductOrganization } from "@/lib/platform/productization";
import { assertCanManageRelationships } from "@/lib/contract-relationships/permissions";
import { requireContractInOrg } from "@/lib/auth/resource-authorization";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ folderId: string; contractId: string }> }
) {
  try {
    const ctx = await requireProductOrganization("contracts.core");
    assertCanManageRelationships(ctx);
    const { folderId, contractId: contractIdParam } = await params;
    const contractId = Number.parseInt(contractIdParam, 10);
    if (!Number.isFinite(contractId)) return NextResponse.json({ error: "Invalid contract ID" }, { status: 400 });

    const folder = await prisma.contractFolder.findFirst({
      where: { id: folderId, organizationId: ctx.legacyIntOrgId },
      select: { id: true },
    });
    if (!folder) return NextResponse.json({ error: "Folder not found" }, { status: 404 });

    await requireContractInOrg(contractId, ctx);

    const deleted = await prisma.contractFolderMembership.deleteMany({
      where: {
        organizationId: ctx.legacyIntOrgId,
        folderId: folder.id,
        contractId,
      },
    });
    if (deleted.count === 0) return NextResponse.json({ error: "Contract is not in this folder" }, { status: 404 });

    return new NextResponse(null, { status: 204 });
  } catch (error: any) {
    if (error?.status === 403) return NextResponse.json({ error: error.message }, { status: 403 });
    if (error?.status === 404) return NextResponse.json({ error: "Contract or folder not found" }, { status: 404 });
    console.error("[DELETE /api/contracts/folders/:id/contracts/:contractId]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
