import { NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import { contractLifecycleService } from "@/lib/contract-lifecycle";

/**
 * GET /api/contracts/lifecycle-summary
 * Dashboard widgets for contract lifecycle.
 */
export async function GET() {
  try {
    const ctx = await requireOrganization();
    const summary = await contractLifecycleService.getDashboardSummary({
      organizationId: ctx.organizationId,
    });
    return NextResponse.json({
      success: true,
      data: { summary },
      message: null,
      errors: null,
    });
  } catch (error) {
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[GET lifecycle-summary]", error);
    return NextResponse.json(
      {
        success: false,
        data: null,
        message: "Unable to load lifecycle summary",
        errors: ["Unable to load lifecycle summary"],
      },
      { status: 500 }
    );
  }
}
