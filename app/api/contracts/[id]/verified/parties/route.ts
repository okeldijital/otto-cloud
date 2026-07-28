import { NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import { prisma } from "@/lib/prisma";
import { verifiedContractService } from "@/lib/verified-contract";

function ok<T>(data: T) {
  return NextResponse.json({
    success: true,
    data,
    message: null,
    errors: null,
  });
}

function fail(message: string, status: number, code?: string) {
  return NextResponse.json(
    { success: false, data: null, message, errors: [message], code },
    { status }
  );
}

function parseContractId(raw: string): number | null {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** GET /api/contracts/:id/verified/parties */
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const ctx = await requireOrganization();
    const params = await Promise.resolve(context.params);
    const contractId = parseContractId(params.id);
    if (!contractId) return fail("Invalid contract id", 400, "INVALID_CONTRACT_ID");

    const contract = await prisma.contracts.findFirst({
      where: { id: contractId, organization_id: ctx.legacyIntOrgId },
      select: { id: true },
    });
    if (!contract) return fail("Contract not found", 404, "CONTRACT_NOT_FOUND");

    const parties = await verifiedContractService.getParties({
      organizationId: ctx.organizationId,
      contractId,
    });

    return ok({ parties });
  } catch (error) {
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[GET verified parties]", error);
    return fail("Unable to load verified parties", 500, "INTERNAL_ERROR");
  }
}
