/**
 * GET /api/platform/health/identity
 * IAM subsystem health (no secrets).
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  IAM_PLATFORM_VERSION,
  iamMetrics,
  PERMISSION_CATALOG_VERSION,
  getPlatformConfig,
} from "@/lib/platform/sdk";

type ComponentHealth = {
  status: "up" | "degraded" | "down";
  detail?: string;
};

export async function GET() {
  const components: Record<string, ComponentHealth> = {};

  // Database / identity tables
  try {
    await prisma.$queryRaw`SELECT 1`;
    const [identities, sessions, orgs] = await Promise.all([
      prisma.iamIdentity.count(),
      prisma.iamSession.count({
        where: { revokedAt: null, expiresAt: { gt: new Date() } },
      }),
      prisma.iamOrganization.count({ where: { status: "active" } }),
    ]);
    components.database = { status: "up" };
    components.identity = {
      status: "up",
      detail: `identities=${identities}`,
    };
    components.sessions = {
      status: "up",
      detail: `active≈${sessions}`,
    };
    components.organizations = {
      status: "up",
      detail: `active=${orgs}`,
    };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "db error";
    components.database = { status: "down", detail: msg };
    components.identity = { status: "down" };
    components.sessions = { status: "down" };
    components.organizations = { status: "down" };
  }

  // Policy / config load
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
    service: "identity",
    platform: IAM_PLATFORM_VERSION,
    status: overall,
    components,
    metrics: iamMetrics.snapshot(),
    timestamp: new Date().toISOString(),
  });
}
