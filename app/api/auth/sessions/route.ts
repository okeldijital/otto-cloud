/**
 * GET /api/auth/sessions — active session registry
 */

import { NextResponse } from "next/server";
import {
  sessionService,
  sessionPolicyService,
  requireAuthentication,
  identityErrorResponse,
} from "@/lib/platform/identity";

export async function GET(req: Request) {
  try {
    const ctx = await requireAuthentication(req);
    const sessions = await sessionService.listSessions(
      ctx.identityId,
      ctx.sessionId
    );
    const policy = sessionPolicyService.getPolicy();
    return NextResponse.json({
      sessions,
      currentSessionId: ctx.sessionId,
      policy: {
        idleTimeoutHours: policy.idleTimeoutHours,
        maxAgeHours: policy.maxAgeHours,
        maxConcurrentSessions: policy.maxConcurrentSessions,
      },
    });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
