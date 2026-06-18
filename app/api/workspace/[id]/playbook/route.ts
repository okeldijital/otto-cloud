import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPlaybookSchema, updatePlaybookSchema, applyPlaybookSchema } from "@/types/release-workspace";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const orgId = (session.user as any).organization_id;

    const playbooks = await prisma.release_playbooks.findMany({
      where: { organization_id: orgId },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(playbooks);
  } catch (err: any) {
    console.error("[GET /api/workspace/[id]/playbook]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const orgId = (session.user as any).organization_id;
    const body = await req.json();

    if (body.apply) {
      const parsed = applyPlaybookSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });
      return NextResponse.json({ message: "Playbook applied" });
    }

    const parsed = createPlaybookSchema.safeParse({ ...body, organization_id: orgId });
    if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });

    const playbook = await prisma.release_playbooks.create({
      data: { ...parsed.data, organization_id: orgId },
    });
    return NextResponse.json(playbook, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/workspace/[id]/playbook]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const body = await req.json();
    const parsed = updatePlaybookSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });

    const updated = await prisma.release_playbooks.update({ where: { id: parseInt(id) }, data: parsed.data });
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/workspace/[id]/playbook]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
