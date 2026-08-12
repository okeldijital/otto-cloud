/**
 * GET /api/platform/health/identity
 *
 * A.8 Step 5 (A8-002): Platform-authority-only IAM subsystem health.
 * Anonymous and ordinary org members must not receive identity topology counts.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  IAM_PLATFORM_VERSION,
  PERMISSION_CATALOG_VERSION,
  getPlatformConfig,
} from "@/lib/platform/sdk";
import { getServerSession } from "@/lib/auth/session";
import { isPlatformAuthority } from "@/lib/auth/privilege-authorization";

type ComponentHealth = {
  status: "up" | "degraded" | "down";
  detail?: string;
};

export async function GET() {
  const session = await getServerSession();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Authentication required", code: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }

  const user = session.user;
  const platform = isPlatformAuthority({
    isSuperAdmin: !!user.is_superuser,
    permissions: user.permissions || [],
    roles: user.role ? [user.role] : [],
  });

  if (!platform) {
    return NextResponse.json(
      {
        error: "Platform authority required",
        code: "PLATFORM_AUTHORITY_REQUIRED",
      },
      { status: 403 }
    );
  }

  const components: Record<string, ComponentHealth> = {};

  // Connectivity only — no identity/session/org counts (topology leak)
  try {
    await prisma.$queryRaw`SELECT 1`;
    components.database = { status: "up" };
    components.identity = { status: "up" };
    components.sessions = { status: "up" };
    components.organizations = { status: "up" };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "db error";
    components.database = { status: "down", detail: msg };
    components.identity = { status: "down" };
    components.sessions = { status: "down" };
    components.organizations = { status: "down" };
  }

  try {
    const cfg = getPlatformConfig();
    components.policyEngine = {
      status: "up",
      detail: `passwordMin=${cfg.security.password.minimumLength ?? cfg.security.password.minLength}`,
    };
    components.authentication = { status: "up" };
    components.mfa = {
      status: "up",
      detail: `challengeTtl=${cfg.security.mfa.challengeTtlSeconds}s`,
    };
    components.permissions = {
      status: "up",
      detail: `catalogVersion=${PERMISSION_CATALOG_VERSION}`,
    };
    components.invitationService = { status: "up" };
  } catch (e: unknown) {
    components.policyEngine = {
      status: "down",
      detail: e instanceof Error ? e.message : "config error",
    };
  }

  const statuses = Object.values(components).map((c) => c.status);
  const overall = statuses.includes("down")
    ? "down"
    : statuses.includes("degraded")
      ? "degraded"
      : "up";

  return NextResponse.json({
    status: overall,
    platform: IAM_PLATFORM_VERSION,
    catalogVersion: PERMISSION_CATALOG_VERSION,
    components,
    timestamp: new Date().toISOString(),
  });
}
