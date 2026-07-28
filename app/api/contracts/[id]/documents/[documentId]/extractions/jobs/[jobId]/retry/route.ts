import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import {
  documentIntelligenceService,
  IntelligenceError,
} from "@/lib/document-intelligence";
import { contractDocumentService } from "@/lib/contract-center";

function ok<T>(data: T, status = 202, message?: string) {
  return NextResponse.json(
    { success: true, data, message: message ?? null, errors: null },
    { status }
  );
}

function fail(message: string, status: number, code?: string) {
  return NextResponse.json(
    { success: false, data: null, message, errors: [message], code },
    { status }
  );
}

function parseContractId(raw: string): number | null {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** POST /.../extractions/jobs/:jobId/retry */
export async function POST(
  _req: NextRequest,
  context: {
    params:
      | Promise<{ id: string; documentId: string; jobId: string }>
      | { id: string; documentId: string; jobId: string };
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

    const job = await documentIntelligenceService.retryExtraction({
      organizationId: ctx.organizationId,
      documentId: params.documentId,
      jobId: params.jobId,
      userId: ctx.userId,
      contractId,
    });

    return ok({ job }, 202, "Extraction retry queued");
  } catch (error) {
    if (error instanceof IntelligenceError) {
      return fail(error.message, error.status, error.code);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return orgErr;
    console.error("[POST job retry]", error);
    return fail("Unable to retry extraction", 500, "INTERNAL_ERROR");
  }
}
