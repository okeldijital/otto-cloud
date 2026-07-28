/**
 * GET /api/auth/session — single source of truth for frontend auth state.
 */

import { NextResponse } from "next/server";
import {
  authenticationService,
  identityErrorResponse,
  metaFromRequest,
} from "@/lib/platform/identity";

export async function GET(req: Request) {
  try {
    const session = await authenticationService.getPublicSession(
      metaFromRequest(req)
    );
    return NextResponse.json(session);
  } catch (err) {
    return identityErrorResponse(err);
  }
}
