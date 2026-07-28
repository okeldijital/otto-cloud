import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import { DocumentServiceError } from "@/lib/documents";
import { contractDocumentService } from "@/lib/contract-center";

function apiSuccess<T>(data: T, status = 200, message?: string) {
  return NextResponse.json(
    {
      success: true,
      data,
      message: message ?? null,
      errors: null,
    },
    { status }
  );
}

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
 * DELETE /api/contracts/:id/documents/:documentId
 *
 * Soft-delete via Contract Center facade. HTTP contract unchanged.
 */
export async function DELETE(
  req: NextRequest,
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

    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    const document = await contractDocumentService.softDeleteLinked({
      contractId,
      documentId: params.documentId,
      organizationId: ctx.organizationId,
      legacyIntOrgId: ctx.legacyIntOrgId,
      userId: ctx.userId,
      ipAddress,
      userAgent,
    });

    return apiSuccess({ document }, 200, "Document deleted");
  } catch (error) {
    if (error instanceof DocumentServiceError) {
      return apiError(error.message, error.status, error.details ?? null, error.code);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[DELETE /api/contracts/:id/documents/:documentId]", error);
    return apiError("Internal server error", 500, null, "INTERNAL_ERROR");
  }
}
