import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import { rightsSearchService } from "@/lib/rights";
import { bootstrapPlatformEvents } from "@/lib/platform/events";

/** GET /api/rights/search?q=&category=&status=&territory=&owner= */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOrganization();
    await bootstrapPlatformEvents();
    const sp = new URL(req.url).searchParams;
    const items = await rightsSearchService.search({
      organizationId: ctx.organizationId,
      q: sp.get("q") || undefined,
      category: sp.get("category") || undefined,
      status: sp.get("status") || undefined,
      contractId: sp.get("contractId")
        ? parseInt(sp.get("contractId")!, 10)
        : undefined,
      territory: sp.get("territory") || undefined,
      owner: sp.get("owner") || undefined,
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
