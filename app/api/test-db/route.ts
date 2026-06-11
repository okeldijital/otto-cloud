import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    const userCount = await prisma.user.count();
    return NextResponse.json({
      ok: true,
      connected: true,
      user_count: userCount,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    console.error("[DB Health Check]", err);
    return NextResponse.json({
      ok: false,
      connected: false,
      error: err.message,
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}
