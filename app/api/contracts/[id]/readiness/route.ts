import { NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import { IntelligenceError } from "@/lib/document-intelligence";
import { contractReadinessService } from "@/lib/contract-readiness";

function fail(message: string, status: number, code?: string) {
  return NextResponse.json(
    { success: false, data: null, message, errors: [message], code },
    { status }
  );
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const ctx = await requireOrganization();
    const params = await Promise.resolve(context.params);
    const contractId = Number.parseInt(params.id, 10);

    if (!Number.isFinite(contractId) || contractId <= 0) {
      return fail("Invalid contract id", 400, "INVALID_CONTRACT_ID");
    }

    const readiness = await contractReadinessService.evaluate({
      organizationId: ctx.organizationId,
      contractId,
    });

    return NextResponse.json({
      success: true,
      data: readiness,
      message: null,
      errors: null,
    });
  } catch (error) {
    if (error instanceof IntelligenceError) {
      return fail(error.message, error.status, error.code);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[GET contract readiness]", error);
    return fail("Unable to evaluate contract readiness", 500, "INTERNAL_ERROR");
  }
}
