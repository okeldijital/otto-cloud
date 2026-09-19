import { NextResponse } from "next/server";
import { orgContextErrorResponse } from "@/lib/auth/organization-context";
import { contractLifecycleService } from "@/lib/contract-lifecycle";
import { requireProductOrganization } from "@/lib/platform/productization";

export async function GET() {
  try {
    const ctx = await requireProductOrganization("contracts.core");
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