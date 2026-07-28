import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import {
  canManageEntitlements,
  canReviewEntitlements,
  entitlementRegistryService,
  entitlementSearchService,
} from "@/lib/royalties";
import { IntelligenceError } from "@/lib/document-intelligence";
import { bootstrapPlatformEvents } from "@/lib/platform/events";

/** GET /api/royalties/entitlements  (?q= for search) */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOrganization();
    await bootstrapPlatformEvents();
    const sp = new URL(req.url).searchParams;
    const q = sp.get("q");

    if (q || sp.get("beneficiary") || sp.get("territory")) {
      const items = await entitlementSearchService.search({
        organizationId: ctx.organizationId,
        q: q || undefined,
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
    }

    const result = await entitlementRegistryService.list({
      organizationId: ctx.organizationId,
      status: sp.get("status") || undefined,
      revenueCategory: sp.get("revenueCategory") || undefined,
      rightId: sp.get("rightId") || undefined,
      limit: parseInt(sp.get("limit") || "50", 10),
      offset: parseInt(sp.get("offset") || "0", 10),
    });

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        permissions: {
          canReview: canReviewEntitlements(ctx),
          canManage: canManageEntitlements(ctx),
        },
      },
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
      { success: false, message: "Unable to list entitlements" },
      { status: 500 }
    );
  }
}
