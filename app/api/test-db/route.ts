import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * Lightweight DB connectivity probe.
 *
 * A.8 Step 5 (A8-001): Must not expose user counts, IAM topology, or
 * database inventory to anonymous callers. Suitable for generic liveness only.
 *
 * For authenticated platform diagnostics see /api/platform/health/identity.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({
      ok: true,
      connected: true,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "database error";
    console.error("[DB Health Check]", err);
    // Do not leak internal error detail to anonymous clients
    return NextResponse.json(
      {
        ok: false,
        connected: false,
        error: "database unavailable",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
