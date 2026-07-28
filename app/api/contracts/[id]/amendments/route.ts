import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import { prisma } from "@/lib/prisma";
import { IntelligenceError } from "@/lib/document-intelligence";
import { contractLifecycleService } from "@/lib/contract-lifecycle";

function ok<T>(data: T, status = 200, message?: string) {
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

/** POST /api/contracts/:id/amendments */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const ctx = await requireOrganization();
    const params = await Promise.resolve(context.params);
    const contractId = parseContractId(params.id);
    if (!contractId) return fail("Invalid contract id", 400, "INVALID_CONTRACT_ID");

    const c = await prisma.contracts.findFirst({
      where: { id: contractId, organization_id: ctx.legacyIntOrgId },
      select: { id: true },
    });
    if (!c) return fail("Contract not found", 404, "CONTRACT_NOT_FOUND");

    const body = await req.json();
    const amendment = await contractLifecycleService.createAmendment({
      ctx,
      organizationId: ctx.organizationId,
      contractId,
      amendmentNumber: body.amendmentNumber,
      effectiveDate: body.effectiveDate,
      reason: body.reason,
      status: body.status,
      linkedVerifiedVersionId: body.linkedVerifiedVersionId,
      linkedVerifiedVersion: body.linkedVerifiedVersion,
    });

    return ok({ amendment }, 201, "Amendment registered");
  } catch (error) {
    if (error instanceof IntelligenceError) {
      return fail(error.message, error.status, error.code);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[POST amendments]", error);
    return fail("Unable to register amendment", 500, "INTERNAL_ERROR");
  }
}

/** GET list amendments via lifecycle */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const ctx = await requireOrganization();
    const params = await Promise.resolve(context.params);
    const contractId = parseContractId(params.id);
    if (!contractId) return fail("Invalid contract id", 400, "INVALID_CONTRACT_ID");

    const c = await prisma.contracts.findFirst({
      where: { id: contractId, organization_id: ctx.legacyIntOrgId },
      select: { id: true },
    });
    if (!c) return fail("Contract not found", 404, "CONTRACT_NOT_FOUND");

    const lifecycle = await contractLifecycleService.getOrCreate({
      organizationId: ctx.organizationId,
      contractId,
      userId: ctx.userId,
    });

    return ok({ amendments: lifecycle.amendments || [] });
  } catch (error) {
    if (error instanceof IntelligenceError) {
      return fail(error.message, error.status, error.code);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    return fail("Unable to load amendments", 500, "INTERNAL_ERROR");
  }
}
