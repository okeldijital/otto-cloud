import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import { entitlementPromotionService } from "@/lib/royalties";
import { IntelligenceError } from "@/lib/document-intelligence";
import { bootstrapPlatformEvents } from "@/lib/platform/events";

/** POST /api/royalties/promote { rightId } — from approved Rights only */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireOrganization();
    await bootstrapPlatformEvents();
    const body = await req.json();
    if (!body.rightId) {
      return NextResponse.json(
        { success: false, message: "rightId is required" },
        { status: 400 }
      );
    }
    const result = await entitlementPromotionService.promoteFromRight({
      ctx,
      organizationId: ctx.organizationId,
      rightId: body.rightId,
    });
    return NextResponse.json(
      {
        success: true,
        data: result,
        message: `Created ${result.candidateCount} entitlement candidate(s)`,
        errors: null,
      },
      { status: 201 }
    );
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
      { success: false, message: "Promotion failed" },
      { status: 500 }
    );
  }
}
