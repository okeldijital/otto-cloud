import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import { IntelligenceError } from "@/lib/document-intelligence";
import { verificationService } from "@/lib/document-intelligence/verification/verification-service";
import { contractDocumentService } from "@/lib/contract-center";

function ok<T>(data: T, message?: string) {
  return NextResponse.json({
    success: true,
    data,
    message: message ?? null,
    errors: null,
  });
}

function fail(message: string, status: number, code?: string, errors?: string[]) {
  return NextResponse.json(
    { success: false, data: null, message, errors: errors ?? [message], code },
    { status }
  );
}

function parseContractId(raw: string): number | null {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * PATCH update single field: { extractionId, fieldKey, action, value? }
 * POST bulk: { extractionId, action: accept_above_threshold|reject_all, confidenceThreshold? }
 */
export async function PATCH(
  req: NextRequest,
  context: {
    params: Promise<{ id: string; documentId: string }> | { id: string; documentId: string };
  }
) {
  try {
    const ctx = await requireOrganization();
    const params = await Promise.resolve(context.params);
    const contractId = parseContractId(params.id);
    if (!contractId) return fail("Invalid contract id", 400, "INVALID_CONTRACT_ID");

    const list = await contractDocumentService.listForContract({
      contractId,
      organizationId: ctx.organizationId,
      legacyIntOrgId: ctx.legacyIntOrgId,
      includeDeletedDocuments: true,
    });
    if (!list.items.some((i) => i.document.id === params.documentId)) {
      return fail("Document not found", 404, "DOCUMENT_NOT_FOUND");
    }

    const body = await req.json();
    const { extractionId, fieldKey, action, value } = body || {};
    if (!extractionId || !fieldKey || !action) {
      return fail("extractionId, fieldKey, and action are required", 400, "VALIDATION");
    }

    await verificationService.updateField({
      ctx,
      organizationId: ctx.organizationId,
      documentId: params.documentId,
      extractionId,
      fieldKey,
      action,
      value,
    });

    const verification = await verificationService.getVerification({
      organizationId: ctx.organizationId,
      documentId: params.documentId,
      extractionId,
      userId: ctx.userId,
      ensureSession: false,
    });

    return ok({ verification }, "Field updated");
  } catch (error) {
    if (error instanceof IntelligenceError) {
      return fail(error.message, error.status, error.code, error.details);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[PATCH verification field]", error);
    return fail("Unable to update field", 500, "INTERNAL_ERROR");
  }
}

export async function POST(
  req: NextRequest,
  context: {
    params: Promise<{ id: string; documentId: string }> | { id: string; documentId: string };
  }
) {
  try {
    const ctx = await requireOrganization();
    const params = await Promise.resolve(context.params);
    const contractId = parseContractId(params.id);
    if (!contractId) return fail("Invalid contract id", 400, "INVALID_CONTRACT_ID");

    const list = await contractDocumentService.listForContract({
      contractId,
      organizationId: ctx.organizationId,
      legacyIntOrgId: ctx.legacyIntOrgId,
      includeDeletedDocuments: true,
    });
    if (!list.items.some((i) => i.document.id === params.documentId)) {
      return fail("Document not found", 404, "DOCUMENT_NOT_FOUND");
    }

    const body = await req.json();
    const { extractionId, action, confidenceThreshold } = body || {};
    if (!extractionId || !action) {
      return fail("extractionId and action are required", 400, "VALIDATION");
    }
    if (action !== "accept_above_threshold" && action !== "reject_all") {
      return fail("Invalid bulk action", 400, "INVALID_ACTION");
    }

    const result = await verificationService.bulkUpdate({
      ctx,
      organizationId: ctx.organizationId,
      documentId: params.documentId,
      extractionId,
      action,
      confidenceThreshold,
    });

    const verification = await verificationService.getVerification({
      organizationId: ctx.organizationId,
      documentId: params.documentId,
      extractionId,
      userId: ctx.userId,
      ensureSession: false,
    });

    return ok({ ...result, verification }, "Bulk update applied");
  } catch (error) {
    if (error instanceof IntelligenceError) {
      return fail(error.message, error.status, error.code, error.details);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[POST verification bulk]", error);
    return fail("Unable to bulk update", 500, "INTERNAL_ERROR");
  }
}
