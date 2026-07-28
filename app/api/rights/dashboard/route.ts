import { NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import { rightsDashboardService } from "@/lib/rights";
import { bootstrapPlatformEvents } from "@/lib/platform/events";

/** GET /api/rights/dashboard */
export async function GET() {
  try {
    const ctx = await requireOrganization();
    await bootstrapPlatformEvents();
    const dashboard = await rightsDashboardService.getSummary({
      organizationId: ctx.organizationId,
    });
    return NextResponse.json({
      success: true,
      data: { dashboard },
      message: null,
      errors: null,
    });
  } catch (error) {
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    return NextResponse.json(
      { success: false, message: "Unable to load dashboard" },
      { status: 500 }
    );
  }
}
