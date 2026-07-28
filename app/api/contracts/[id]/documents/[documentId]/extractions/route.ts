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
import { DocumentServiceError } from "@/lib/documents";

function ok<T>(data: T, status = 200, message?: string) {
  return NextResponse.json(
    { success: true, data, message: message ?? null, errors: null },
    { status }
  );
}

function fail(
  message: string,
  status: number,
  errors?: string[] | null,
  code?: string
) {
  return NextResponse.json(
    {
      success: false,
      data: null,
      message,
      errors: errors ?? [message],
      code,
    },
    { status }
  );
}

function parseContractId(raw: string): number | null {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function assertContractDocument(
  contractId: number,
  documentId: string,
  organizationId: string,
  legacyIntOrgId: number
) {
  // Ensures document is linked to contract for this org
  const list = await contractDocumentService.listForContract({
    contractId,
    organizationId,
    legacyIntOrgId,
    includeDeletedDocuments: true,
  });
  const hit = list.items.find((i) => i.document.id === documentId);
  if (!hit) {
    throw new IntelligenceError("Document not found on contract", 404, "DOCUMENT_NOT_FOUND");
  }
  return hit;
}

/**
 * POST — start extraction
 * GET  — latest job status + optional result summary
 */
export async function POST(
  _req: NextRequest,
  context: {
    params: Promise<{ id: string; documentId: string }> | { id: string; documentId: string };
  }
) {
  try {
    const ctx = await requireOrganization();
    const params = await Promise.resolve(context.params);
    const contractId = parseContractId(params.id);
    if (!contractId) return fail("Invalid contract id", 400, null, "INVALID_CONTRACT_ID");
    if (!params.documentId) return fail("Invalid document id", 400, null, "INVALID_DOCUMENT_ID");

    await assertContractDocument(
      contractId,
      params.documentId,
      ctx.organizationId,
      ctx.legacyIntOrgId
    );

    const job = await documentIntelligenceService.startExtraction({
      organizationId: ctx.organizationId,
      documentId: params.documentId,
      contractId,
      userId: ctx.userId,
    });

    return ok({ job }, 202, "Extraction queued");
  } catch (error) {
    if (error instanceof IntelligenceError) {
      return fail(error.message, error.status, error.details ?? null, error.code);
    }
    if (error instanceof DocumentServiceError) {
      return fail(error.message, error.status, error.details ?? null, error.code);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[POST extractions]", error);
    return fail("Unable to start extraction", 500, null, "INTERNAL_ERROR");
  }
}

export async function GET(
  req: NextRequest,
  context: {
    params: Promise<{ id: string; documentId: string }> | { id: string; documentId: string };
  }
) {
  try {
    const ctx = await requireOrganization();
    const params = await Promise.resolve(context.params);
    const contractId = parseContractId(params.id);
    if (!contractId) return fail("Invalid contract id", 400, null, "INVALID_CONTRACT_ID");
    if (!params.documentId) return fail("Invalid document id", 400, null, "INVALID_DOCUMENT_ID");

    await assertContractDocument(
      contractId,
      params.documentId,
      ctx.organizationId,
      ctx.legacyIntOrgId
    );

    const jobId = new URL(req.url).searchParams.get("jobId") || undefined;

    try {
      const status = await documentIntelligenceService.getJobStatus({
        organizationId: ctx.organizationId,
        documentId: params.documentId,
        jobId,
      });
      return ok(status);
    } catch (error) {
      if (error instanceof IntelligenceError && error.code === "JOB_NOT_FOUND") {
        return ok({ job: null, extractionId: null, extractionStatus: null });
      }
      throw error;
    }
  } catch (error) {
    if (error instanceof IntelligenceError) {
      return fail(error.message, error.status, error.details ?? null, error.code);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[GET extractions]", error);
    return fail("Unable to load extraction status", 500, null, "INTERNAL_ERROR");
  }
}
