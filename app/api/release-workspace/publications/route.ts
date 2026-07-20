import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPublicationSchema, updatePublicationSchema } from "@/types/release-workspace";
import { calculateReadinessScore } from "@/app/api/release-workspace/route";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

const PLATFORMS = ["Instagram", "Facebook", "TikTok", "YouTube", "Threads", "X", "Website", "Newsletter", "Press Release", "WhatsApp Broadcast"];

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspace_id");
    if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;
    const items = await prisma.workspace_publications.findMany({
      where: { workspace_id: parseInt(workspaceId), organization_id: orgId, is_deleted: false },
      orderBy: { created_at: "desc" },
    });
    return NextResponse.json(items);
  } catch (err: any) {
    console.error("[GET /api/release-workspace/publications]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;
    const userId = (session.user as any).id;
    const body = await req.json();
    const parsed = createPublicationSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });

    const item = await prisma.workspace_publications.create({
      data: {
        ...parsed.data,
        organization_id: orgId,
        created_by: userId,
        scheduled_at: parsed.data.scheduled_at ? new Date(parsed.data.scheduled_at) : undefined,
      },
    });

    await prisma.workspace_timeline_events.create({
      data: { workspace_id: parsed.data.workspace_id, user_id: userId, event_type: "milestone", summary: `Publication created on ${parsed.data.platform}` },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/release-workspace/publications]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const body = await req.json();
    const parsed = updatePublicationSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });

    const existing = await prisma.workspace_publications.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updateData: any = { ...parsed.data };
    if (parsed.data.scheduled_at) updateData.scheduled_at = new Date(parsed.data.scheduled_at);
    if (parsed.data.status === "published") updateData.published_at = new Date();

    const updated = await prisma.workspace_publications.update({ where: { id: parseInt(id) }, data: updateData });
    await calculateReadinessScore(existing.workspace_id, orgId);
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/release-workspace/publications]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
    const existing = await prisma.workspace_publications.findUnique({ where: { id: parseInt(id) } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await prisma.workspace_publications.update({ where: { id: parseInt(id) }, data: { is_deleted: true } });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/release-workspace/publications]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
