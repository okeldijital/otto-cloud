import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import { prisma } from "@/lib/prisma";
import { bootstrapPlatformEvents } from "@/lib/platform/events";
import { releaseContractReadModelService } from "@/lib/release-workspace/contracts";
import { relationshipService } from "@/lib/contract-relationships";
import { IntelligenceError } from "@/lib/document-intelligence";

function ok<T>(data: T, status = 200, message?: string) {
  return NextResponse.json({
    success: true,
    data,
    message: message ?? null,
    errors: null,
  }, { status });
}

function fail(message: string, status: number, code?: string) {
  return NextResponse.json(
    { success: false, data: null, message, errors: [message], code },
    { status }
  );
}

function parseReleaseId(raw: string): number | null {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

async function assertRelease(releaseId: number, organizationId: string) {
  const r = await prisma.releases.findFirst({
    where: { id: releaseId, organization_id: organizationId, is_deleted: false },
    select: { id: true, title: true },
  });
  if (!r) return null;
  return r;
}

async function assertContract(contractId: number, organizationId: string) {
  const c = await prisma.contracts.findFirst({
    where: { id: contractId, organization_id: organizationId },
    select: { id: true, title: true },
  });
  return c;
}

/**
 * GET /api/releases/:id/contracts
 * Read-only linked contract projections.
 * Query: refresh=1 to force rebuild from platform sources.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const ctx = await requireOrganization();
    await bootstrapPlatformEvents();
    const params = await Promise.resolve(context.params);
    const releaseId = parseReleaseId(params.id);
    if (!releaseId) return fail("Invalid release id", 400, "INVALID_RELEASE_ID");

    const release = await assertRelease(releaseId, ctx.organizationId);
    if (!release) return fail("Release not found", 404, "RELEASE_NOT_FOUND");

    const refresh =
      new URL(req.url).searchParams.get("refresh") === "1" ||
      new URL(req.url).searchParams.get("refresh") === "true";

    const contracts = await releaseContractReadModelService.listForRelease({
      organizationId: ctx.organizationId,
      releaseId,
      refresh,
    });

    return ok({
      releaseId,
      releaseTitle: release.title,
      contracts,
      permissions: {
        canView: true,
        canEditContracts: false,
        openContractCenter: true,
      },
    });
  } catch (error) {
    if (error instanceof IntelligenceError) {
      return fail(error.message, error.status, error.code);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[GET releases/:id/contracts]", error);
    return fail("Unable to load release contracts", 500, "INTERNAL_ERROR");
  }
}

/**
 * POST /api/releases/:id/contracts
 * User-managed catalogue linkage. The source contract must already exist.
 * No extraction is performed and no Release/Track is inferred by AI.
 */
export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const ctx = await requireOrganization();
    const params = await Promise.resolve(context.params);
    const releaseId = parseReleaseId(params.id);
    if (!releaseId) return fail("Invalid release id", 400, "INVALID_RELEASE_ID");

    const release = await assertRelease(releaseId, ctx.organizationId);
    if (!release) return fail("Release not found", 404, "RELEASE_NOT_FOUND");

    const body = await req.json();
    const contractId = Number(body?.contractId);
    if (!Number.isInteger(contractId) || contractId <= 0) {
      return fail("contractId is required", 400, "VALIDATION");
    }

    const contract = await assertContract(contractId, ctx.organizationId);
    if (!contract) return fail("Contract not found", 404, "CONTRACT_NOT_FOUND");

    const relationship = await relationshipService.create({
      ctx,
      organizationId: ctx.organizationId,
      contractId,
      relationshipType: body?.relationshipType || "applies_to",
      targetEntityType: "release",
      targetEntityId: String(releaseId),
      targetEntityName: release.title,
      source: "manual",
      reason: body?.reason || "User linked contract to release from Release workspace",
    });

    await bootstrapPlatformEvents();
    await releaseContractReadModelService.listForRelease({
      organizationId: ctx.organizationId,
      releaseId,
      refresh: true,
    });

    return ok({ relationship, releaseId, contractId }, 201, "Contract linked to release");
  } catch (error) {
    if (error instanceof IntelligenceError) {
      return fail(error.message, error.status, error.code);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[POST releases/:id/contracts]", error);
    return fail("Unable to link contract to release", 500, "INTERNAL_ERROR");
  }
}
