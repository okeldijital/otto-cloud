import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { documentService } from "@/lib/documents";
import { requireOrgAuth, requireContractInOrg, resourceAuthErrorResponse } from "@/lib/auth/resource-authorization";
import { assertCanManageLifecycle } from "@/lib/contract-lifecycle/permissions";
import { evaluateContractDeletion } from "@/lib/contract-lifecycle/delete-policy";

export async function DELETE(req: Request) {
  try {
    const ctx = await requireOrgAuth();
    assertCanManageLifecycle(ctx);

    const { searchParams } = new URL(req.url);
    const id = Number.parseInt(searchParams.get("id") || "", 10);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid contract ID" }, { status: 400 });
    }

    await requireContractInOrg(id, ctx);
    const organizationId = ctx.legacyIntOrgId;
    const organizationUuid = ctx.organizationId;

    const [contract, lifecycle, verifiedContract, relationshipCount, rightReferenceCount, rightCount, royaltyEntitlementCount, documentRelations] = await Promise.all([
      prisma.contracts.findFirst({ where: { id, organization_id: organizationId } }),
      prisma.contractLifecycle.findFirst({ where: { contractId: id, organizationId: organizationUuid } }),
      prisma.verifiedContract.findFirst({ where: { contractId: id, organizationId: organizationUuid }, select: { id: true } }),
      prisma.contractRelationship.count({ where: { contractId: id, organizationId: organizationUuid } }),
      prisma.rightContractReference.count({ where: { contractId: id, organizationId: organizationUuid } }),
      prisma.right.count({ where: { contractId: id, organizationId: organizationUuid } }),
      prisma.royaltyEntitlement.count({ where: { contractId: id, organizationId: organizationUuid } }),
      prisma.contractDocumentRelation.findMany({ where: { contractId: id }, select: { documentId: true } }),
    ]);

    if (!contract) {
      return NextResponse.json({ error: "Contract not found" }, { status: 404 });
    }

    const decision = evaluateContractDeletion({
      contractStatus: contract.status,
      lifecycleStatus: lifecycle?.status,
      hasVerifiedContract: !!verifiedContract,
      relationshipCount,
      rightReferenceCount,
      rightCount,
      royaltyEntitlementCount,
    });

    if (!decision.allowed) {
      return NextResponse.json(
        { error: decision.reason, code: decision.code },
        { status: 409 }
      );
    }

    const documentIds = [...new Set(documentRelations.map((relation) => relation.documentId))];

    await prisma.$transaction(async (tx) => {
      await tx.relationshipSuggestion.deleteMany({ where: { contractId: id, organizationId: organizationUuid } });
      await tx.contractTimelineEntry.deleteMany({ where: { contractId: id, organizationId: organizationUuid } });
      await tx.contractLifecycleEvent.deleteMany({ where: { contractId: id, organizationId: organizationUuid } });
      await tx.contractLifecycle.deleteMany({ where: { contractId: id, organizationId: organizationUuid } });

      await tx.contract_track_links.deleteMany({ where: { contract_id: id } });
      await tx.contract_parties.deleteMany({ where: { contract_id: id } });
      await tx.contract_assets.deleteMany({ where: { contract_id: id } });

      const splitGroups = await tx.contract_split_groups.findMany({ where: { contract_id: id }, select: { id: true } });
      const groupIds = splitGroups.map((group) => group.id);
      if (groupIds.length) {
        await tx.contract_splits.deleteMany({ where: { group_id: { in: groupIds } } });
      }
      await tx.contract_split_groups.deleteMany({ where: { contract_id: id } });

      await tx.ContractDocumentRelation.deleteMany({ where: { contractId: id } });
      await tx.contract_documents.deleteMany({ where: { contract_id: id } });
      await tx.contracts.delete({ where: { id } });
    });

    // Platform documents are immutable assets and are soft-deleted. Do not
    // delete a document that is still shared by another business relation.
    for (const documentId of documentIds) {
      const remainingRelations = await prisma.contractDocumentRelation.count({
        where: { documentId },
      });
      if (remainingRelations === 0) {
        try {
          await documentService.softDeleteDocument({
            documentId,
            organizationId: organizationUuid,
            userId: ctx.userId,
          });
        } catch (error) {
          console.error("[DELETE /api/contracts/delete] document cleanup failed", documentId, error);
        }
      }
    }

    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[DELETE /api/contracts/delete]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
