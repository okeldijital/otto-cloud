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

/** GET /api/releases/:id/contracts/health */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const ctx = await requireOrganization();
    await bootstrapPlatformEvents();
    const params = await Promise.resolve(context.params);
    const releaseId = parseInt(params.id, 10);
    if (!Number.isFinite(releaseId) || releaseId <= 0) {
      return fail("Invalid release id", 400, "INVALID_RELEASE_ID");
    }

    const release = await prisma.releases.findFirst({
      where: {
        id: releaseId,
        organization_id: ctx.organizationId,
        is_deleted: false,
      },
      select: { id: true },
    });
    if (!release) return fail("Release not found", 404, "RELEASE_NOT_FOUND");

    const refresh =
      new URL(req.url).searchParams.get("refresh") === "1";

    const health = await releaseContractReadModelService.getHealth({
      organizationId: ctx.organizationId,
      releaseId,
      refresh,
    });

    return ok({ health });
  } catch (error) {
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[GET releases/:id/contracts/health]", error);
    return fail("Unable to load health", 500, "INTERNAL_ERROR");
  }
}
