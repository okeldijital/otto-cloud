import { NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import { entitlementDashboardService } from "@/lib/royalties";
import { bootstrapPlatformEvents } from "@/lib/platform/events";

/**
 * GET /api/royalties/dashboard
 * Entitlement dashboard (not legacy statement summary).
 */
export async function GET() {
  try {
    const ctx = await requireOrganization();
    await bootstrapPlatformEvents();
    const dashboard = await entitlementDashboardService.getSummary({
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
