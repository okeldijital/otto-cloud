import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Temporary read-only migration report. Remove after migration state is verified. */
export async function GET() {
  try {
    const [legacyUserCount, iamIdentityCount, linkedLegacyUserCount] = await Promise.all([
      prisma.user.count(),
      prisma.iamIdentity.count(),
      prisma.iamIdentity.count({ where: { legacyUserId: { not: null } } }),
    ]);

    const linked = await prisma.iamIdentity.findMany({
      where: { legacyUserId: { not: null } },
      select: { legacyUserId: true },
    });
    const linkedIds = linked.map((row) => row.legacyUserId).filter((id): id is number => id !== null);

    const unmigratedActiveUsers = await prisma.user.count({
      where: {
        is_active: true,
        ...(linkedIds.length ? { id: { notIn: linkedIds } } : {}),
      },
    });

    return NextResponse.json({
      ok: true,
      report: {
        legacyUserCount,
        iamIdentityCount,
        linkedLegacyUserCount,
        unmigratedActiveUsers,
        authenticationProvider: "iam",
      },
    });
  } catch (error) {
    console.error("[legacy auth report] failed", error);
    return NextResponse.json({
      ok: false,
      code: "LEGACY_AUTH_REPORT_FAILED",
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
