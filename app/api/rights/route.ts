import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import {
  canManageRights,
  canReviewRights,
  rightsRegistryService,
} from "@/lib/rights";
import { IntelligenceError } from "@/lib/document-intelligence";
import { bootstrapPlatformEvents } from "@/lib/platform/events";

function ok<T>(data: T) {
  return NextResponse.json({
    success: true,
    data,
    message: null,
    errors: null,
  });
}

function fail(message: string, status: number, code?: string) {
  return NextResponse.json(
    { success: false, data: null, message, errors: [message], code },
    { status }
  );
}

/** GET /api/rights */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOrganization();
    await bootstrapPlatformEvents();
    const sp = new URL(req.url).searchParams;
    const result = await rightsRegistryService.list({
      organizationId: ctx.organizationId,
      status: sp.get("status") || undefined,
      category: sp.get("category") || undefined,
      contractId: sp.get("contractId")
        ? parseInt(sp.get("contractId")!, 10)
        : undefined,
      limit: parseInt(sp.get("limit") || "50", 10),
      offset: parseInt(sp.get("offset") || "0", 10),
    });
    return ok({
      ...result,
      permissions: {
        canReview: canReviewRights(ctx),
        canManage: canManageRights(ctx),
      },
    });
  } catch (error) {
    if (error instanceof IntelligenceError) {
      return fail(error.message, error.status, error.code);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[GET /api/rights]", error);
    return fail("Unable to list rights", 500, "INTERNAL_ERROR");
  }
}
