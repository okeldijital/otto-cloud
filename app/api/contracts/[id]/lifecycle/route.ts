import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import { prisma } from "@/lib/prisma";
import { IntelligenceError } from "@/lib/document-intelligence";
import {
  canManageLifecycle,
  contractLifecycleService,
} from "@/lib/contract-lifecycle";

function ok<T>(data: T, message?: string) {
  return NextResponse.json({
    success: true,
    data,
    message: message ?? null,
    errors: null,
  });
}

function fail(message: string, status: number, code?: string, errors?: string[]) {
  return NextResponse.json(
    { success: false, data: null, message, errors: errors ?? [message], code },
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

/** GET /api/contracts/:id/lifecycle */
export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const ctx = await requireOrganization();
    const params = await Promise.resolve(context.params);
    const contractId = parseContractId(params.id);
    if (!contractId) return fail("Invalid contract id", 400, "INVALID_CONTRACT_ID");
    await assertContract(contractId, ctx.legacyIntOrgId);

    const lifecycle = await contractLifecycleService.getOrCreate({
      organizationId: ctx.organizationId,
      contractId,
      userId: ctx.userId,
    });

    return ok({
      lifecycle,
      permissions: { canManage: canManageLifecycle(ctx) },
    });
  } catch (error) {
    if (error instanceof IntelligenceError) {
      return fail(error.message, error.status, error.code, error.details);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[GET lifecycle]", error);
    return fail("Unable to load lifecycle", 500, "INTERNAL_ERROR");
  }
}

/** PATCH /api/contracts/:id/lifecycle */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const ctx = await requireOrganization();
    const params = await Promise.resolve(context.params);
    const contractId = parseContractId(params.id);
    if (!contractId) return fail("Invalid contract id", 400, "INVALID_CONTRACT_ID");
    await assertContract(contractId, ctx.legacyIntOrgId);

    const body = await req.json();
    const lifecycle = await contractLifecycleService.update({
      ctx,
      organizationId: ctx.organizationId,
      contractId,
      status: body.status,
      autoRenew: body.autoRenew,
      renewalIntervalMonths: body.renewalIntervalMonths,
      noticePeriodDays: body.noticePeriodDays,
      renewalStatus: body.renewalStatus,
      notes: body.notes,
      keyDates: body.keyDates,
      supersedesContractId: body.supersedesContractId,
      supersessionReason: body.supersessionReason,
      supersessionDate: body.supersessionDate,
      markRenewed: body.markRenewed,
    });

    return ok({ lifecycle }, "Lifecycle updated");
  } catch (error) {
    if (error instanceof IntelligenceError) {
      return fail(error.message, error.status, error.code, error.details);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[PATCH lifecycle]", error);
    return fail("Unable to update lifecycle", 500, "INTERNAL_ERROR");
  }
}
