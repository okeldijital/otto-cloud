import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import { entitlementRegistryService } from "@/lib/royalties";
import { IntelligenceError } from "@/lib/document-intelligence";

/** GET /api/royalties/entitlements/:id/provenance */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const ctx = await requireOrganization();
    const params = await Promise.resolve(context.params);
    const provenance = await entitlementRegistryService.getProvenance({
      organizationId: ctx.organizationId,
      entitlementId: params.id,
    });
    return NextResponse.json({
      success: true,
      data: { provenance },
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
      { success: false, message: "Unable to load provenance" },
      { status: 500 }
    );
  }
}
