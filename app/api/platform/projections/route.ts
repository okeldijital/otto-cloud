import { NextRequest, NextResponse } from "next/server";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";
import {
  bootstrapProjections,
  listProjections,
  listCheckpoints,
  getProjectionMetrics,
  projectionEngine,
  projectionReplayer,
  ProjectionError,
} from "@/lib/platform/projections";
import { assertCanReplay } from "@/lib/platform/events/permissions";
import { bootstrapPlatformEvents } from "@/lib/platform/events";

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

/**
 * GET /api/platform/projections
 * view=registry|checkpoints|metrics (default registry)
 */
export async function GET(req: NextRequest) {
  try {
    const ctx = await requireOrganization();
    await bootstrapPlatformEvents();
    await bootstrapProjections();

    const view = new URL(req.url).searchParams.get("view") || "registry";

    if (view === "metrics") {
      return ok({ metrics: getProjectionMetrics() });
    }
    if (view === "checkpoints") {
      const checkpoints = await listCheckpoints({
        organizationId: ctx.organizationId,
      });
      return ok({ checkpoints });
    }

    return ok({
      projections: listProjections().map((p) => ({
        name: p.name,
        version: p.version,
        owner: p.owner,
        description: p.description,
        events: p.events,
        supportsRebuild: typeof p.listKeys === "function",
      })),
    });
  } catch (error) {
    if (error instanceof ProjectionError) {
      return fail(error.message, error.status, error.code);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[GET platform/projections]", error);
    return fail("Unable to list projections", 500, "INTERNAL_ERROR");
  }
}

/**
 * POST /api/platform/projections
 * Body:
 *  { action: "rebuild", projectionName }
 *  { action: "replay", projectionName, from?, to?, fullRebuildFirst? }
 * Admin only for rebuild/replay.
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = await requireOrganization();
    assertCanReplay(ctx);
    await bootstrapPlatformEvents();
    await bootstrapProjections();

    const body = await req.json();
    const action = body.action as string;
    const projectionName = body.projectionName as string;

    if (!projectionName) {
      return fail("projectionName is required", 400, "NAME_REQUIRED");
    }

    if (action === "rebuild") {
      const result = await projectionEngine.rebuild({
        projectionName,
        organizationId: ctx.organizationId,
      });
      return ok({ result }, `Rebuilt ${result.keysProcessed} keys`);
    }

    if (action === "replay") {
      const result = await projectionReplayer.replay({
        organizationId: ctx.organizationId,
        projectionName,
        from: body.from ? new Date(body.from) : undefined,
        to: body.to ? new Date(body.to) : undefined,
        fullRebuildFirst: !!body.fullRebuildFirst,
        limit: body.limit,
      });
      return ok({ result }, `Replayed ${result.eventsProcessed} events`);
    }

    return fail("Invalid action (rebuild|replay)", 400, "INVALID_ACTION");
  } catch (error) {
    if (error instanceof ProjectionError) {
      return fail(error.message, error.status, error.code);
    }
    const orgErr = orgContextErrorResponse(error);
    if (orgErr) return NextResponse.json(orgErr.body, { status: orgErr.status });
    console.error("[POST platform/projections]", error);
    return fail("Unable to run projection action", 500, "INTERNAL_ERROR");
  }
}
