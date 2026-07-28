/**
 * GET /api/auth/password-policy — client-safe requirements only
 */

import { NextResponse } from "next/server";
import { passwordPolicyService } from "@/lib/platform/identity";

export async function GET() {
  return NextResponse.json({
    policy: passwordPolicyService.getClientPolicy(),
  });
}
