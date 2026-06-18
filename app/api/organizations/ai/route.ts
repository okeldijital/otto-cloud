import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenant_id;
  if (!tenantId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

  const org = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: {
      ai_model: true,
      ai_prompt_library: true,
      ai_knowledge_base: true,
      ai_allowed_agents: true,
      ai_monthly_budget: true,
    },
  });

  if (!org) return NextResponse.json({ error: "Organization not found" }, { status: 404 });

  return NextResponse.json(org);
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenant_id;
  if (!tenantId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

  try {
    const body = await req.json();

    const allowedFields = [
      "ai_model", "ai_prompt_library", "ai_knowledge_base",
      "ai_allowed_agents", "ai_monthly_budget",
    ];

    const updateData: any = {};
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const org = await prisma.tenants.update({
      where: { id: tenantId },
      data: updateData,
      select: {
        ai_model: true,
        ai_prompt_library: true,
        ai_knowledge_base: true,
        ai_allowed_agents: true,
        ai_monthly_budget: true,
      },
    });

    return NextResponse.json(org);
  } catch (error: any) {
    console.error("Error updating AI configuration:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
