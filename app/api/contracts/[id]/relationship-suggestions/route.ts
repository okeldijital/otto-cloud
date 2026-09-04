import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import { prisma } from "@/lib/prisma";
import { IntelligenceError } from "@/lib/document-intelligence";
import {
  canManageRelationships,
  relationshipDiscoveryService,
  relationshipService,
} from "@/lib/contract-relationships";

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

/** GET list suggestions; POST discover/refresh or search targets */
export async function GET(
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

    const status = new URL(req.url).searchParams.get("status") || undefined;
    const suggestions = await relationshipDiscoveryService.listSuggestions({
      organizationId: ctx.organizationId,
      contractId,
      status,
    });

    return ok({
      suggestions,
      permissions: { canManage: canManageRelationships(ctx) },
    });
  } catch (error) {
    if (error instanceof IntelligenceError) {
      return fail(error.message, error.status, error.code);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[GET relationship-suggestions]", error);
    return fail("Unable to load suggestions", 500, "INTERNAL_ERROR");
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
    if (!contractId) return fail("Invalid contract id", 400, "INVALID_CONTRACT_ID");

    const c = await prisma.contracts.findFirst({
      where: { id: contractId, organization_id: ctx.legacyIntOrgId },
      select: { id: true },
    });
    if (!c) return fail("Contract not found", 404, "CONTRACT_NOT_FOUND");

    const body = await req.json().catch(() => ({}));

    // Manual search for linking UI
    if (body?.action === "search" && body.q) {
      const results = await relationshipService.searchTargets({
        organizationId: ctx.organizationId,
        q: body.q,
        entityType: body.entityType,
      });
      return ok({ results });
    }

    // Generate suggestions from verified contract. During migration the
    // verified contract is IAM-org scoped while catalog entities remain under
    // the legacy catalog scope held in ctx.organizationId.
    const result = await relationshipDiscoveryService.discover({
      organizationId: ctx.organizationId,
      verifiedOrganizationId: ctx.organization?.id,
      contractId,
      userId: ctx.userId,
      force: !!body?.force,
    });

    return ok(result, 200, "Suggestions generated");
  } catch (error) {
    if (error instanceof IntelligenceError) {
      return fail(error.message, error.status, error.code);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[POST relationship-suggestions]", error);
    return fail("Unable to generate suggestions", 500, "INTERNAL_ERROR");
  }
}
