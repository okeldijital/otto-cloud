import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPublicationSchema, updatePublicationSchema } from "@/types/release-workspace";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const wpId = parseInt(id);
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;
    const workspaceId = wpId;
    const items = await prisma.workspace_publications.findMany({
      where: { workspace_id: workspaceId, organization_id: orgId, is_deleted: false },
      orderBy: { created_at: "desc" },
    });
    return NextResponse.json(items);
  } catch (err: any) {
    console.error("[GET /api/workspace/[id]/publications]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const wpId = parseInt(id);
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;
    const userId = (session.user as any).id;
    const workspaceId = wpId;
    const body = await req.json();
    const parsed = createPublicationSchema.safeParse({ ...body, workspace_id: workspaceId });
    if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });

    const item = await prisma.workspace_publications.create({
      data: { ...parsed.data, organization_id: orgId, created_by: userId, scheduled_at: parsed.data.scheduled_at ? new Date(parsed.data.scheduled_at) : undefined },
    });

    await prisma.workspace_timeline_events.create({
      data: { workspace_id: workspaceId, user_id: userId, event_type: "publication", summary: `Publication added: ${item.platform}${item.title ? ` - ${item.title}` : ""}` },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/workspace/[id]/publications]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const wpId = parseInt(id);
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const userId = (session.user as any).id;
    const workspaceId = wpId;
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("id");
    if (!itemId) return NextResponse.json({ error: "id required" }, { status: 400 });

    const body = await req.json();
    const parsed = updatePublicationSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });

    const existing = await prisma.workspace_publications.findUnique({ where: { id: parseInt(itemId) } });
    if (!existing || existing.workspace_id !== workspaceId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const updateData: any = { ...parsed.data };
    if (parsed.data.scheduled_at) updateData.scheduled_at = new Date(parsed.data.scheduled_at);

    const updated = await prisma.workspace_publications.update({ where: { id: parseInt(itemId) }, data: updateData });

    if (parsed.data.status && parsed.data.status !== existing.status) {
      await prisma.workspace_timeline_events.create({
        data: { workspace_id: workspaceId, user_id: userId, event_type: "publication", summary: `Publication "${existing.title || existing.platform}" → ${parsed.data.status}` },
      });
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/workspace/[id]/publications]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const wpId = parseInt(id);
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const workspaceId = wpId;
    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("id");
    if (!itemId) return NextResponse.json({ error: "id required" }, { status: 400 });

    const existing = await prisma.workspace_publications.findUnique({ where: { id: parseInt(itemId) } });
    if (!existing || existing.workspace_id !== workspaceId) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.workspace_publications.update({ where: { id: parseInt(itemId) }, data: { is_deleted: true } });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/workspace/[id]/publications]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
