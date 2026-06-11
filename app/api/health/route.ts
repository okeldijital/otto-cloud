import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const checks: Record<string, any> = {
    status: "healthy",
    ok: true,
    timestamp: new Date().toISOString(),
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = "connected";
  } catch (err: any) {
    checks.database = "error";
    checks.ok = false;
    checks.status = "degraded";
  }

  return NextResponse.json(checks);
}
