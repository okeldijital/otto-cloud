import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import {
  canManageEntitlements,
  canReviewEntitlements,
  entitlementRegistryService,
} from "@/lib/royalties";
import { IntelligenceError } from "@/lib/document-intelligence";
import { bootstrapPlatformEvents } from "@/lib/platform/events";

/** GET /api/royalties/entitlements/:id */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const ctx = await requireOrganization();
    await bootstrapPlatformEvents();
    const params = await Promise.resolve(context.params);
    const entitlement = await entitlementRegistryService.getById({
      organizationId: ctx.organizationId,
      entitlementId: params.id,
    });
    return NextResponse.json({
      success: true,
      data: {
        entitlement,
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
      { success: false, message: "Unable to load entitlement" },
      { status: 500 }
    );
  }
}

/** PATCH /api/royalties/entitlements/:id */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const ctx = await requireOrganization();
    await bootstrapPlatformEvents();
    const params = await Promise.resolve(context.params);
    const body = await req.json();
    const entitlement = await entitlementRegistryService.update({
      ctx,
      organizationId: ctx.organizationId,
      entitlementId: params.id,
      title: body.title,
      description: body.description,
      revenueCategory: body.revenueCategory,
      status: body.status,
      effectiveDate: body.effectiveDate,
      expirationDate: body.expirationDate,
    });
    return NextResponse.json({
      success: true,
      data: { entitlement },
      message: "Entitlement updated",
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
      { success: false, message: "Unable to update entitlement" },
      { status: 500 }
    );
  }
}
