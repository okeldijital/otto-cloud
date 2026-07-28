import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import { entitlementRegistryService } from "@/lib/royalties";
import { IntelligenceError } from "@/lib/document-intelligence";

/** GET /api/royalties/entitlements/:id/timeline */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const ctx = await requireOrganization();
    const params = await Promise.resolve(context.params);
    const limit = parseInt(
      new URL(req.url).searchParams.get("limit") || "100",
      10
    );
    const timeline = await entitlementRegistryService.getTimeline({
      organizationId: ctx.organizationId,
      entitlementId: params.id,
      limit,
    });
    return NextResponse.json({
      success: true,
      data: { timeline },
      message: null,
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
      { success: false, message: "Unable to load timeline" },
      { status: 500 }
    );
  }
}
