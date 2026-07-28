import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import { assertCanReplay } from "@/lib/platform/events/permissions";
import { rightsPromotionService } from "@/lib/rights";
import { IntelligenceError } from "@/lib/document-intelligence";
import { bootstrapPlatformEvents } from "@/lib/platform/events";

/**
 * POST /api/rights/replay
 * Re-run promotion candidate builder for a contract (does not auto-approve).
 * { contractId }
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireOrganization();
    assertCanReplay(ctx);
    await bootstrapPlatformEvents();
    const body = await req.json();
    const contractId = parseInt(body.contractId, 10);
    if (!Number.isFinite(contractId) || contractId <= 0) {
      return NextResponse.json(
        { success: false, message: "contractId is required" },
        { status: 400 }
      );
    }

    const result = await rightsPromotionService.promoteFromVerifiedContract({
      ctx,
      organizationId: ctx.organizationId,
      contractId,
    });

    return NextResponse.json({
      success: true,
      data: result,
      message: "Rights promotion replay completed",
      errors: null,
    });
  } catch (error) {
    if (error instanceof IntelligenceError) {
      return NextResponse.json(
        { success: false, message: error.message, code: error.code },
        { status: error.status }
      );
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    return NextResponse.json(
      { success: false, message: "Replay failed" },
      { status: 500 }
    );
  }
}
