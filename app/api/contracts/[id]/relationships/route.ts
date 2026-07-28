import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import { prisma } from "@/lib/prisma";
import { IntelligenceError } from "@/lib/document-intelligence";
import {
  canManageRelationships,
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

async function assertContract(
  contractId: number,
  legacyIntOrgId: number
) {
  const c = await prisma.contracts.findFirst({
    where: { id: contractId, organization_id: legacyIntOrgId },
    select: { id: true },
  });
  if (!c) throw new IntelligenceError("Contract not found", 404, "CONTRACT_NOT_FOUND");
}

/** GET list active relationships (+ optional history) */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const ctx = await requireOrganization();
    const params = await Promise.resolve(context.params);
    const contractId = parseContractId(params.id);
    if (!contractId) return fail("Invalid contract id", 400, "INVALID_CONTRACT_ID");
    await assertContract(contractId, ctx.legacyIntOrgId);

    const includeHistory =
      new URL(req.url).searchParams.get("includeHistory") === "true";

    const relationships = await relationshipService.list({
      organizationId: ctx.organizationId,
      contractId,
    });
    const history = includeHistory
      ? await relationshipService.listHistory({
          organizationId: ctx.organizationId,
          contractId,
        })
      : undefined;

    const meta = await relationshipService.getMeta();

    return ok({
      relationships,
      history,
      meta,
      permissions: { canManage: canManageRelationships(ctx) },
    });
  } catch (error) {
    if (error instanceof IntelligenceError) {
      return fail(error.message, error.status, error.code);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[GET relationships]", error);
    return fail("Unable to load relationships", 500, "INTERNAL_ERROR");
  }
}

/** POST create manual link or accept suggestion */
export async function POST(
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

    // Accept suggestion
    if (body?.action === "accept_suggestion" && body.suggestionId) {
      const rel = await relationshipService.acceptSuggestion({
        ctx,
        organizationId: ctx.organizationId,
        contractId,
        suggestionId: body.suggestionId,
      });
      return ok({ relationship: rel }, 201, "Suggestion accepted");
    }

    // Reject suggestion
    if (body?.action === "reject_suggestion" && body.suggestionId) {
      const result = await relationshipService.rejectSuggestion({
        ctx,
        organizationId: ctx.organizationId,
        contractId,
        suggestionId: body.suggestionId,
        notes: body.notes,
      });
      return ok(result, 200, "Suggestion rejected");
    }

    // Manual create
    if (
      !body?.relationshipType ||
      !body?.targetEntityType ||
      !body?.targetEntityId
    ) {
      return fail(
        "relationshipType, targetEntityType, and targetEntityId are required",
        400,
        "VALIDATION"
      );
    }

    const rel = await relationshipService.create({
      ctx,
      organizationId: ctx.organizationId,
      contractId,
      relationshipType: body.relationshipType,
      targetEntityType: body.targetEntityType,
      targetEntityId: String(body.targetEntityId),
      targetEntityName: body.targetEntityName,
      source: "manual",
      reason: body.reason,
    });

    return ok({ relationship: rel }, 201, "Relationship created");
  } catch (error) {
    if (error instanceof IntelligenceError) {
      return fail(error.message, error.status, error.code);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[POST relationships]", error);
    return fail("Unable to create relationship", 500, "INTERNAL_ERROR");
  }
}
