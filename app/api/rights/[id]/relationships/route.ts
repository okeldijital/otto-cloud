import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import { rightsRegistryService } from "@/lib/rights";
import { IntelligenceError } from "@/lib/document-intelligence";
import { scopeRightRelationshipCollections } from "@/lib/rights/organization-scope";

/** GET /api/rights/:id/relationships */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const ctx = await requireOrganization();
    const params = await Promise.resolve(context.params);
    const relationships = await rightsRegistryService.getRelationships({
      organizationId: ctx.organizationId,
      rightId: params.id,
    });
    return NextResponse.json({
      success: true,
      data: {
        relationships: scopeRightRelationshipCollections(
          relationships,
          ctx.organizationId
        ),
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
      { success: false, message: "Unable to load relationships" },
      { status: 500 }
    );
  }
}
