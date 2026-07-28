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

/** POST { extractionId, notes?, confirm: true } */
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
    if (!body?.extractionId) {
      return fail("extractionId is required", 400, "VALIDATION");
    }
    if (body.confirm !== true) {
      return fail("Completion requires confirm: true", 400, "CONFIRM_REQUIRED");
    }

    const verification = await verificationService.complete({
      ctx,
      organizationId: ctx.organizationId,
      documentId: params.documentId,
      extractionId: body.extractionId,
      notes: body.notes,
    });

    return ok({ verification }, "Verification completed");
  } catch (error) {
    if (error instanceof IntelligenceError) {
      return fail(error.message, error.status, error.code, error.details);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[POST complete verification]", error);
    return fail("Unable to complete verification", 500, "INTERNAL_ERROR");
  }
}
