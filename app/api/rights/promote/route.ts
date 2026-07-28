import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import { rightsPromotionService } from "@/lib/rights";
import { IntelligenceError } from "@/lib/document-intelligence";
import { bootstrapPlatformEvents } from "@/lib/platform/events";

/** POST /api/rights/promote { contractId } */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireOrganization();
    await bootstrapPlatformEvents();
    const body = await req.json();
    const contractId = parseInt(body.contractId, 10);
    if (!Number.isFinite(contractId) || contractId <= 0) {
      return NextResponse.json(
        {
          success: false,
          message: "contractId is required",
          code: "CONTRACT_ID_REQUIRED",
        },
        { status: 400 }
      );
    }

    const result = await rightsPromotionService.promoteFromVerifiedContract({
      ctx,
      organizationId: ctx.organizationId,
      contractId,
    });

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: `Created ${result.candidateCount} rights candidate(s) for review`,
        errors: null,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof IntelligenceError) {
      return NextResponse.json(
        {
          success: false,
          message: error.message,
          code: error.code,
          errors: [error.message],
        },
        { status: error.status }
      );
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[POST /api/rights/promote]", error);
    return NextResponse.json(
      { success: false, message: "Promotion failed" },
      { status: 500 }
    );
  }
}
