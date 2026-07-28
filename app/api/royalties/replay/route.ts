import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import { assertCanReplay } from "@/lib/platform/events/permissions";
import { entitlementPromotionService } from "@/lib/royalties";
import { IntelligenceError } from "@/lib/document-intelligence";
import { bootstrapPlatformEvents } from "@/lib/platform/events";

/** POST /api/royalties/replay { rightId } — re-run promotion candidates (no auto-approve) */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireOrganization();
    assertCanReplay(ctx);
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
    return NextResponse.json({
      success: true,
      data: result,
      message: "Entitlement promotion replay completed",
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
