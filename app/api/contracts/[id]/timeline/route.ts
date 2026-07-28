import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import { prisma } from "@/lib/prisma";
import { IntelligenceError } from "@/lib/document-intelligence";
import { contractLifecycleService } from "@/lib/contract-lifecycle";

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

/** GET /api/contracts/:id/timeline */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const ctx = await requireOrganization();
    const params = await Promise.resolve(context.params);
    const contractId = parseContractId(params.id);
    if (!contractId) return fail("Invalid contract id", 400, "INVALID_CONTRACT_ID");

    const c = await prisma.contracts.findFirst({
      where: { id: contractId, organization_id: ctx.legacyIntOrgId },
      select: { id: true },
    });
    if (!c) return fail("Contract not found", 404, "CONTRACT_NOT_FOUND");

    const limit = parseInt(
      new URL(req.url).searchParams.get("limit") || "100",
      10
    );
    const timeline = await contractLifecycleService.getTimeline({
      organizationId: ctx.organizationId,
      contractId,
      limit: Number.isFinite(limit) ? limit : 100,
    });

    return ok({ timeline });
  } catch (error) {
    if (error instanceof IntelligenceError) {
      return fail(error.message, error.status, error.code);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[GET timeline]", error);
    return fail("Unable to load timeline", 500, "INTERNAL_ERROR");
  }
}
