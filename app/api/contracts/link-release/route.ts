import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireOrgAuth, requireContractInOrg, requireReleaseInOrg, resourceAuthErrorResponse } from "@/lib/auth/resource-authorization";

export async function POST(req: Request) {
  try {
    const ctx = await requireOrgAuth();
    const body = await req.json();
    const contractId = Number(body.contract_id);
    const releaseId = Number(body.release_id);
    if (!Number.isInteger(contractId) || contractId <= 0 || !Number.isInteger(releaseId) || releaseId <= 0) {
      return NextResponse.json({ error: "Invalid contract or release ID" }, { status: 400 });
    }

    await requireContractInOrg(contractId, ctx);
    await requireReleaseInOrg(releaseId, ctx);

    const existing = await prisma.contract_assets.findFirst({
      where: { contract_id: contractId, asset_type: "Release", asset_id: releaseId, organization_id: ctx.legacyIntOrgId },
    });
    if (existing) return NextResponse.json(existing);

    const asset = await prisma.contract_assets.create({
      data: {
        contract_id: contractId,
        organization_id: ctx.legacyIntOrgId,
        asset_type: "Release",
        asset_id: releaseId,
        scope_type: "Release",
        notes: "Linked from Release creation workflow",
      },
    });
    return NextResponse.json(asset, { status: 201 });
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if ([400, 401, 403, 404].includes(mapped.status)) return NextResponse.json(mapped.body, { status: mapped.status });
    console.error("[POST /api/contracts/link-release]", err);
    return NextResponse.json({ error: "Unable to link contract to release" }, { status: 500 });
  }
}
