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

function safeFilename(name: string): string {
  return (name || "document.pdf").replace(/[^\w.\- ()[\]]+/g, "_").slice(0, 180);
}

/**
 * GET /api/contracts/:id/documents/:documentId/download
 *
 * - default / format=json → short-lived signed URL (never exposes keys/buckets)
 * - format=stream → server-side proxy of bytes (for PDF viewer; avoids browser CORS on R2)
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
    if (!contractId) {
      return apiError("Invalid contract id", 400, null, "INVALID_CONTRACT_ID");
    }
    if (!params.documentId) {
      return apiError("Invalid document id", 400, null, "INVALID_DOCUMENT_ID");
    }

    const format =
      new URL(req.url).searchParams.get("format") ||
      (req.headers.get("accept")?.includes("application/pdf") ? "stream" : "json");

    const result = await contractDocumentService.getDownloadUrl({
      contractId,
      documentId: params.documentId,
      organizationId: ctx.organizationId,
      legacyIntOrgId: ctx.legacyIntOrgId,
    });

    if (format === "stream" || format === "inline") {
      const remote = await fetch(result.url);
      if (!remote.ok) {
        return apiError(
          "Document unavailable",
          remote.status === 403 || remote.status === 401 ? 403 : 502,
          null,
          "DOCUMENT_UNAVAILABLE"
        );
      }
      const filename = safeFilename(result.filename);
      const headers = new Headers();
      headers.set("Content-Type", result.mimeType || "application/pdf");
      headers.set(
        "Content-Disposition",
        format === "inline"
          ? `inline; filename="${filename}"`
          : `inline; filename="${filename}"`
      );
      headers.set("Cache-Control", "private, no-store");
      headers.set("X-Content-Type-Options", "nosniff");
      return new NextResponse(remote.body, { status: 200, headers });
    }

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
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[GET .../documents/:documentId/download]", error);
    return apiError("Unable to download", 500, null, "INTERNAL_ERROR");
  }
}
