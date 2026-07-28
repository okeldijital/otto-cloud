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
 * GET /api/contracts/:id/documents
 * POST /api/contracts/:id/documents
 *
 * Contract Center routes — facade over Document Platform + relationship table.
 * HTTP contract unchanged from Milestone 2.1.
 */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const ctx = await requireOrganization();
    const params = await Promise.resolve(context.params);
    const contractId = parseContractId(params.id);
    if (!contractId) {
      return apiError("Invalid contract id", 400, null, "INVALID_CONTRACT_ID");
    }

    const includeDeleted =
      new URL(_req.url).searchParams.get("includeDeleted") !== "false";

    const result = await contractDocumentService.listForContract({
      contractId,
      organizationId: ctx.organizationId,
      legacyIntOrgId: ctx.legacyIntOrgId,
      includeDeletedDocuments: includeDeleted,
    });

    return apiSuccess(result);
  } catch (error) {
    if (error instanceof DocumentServiceError) {
      return apiError(error.message, error.status, error.details ?? null, error.code);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return orgErr;
    console.error("[GET /api/contracts/:id/documents]", error);
    return apiError("Internal server error", 500, null, "INTERNAL_ERROR");
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const ctx = await requireOrganization();
    const params = await Promise.resolve(context.params);
    const contractId = parseContractId(params.id);
    if (!contractId) {
      return apiError("Invalid contract id", 400, null, "INVALID_CONTRACT_ID");
    }

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) {
      return apiError("File is required", 400, ["No file provided"], "FILE_REQUIRED");
    }

    const relationshipType =
      (formData.get("relationshipType") as string | null) || undefined;

    const buffer = Buffer.from(await file.arrayBuffer());
    const ipAddress = req.headers.get("x-forwarded-for") || undefined;
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await contractDocumentService.uploadAndLink({
      organizationId: ctx.organizationId,
      legacyIntOrgId: ctx.legacyIntOrgId,
      contractId,
      userId: ctx.userId,
      fileName: file.name,
      mimeType: file.type || "application/pdf",
      body: buffer,
      relationshipType,
      ipAddress,
      userAgent,
    });

    return apiSuccess(
      {
        document: result.document,
        relationshipId: result.relationshipId,
        relationshipType: result.relationshipType,
        uploadedAt: result.uploadedAt,
      },
      201,
      "Document uploaded"
    );
  } catch (error) {
    if (error instanceof DocumentServiceError) {
      return apiError(error.message, error.status, error.details ?? null, error.code);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return orgErr;
    console.error("[POST /api/contracts/:id/documents]", error);
    return apiError("Internal server error", 500, null, "INTERNAL_ERROR");
  }
}
