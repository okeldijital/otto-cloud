/**
 * GET /api/admin/security/sessions — admin session search
 * Query: email, identityId, activeOnly, limit, offset
 */

import { NextResponse } from "next/server";
import {
  sessionService,
  requirePermission,
  identityErrorResponse,
} from "@/lib/platform/identity";

export async function GET(req: Request) {
  try {
    await requirePermission(req, [
      "security.manage",
      "users.manage",
      "platform.admin",
    ]);
    const sp = new URL(req.url).searchParams;
    const result = await sessionService.adminSearch({
      identityId: sp.get("identityId") || undefined,
      email: sp.get("email") || undefined,
      activeOnly: sp.get("activeOnly") !== "false",
      limit: parseInt(sp.get("limit") || "50", 10),
      offset: parseInt(sp.get("offset") || "0", 10),
    });

    return NextResponse.json({
      sessions: result.rows.map((s) => ({
        id: s.id,
        identityId: s.identityId,
        email: s.identity.email,
        displayName: s.identity.displayName,
        device: s.device
          ? {
              name: s.device.name,
              browser: s.device.browser,
              os: s.device.os,
              deviceType: s.device.deviceType,
            }
          : { name: s.deviceLabel },
        ipAddress: s.ipAddress,
        lastActivityAt: s.lastActivityAt.toISOString(),
        expiresAt: s.expiresAt.toISOString(),
        createdAt: s.createdAt.toISOString(),
        revoked: !!s.revokedAt,
        revokeReason: s.revokeReason,
        riskLevel: s.riskLevel,
        rememberMe: s.rememberMe,
      })),
      total: result.total,
      limit: result.limit,
      offset: result.offset,
    });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
