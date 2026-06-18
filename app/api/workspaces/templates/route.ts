import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const templates = await prisma.workspace_templates.findMany({
      orderBy: { name: "asc" },
      include: {
        sections: { orderBy: { sort_order: "asc" } },
        statuses: { orderBy: { sort_order: "asc" } },
      },
    });

    return NextResponse.json(templates);
  } catch (err: any) {
    console.error("[GET /api/workspaces/templates]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
