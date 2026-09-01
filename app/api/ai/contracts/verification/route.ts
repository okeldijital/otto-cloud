import { NextRequest, NextResponse } from "next/server";
import { requireOrganization, orgContextErrorResponse } from "@/lib/auth/organization-context";
import { IntelligenceError, verificationService } from "@/lib/document-intelligence";

function failure(error: unknown) {
  if (error instanceof IntelligenceError) {
    return NextResponse.json({ success: false, data: null, message: error.message, errors: [error.message], code: error.code }, { status: error.status });
  }
  const org = orgContextErrorResponse(error);
  if (org) return NextResponse.json(org.body, { status: org.status });
  console.error("[contract verification]", error);
  return NextResponse.json({ success: false, data: null, message: "Unable to process verification", errors: ["Unable to process verification"], code: "INTERNAL_ERROR" }, { status: 500 });
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOrganization();
    const url = new URL(req.url);
    const documentId = url.searchParams.get("document_id");
    const extractionId = url.searchParams.get("extraction_id");
    if (!documentId || !extractionId) return NextResponse.json({ success: false, message: "document_id and extraction_id are required" }, { status: 400 });
    const data = await verificationService.getVerification({ organizationId: ctx.organizationId, documentId, extractionId, userId: ctx.userId, ensureSession: true });
    return NextResponse.json({ success: true, data, message: null, errors: null });
  } catch (error) { return failure(error); }
}

export async function PATCH(req: NextRequest) {
  try {
    const ctx = await requireOrganization();
    const body = await req.json();
    const { document_id, extraction_id, field_key, action, value } = body;
    if (!document_id || !extraction_id || !field_key || !action) return NextResponse.json({ success: false, message: "document_id, extraction_id, field_key and action are required" }, { status: 400 });
    const data = await verificationService.updateField({ ctx, organizationId: ctx.organizationId, documentId: document_id, extractionId: extraction_id, fieldKey: field_key, action, value });
    return NextResponse.json({ success: true, data, message: null, errors: null });
  } catch (error) { return failure(error); }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await requireOrganization();
    const body = await req.json();
    const { document_id, extraction_id, action, notes } = body;
    if (!document_id || !extraction_id || !action) return NextResponse.json({ success: false, message: "document_id, extraction_id and action are required" }, { status: 400 });

    if (action === "complete") {
      const data = await verificationService.complete({ ctx, organizationId: ctx.organizationId, documentId: document_id, extractionId: extraction_id, notes });
      return NextResponse.json({ success: true, data, message: null, errors: null });
    }
    if (action === "reopen") {
      const data = await verificationService.reopen({ ctx, organizationId: ctx.organizationId, documentId: document_id, extractionId: extraction_id, notes });
      return NextResponse.json({ success: true, data, message: null, errors: null });
    }
    return NextResponse.json({ success: false, message: "Unsupported verification action" }, { status: 400 });
  } catch (error) { return failure(error); }
}