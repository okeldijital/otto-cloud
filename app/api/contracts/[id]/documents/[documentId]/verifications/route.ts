import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import { IntelligenceError } from "@/lib/document-intelligence";
import { verificationService } from "@/lib/document-intelligence/verification/verification-service";
import { contractDocumentService } from "@/lib/contract-center";
import { canVerifyDocuments } from "@/lib/document-intelligence/verification/permissions";

function ok<T>(data: T, status = 200, message?: string) {
  return NextResponse.json(
    { success: true, data, message: message ?? null, errors: null },
    { status }
  );
}

function fail(message: string, status: number, code?: string, errors?: string[]) {
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

async function assertLinked(
  contractId: number,
  documentId: string,
  organizationId: string,
  legacyIntOrgId: number
) {
  const list = await contractDocumentService.listForContract({
    contractId,
    organizationId,
    legacyIntOrgId,
    includeDeletedDocuments: true,
  });
  if (!list.items.some((i) => i.document.id === documentId)) {
    throw new IntelligenceError("Document not found", 404, "DOCUMENT_NOT_FOUND");
  }
}

/**
 * GET /.../verifications?extractionId=
 * Returns verification workspace payload (creates session if needed).
 */
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
    if (!contractId) return fail("Invalid contract id", 400, "INVALID_CONTRACT_ID");

    await assertLinked(
      contractId,
      params.documentId,
      ctx.organizationId,
      ctx.legacyIntOrgId
    );

    const extractionId = new URL(req.url).searchParams.get("extractionId");
    if (!extractionId) {
      return fail("extractionId is required", 400, "EXTRACTION_ID_REQUIRED");
    }

    const verification = await verificationService.getVerification({
      organizationId: ctx.organizationId,
      documentId: params.documentId,
      extractionId,
      userId: ctx.userId,
      ensureSession: true,
    });

    return ok({
      verification,
      permissions: { canVerify: canVerifyDocuments(ctx) },
    });
  } catch (error) {
    if (error instanceof IntelligenceError) {
      return fail(error.message, error.status, error.code, error.details);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[GET verifications]", error);
    return fail("Unable to load verification", 500, "INTERNAL_ERROR");
  }
}
