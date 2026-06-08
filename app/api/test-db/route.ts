import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const result = await prisma.$queryRaw`SELECT NOW() as time`;

    return Response.json({
      ok: true,
      connected: true,
      time: result,
      env: {
        hasDatabaseUrl: !!process.env.DATABASE_URL,
      },
    });
  } catch (error: any) {
    return Response.json({
      ok: false,
      connected: false,
      error: error.message,
    }, { status: 500 });
  }
}
