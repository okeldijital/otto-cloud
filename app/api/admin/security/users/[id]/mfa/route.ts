/**
 * GET  /api/admin/security/users/:id/mfa — MFA status
 * POST /api/admin/security/users/:id/mfa — { action: "reset" | "force_enroll" }
 */

import { NextResponse } from "next/server";
import {
  mfaService,
  requirePermission,
  identityErrorResponse,
  clientIp,
  IdentityError,
} from "@/lib/platform/identity";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(req, ["security.manage", "users.manage"]);
    const { id } = await params;
    const status = await mfaService.getStatus(id);
    return NextResponse.json({
      identityId: id,
      enabled: status.enabled,
      enrolledAt: status.enrolledAt,
      lastUsedAt: status.lastUsedAt,
      recoveryCodesRemaining: status.recoveryCodesRemaining,
      trustedDeviceCount: status.trustedDeviceCount,
      policy: status.policy,
    });
  } catch (err) {
    return identityErrorResponse(err);
  }
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission(req, [
      "security.manage",
      "users.manage",
    ]);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action : "";

    if (action === "reset") {
      await mfaService.adminResetMfa({
        identityId: id,
        actorIdentityId: ctx.identityId,
        ipAddress: clientIp(req),
      });
      return NextResponse.json({ success: true, action: "reset" });
    }

    if (action === "force_enroll") {
      await prisma.iamSecurityEvent.create({
        data: {
          identityId: id,
          eventType: "identity.mfa.force_enroll",
          payload: { actorIdentityId: ctx.identityId },
        },
      });
      return NextResponse.json({
        success: true,
        action: "force_enroll",
        message: "User should enroll MFA at next opportunity",
      });
    }

    throw new IdentityError(
      "action must be reset or force_enroll",
      400,
      "VALIDATION_ERROR"
    );
  } catch (err) {
    return identityErrorResponse(err);
  }
}
