import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import { prisma } from "@/lib/prisma";
import { IntelligenceError } from "@/lib/document-intelligence";
import { relationshipService } from "@/lib/contract-relationships";

function ok<T>(data: T, message?: string) {
  return NextResponse.json({
    success: true,
    data,
    message: message ?? null,
    errors: null,
  });
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

async function assertContract(contractId: number, legacyIntOrgId: number) {
  const c = await prisma.contracts.findFirst({
    where: { id: contractId, organization_id: legacyIntOrgId },
    select: { id: true },
  });
  if (!c) throw new IntelligenceError("Contract not found", 404, "CONTRACT_NOT_FOUND");
}

/** PATCH update relationship type / reason */
export async function PATCH(
  req: NextRequest,
  context: {
    params:
      | Promise<{ id: string; relationshipId: string }>
      | { id: string; relationshipId: string };
  }
) {
  try {
    const ctx = await requireOrganization();
    const params = await Promise.resolve(context.params);
    const contractId = parseContractId(params.id);
    if (!contractId) return fail("Invalid contract id", 400, "INVALID_CONTRACT_ID");
    await assertContract(contractId, ctx.legacyIntOrgId);

    const body = await req.json();
    const rel = await relationshipService.update({
      ctx,
      organizationId: ctx.organizationId,
      contractId,
      relationshipId: params.relationshipId,
      relationshipType: body.relationshipType,
      reason: body.reason,
    });

    return ok({ relationship: rel }, "Relationship updated");
  } catch (error) {
    if (error instanceof IntelligenceError) {
      return fail(error.message, error.status, error.code);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[PATCH relationship]", error);
    return fail("Unable to update relationship", 500, "INTERNAL_ERROR");
  }
}

/** DELETE soft-remove relationship */
export async function DELETE(
  _req: NextRequest,
  context: {
    params:
      | Promise<{ id: string; relationshipId: string }>
      | { id: string; relationshipId: string };
  }
) {
  try {
    const ctx = await requireOrganization();
    const params = await Promise.resolve(context.params);
    const contractId = parseContractId(params.id);
    if (!contractId) return fail("Invalid contract id", 400, "INVALID_CONTRACT_ID");
    await assertContract(contractId, ctx.legacyIntOrgId);

    const rel = await relationshipService.remove({
      ctx,
      organizationId: ctx.organizationId,
      contractId,
      relationshipId: params.relationshipId,
    });

    return ok({ relationship: rel }, "Relationship removed");
  } catch (error) {
    if (error instanceof IntelligenceError) {
      return fail(error.message, error.status, error.code);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[DELETE relationship]", error);
    return fail("Unable to remove relationship", 500, "INTERNAL_ERROR");
  }
}
