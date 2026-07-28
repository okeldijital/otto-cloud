import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import { entitlementSearchService } from "@/lib/royalties";
import { bootstrapPlatformEvents } from "@/lib/platform/events";

/** GET /api/royalties/entitlements/search */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOrganization();
    await bootstrapPlatformEvents();
    const sp = new URL(req.url).searchParams;
    const items = await entitlementSearchService.search({
      organizationId: ctx.organizationId,
      q: sp.get("q") || undefined,
      revenueCategory: sp.get("revenueCategory") || undefined,
      status: sp.get("status") || undefined,
      rightId: sp.get("rightId") || undefined,
      beneficiary: sp.get("beneficiary") || undefined,
      territory: sp.get("territory") || undefined,
      limit: parseInt(sp.get("limit") || "30", 10),
    });
    return NextResponse.json({
      success: true,
      data: { items },
      message: null,
      errors: null,
    });
  } catch (error) {
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    return NextResponse.json(
      { success: false, message: "Search failed" },
      { status: 500 }
    );
  }
}
