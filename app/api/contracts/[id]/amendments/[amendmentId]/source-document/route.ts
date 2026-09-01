import { NextRequest, NextResponse } from "next/server";
import { requireOrganization, orgContextErrorResponse } from "@/lib/auth/organization-context";
import { DocumentServiceError } from "@/lib/documents";
import { IntelligenceError } from "@/lib/document-intelligence";
import { contractDocumentService } from "@/lib/contract-center";
import { prisma } from "@/lib/prisma";

function parseId(value: string) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function failure(error: unknown) {
  if (error instanceof DocumentServiceError || error instanceof IntelligenceError) {
    return NextResponse.json({ success: false, data: null, message: error.message, errors: [error.message], code: error.code }, { status: error.status });
  }
  const org = orgContextErrorResponse(error);
  if (org) return NextResponse.json(org.body, { status: org.status });
  console.error("[amendment source document]", error);
  return NextResponse.json({ success: false, data: null, message: "Unable to attach amendment source document", errors: ["Unable to attach amendment source document"], code: "INTERNAL_ERROR" }, { status: 500 });
}

/**
 * POST /api/contracts/:id/amendments/:amendmentId/source-document
 *
 * Attaches the finalized amendment PDF as a new immutable Contract Document.
 * The source document is never overwritten and remains subject to the normal
 * document-intelligence + human-verification pipeline.
 */
export async function POST(req: NextRequest, context: { params: Promise<{ id: string; amendmentId: string }> | { id: string; amendmentId: string } }) {
  try {
    const ctx = await requireOrganization();
    const p = await Promise.resolve(context.params);
    const contractId = parseId(p.id);
    if (!contractId) return NextResponse.json({ success: false, data: null, message: "Invalid contract id", errors: ["Invalid contract id"], code: "INVALID_CONTRACT_ID" }, { status: 400 });

    const amendment = await prisma.contractAmendment.findFirst({
      where: { id: p.amendmentId, contractId, organizationId: ctx.organizationId },
      select: { id: true, status: true },
    });
    if (!amendment) return NextResponse.json({ success: false, data: null, message: "Amendment not found", errors: ["Amendment not found"], code: "AMENDMENT_NOT_FOUND" }, { status: 404 });
    if (amendment.status !== "registered") return NextResponse.json({ success: false, data: null, message: "Only registered amendments can receive a source document", errors: ["Only registered amendments can receive a source document"], code: "AMENDMENT_NOT_READY" }, { status: 409 });

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file || !(file instanceof File)) return NextResponse.json({ success: false, data: null, message: "PDF file is required", errors: ["No file provided"], code: "FILE_REQUIRED" }, { status: 400 });
    if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) return NextResponse.json({ success: false, data: null, message: "Amendment source document must be a PDF", errors: ["PDF required"], code: "PDF_REQUIRED" }, { status: 415 });

    const result = await contractDocumentService.uploadAndLink({
      organizationId: ctx.organizationId,
      legacyIntOrgId: ctx.legacyIntOrgId,
      contractId,
      userId: ctx.userId,
      fileName: file.name,
      mimeType: "application/pdf",
      body: Buffer.from(await file.arrayBuffer()),
      relationshipType: "amendment",
      ipAddress: req.headers.get("x-forwarded-for") || undefined,
      userAgent: req.headers.get("user-agent") || undefined,
    });

    await prisma.$executeRaw`
      UPDATE "contract_amendment_drafts"
      SET "sourceDocumentId" = ${result.document.id}::uuid,
          "status" = 'source_document_attached',
          "updatedBy" = ${ctx.userId},
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "organizationId" = ${ctx.organizationId}::uuid
        AND "contractId" = ${contractId}
        AND "amendmentId" = ${p.amendmentId}::uuid
        AND "status" = 'draft'
    `;

    return NextResponse.json({
      success: true,
      data: { document: result.document, relationshipId: result.relationshipId, relationshipType: result.relationshipType, sourceDocumentId: result.document.id },
      message: "Amendment source document attached",
      errors: null,
    }, { status: 201 });
  } catch (error) {
    return failure(error);
  }
}
