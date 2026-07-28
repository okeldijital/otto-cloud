import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import { prisma } from "@/lib/prisma";
import { bootstrapPlatformEvents } from "@/lib/platform/events";
import { releaseContractReadModelService } from "@/lib/release-workspace/contracts";

function ok<T>(data: T) {
  return NextResponse.json({
    success: true,
    data,
    message: null,
    errors: null,
  });
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
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[GET releases/:id/contracts]", error);
    return fail("Unable to load release contracts", 500, "INTERNAL_ERROR");
  }
}
