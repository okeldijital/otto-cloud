/**
 * GET /api/auth/me — compatibility alias for session identity.
 * Prefer GET /api/auth/session for full context.
 */

import { NextResponse } from "next/server";
import {
  authenticationService,
  metaFromRequest,
  identityErrorResponse,
} from "@/lib/platform/identity";

export async function GET(req: Request) {
  try {
    const session = await authenticationService.getPublicSession(
      metaFromRequest(req)
    );
    if (!session.authenticated || !session.identity) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({
      id: session.identity.id,
      email: session.identity.email,
      full_name: session.identity.displayName,
      name: session.identity.displayName,
      organization: session.organization,
      roles: session.roles,
      permissions: session.permissions,
      emailVerified: session.identity.emailVerified,
      status: session.identity.status,
    });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
