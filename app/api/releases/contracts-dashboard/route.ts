import { NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import { bootstrapPlatformEvents } from "@/lib/platform/events";
import { releaseContractReadModelService } from "@/lib/release-workspace/contracts";

/**
 * GET /api/releases/contracts-dashboard
 * Org-level Release Workspace contract integration cards.
 */
export async function GET() {
  try {
    const ctx = await requireOrganization();
    await bootstrapPlatformEvents();
    const dashboard = await releaseContractReadModelService.getDashboard({
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
    console.error("[GET releases/contracts-dashboard]", error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: "Unable to load dashboard",
        errors: ["Unable to load dashboard"],
      },
      { status: 500 }
    );
  }
}
