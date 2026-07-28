import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import { DocumentServiceError } from "@/lib/documents";
import { contractDocumentService } from "@/lib/contract-center";

function apiError(
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
      code: code ?? undefined,
    },
    { status }
  );
}

function parseContractId(raw: string): number | null {
  const id = parseInt(raw, 10);
  return Number.isFinite(id) && id > 0 ? id : null;
}

/**
 * GET /api/contracts/:id/documents/:documentId/download
 *
 * Returns a short-lived signed URL. Never exposes storage keys or buckets.
 */
export async function GET(
  _req: NextRequest,
  context: {
    params: Promise<{ id: string; documentId: string }> | { id: string; documentId: string };
  }
) {
  try {
    const ctx = await requireOrganization();
    const params = await Promise.resolve(context.params);
    const contractId = parseContractId(params.id);
    if (!contractId) {
      return apiError("Invalid contract id", 400, null, "INVALID_CONTRACT_ID");
    }
    if (!params.documentId) {
      return apiError("Invalid document id", 400, null, "INVALID_DOCUMENT_ID");
    }

    const result = await contractDocumentService.getDownloadUrl({
      contractId,
      documentId: params.documentId,
      organizationId: ctx.organizationId,
      legacyIntOrgId: ctx.legacyIntOrgId,
    });

    return NextResponse.json({
      success: true,
      data: {
        url: result.url,
        filename: result.filename,
        mimeType: result.mimeType,
      },
      message: null,
      errors: null,
    });
  } catch (error) {
    if (error instanceof DocumentServiceError) {
      return apiError(error.message, error.status, error.details ?? null, error.code);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return orgErr;
    console.error("[GET .../documents/:documentId/download]", error);
    return apiError("Unable to download", 500, null, "INTERNAL_ERROR");
  }
}
