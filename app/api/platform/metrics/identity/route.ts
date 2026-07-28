/**
 * GET /api/platform/metrics/identity — IAM counters/timers snapshot
 */

import { NextResponse } from "next/server";
import {
  iamMetrics,
  IAM_PLATFORM_VERSION,
  requirePermission,
  identityErrorResponse,
} from "@/lib/platform/sdk";

export async function GET(req: Request) {
  try {
    await requirePermission(req, [
      "platform.admin",
      "security.manage",
      "audit.view",
    ]);
    return NextResponse.json({
      platform: IAM_PLATFORM_VERSION,
      metrics: iamMetrics.snapshot(),
    });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
