import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Temporary read-only diagnostic. Remove after IAM migration state is verified. */
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: { is_active: true },
      select: { id: true, is_active: true },
      orderBy: { id: "asc" },
    });

    const report = [];
    for (const user of users) {
      const memberships = await prisma.tenant_users.findMany({
        where: { user_id: user.id },
        select: {
          tenant_id: true,
          is_default: true,
          tenants: {
            select: { name: true, display_name: true, is_active: true },
          },
        },
      });
      report.push({
        legacyUserId: user.id,
        active: user.is_active,
        memberships: memberships.map((m) => ({
          tenantId: m.tenant_id,
          tenantName: m.tenants.display_name || m.tenants.name,
          tenantActive: m.tenants.is_active,
          isDefault: m.is_default,
        })),
      });
    }

    return NextResponse.json({ ok: true, diagnostic: "legacy-tenant-memberships", users: report });
  } catch (error) {
    console.error("[legacy tenant report] failed", error);
    return NextResponse.json({ ok: false, code: "LEGACY_TENANT_REPORT_FAILED" }, { status: 500 });
  }
}
