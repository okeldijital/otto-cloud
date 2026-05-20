import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const users = await prisma.user.findMany();

    return Response.json({
      ok: true,
      count: users.length,
    });
  } catch (error) {
    return Response.json({
      ok: false,
      error: String(error),
    });
  }
}
