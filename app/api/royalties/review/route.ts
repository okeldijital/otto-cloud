import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import { entitlementReviewService } from "@/lib/royalties";
import { IntelligenceError } from "@/lib/document-intelligence";
import { bootstrapPlatformEvents } from "@/lib/platform/events";

/** GET /api/royalties/review */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOrganization();
    await bootstrapPlatformEvents();
    const sp = new URL(req.url).searchParams;
    const candidates = await entitlementReviewService.listCandidates({
      organizationId: ctx.organizationId,
      status: sp.get("status") || "pending",
      limit: parseInt(sp.get("limit") || "50", 10),
    });
    return NextResponse.json({
      success: true,
      data: { candidates },
      message: null,
      errors: null,
    });
  } catch (error) {
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    return NextResponse.json(
      { success: false, message: "Unable to load review queue" },
      { status: 500 }
    );
  }
}

/** POST /api/royalties/review { candidateId, decision, notes?, edits? } */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireOrganization();
    await bootstrapPlatformEvents();
    const body = await req.json();
    if (!body.candidateId || !["approve", "reject"].includes(body.decision)) {
      return NextResponse.json(
        {
          success: false,
          message: "candidateId and decision (approve|reject) required",
        },
        { status: 400 }
      );
    }
    const result = await entitlementReviewService.decide({
      ctx,
      organizationId: ctx.organizationId,
      candidateId: body.candidateId,
      decision: body.decision,
      notes: body.notes,
      edits: body.edits,
    });
    return NextResponse.json({
      success: true,
      data: result,
      message: `Candidate ${body.decision}d`,
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
      { success: false, message: "Review failed" },
      { status: 500 }
    );
  }
}
