/**
 * POST /api/auth/sessions/cleanup — run session cleanup (admin / internal)
 * Requires security.manage
 */

import { NextResponse } from "next/server";
import {
  sessionCleanupService,
  requirePermission,
  identityErrorResponse,
} from "@/lib/platform/identity";

export async function POST(req: Request) {
  try {
    await requirePermission(req, ["security.manage", "platform.admin"]);
    const result = await sessionCleanupService.run();
    return NextResponse.json({ success: true, result });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
