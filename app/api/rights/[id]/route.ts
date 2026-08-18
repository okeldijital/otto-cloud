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
import { scopeRightRelationships } from "@/lib/rights/organization-scope";

function ok<T>(data: T, message?: string) {
  return NextResponse.json({
    success: true,
    data,
    message: message ?? null,
    errors: null,
  });
}

function fail(message: string, status: number, code?: string) {
  return NextResponse.json(
    { success: false, data: null, message, errors: [message], code },
    { status }
  );
}

/** GET /api/rights/:id */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const ctx = await requireOrganization();
    await bootstrapPlatformEvents();
    const params = await Promise.resolve(context.params);
    const right = await rightsRegistryService.getById({
      organizationId: ctx.organizationId,
      rightId: params.id,
    });
    return ok({
      right: scopeRightRelationships(right, ctx.organizationId),
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
    return fail("Unable to load right", 500, "INTERNAL_ERROR");
  }
}

/** PATCH /api/rights/:id */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const ctx = await requireOrganization();
    await bootstrapPlatformEvents();
    const params = await Promise.resolve(context.params);
    const body = await req.json();
    const right = await rightsRegistryService.update({
      ctx,
      organizationId: ctx.organizationId,
      rightId: params.id,
      title: body.title,
      description: body.description,
      category: body.category,
      exclusive: body.exclusive,
      status: body.status,
      ownerType: body.ownerType,
      ownerEntityId: body.ownerEntityId,
      ownerName: body.ownerName,
      effectiveDate: body.effectiveDate,
      expirationDate: body.expirationDate,
      restrictions: body.restrictions,
    });
    return ok(
      { right: scopeRightRelationships(right, ctx.organizationId) },
      "Right updated"
    );
  } catch (error) {
    if (error instanceof IntelligenceError) {
      return fail(error.message, error.status, error.code);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[PATCH /api/rights/:id]", error);
    return fail("Unable to update right", 500, "INTERNAL_ERROR");
  }
}
