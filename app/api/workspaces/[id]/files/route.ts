import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createFileSchema } from "@/types/workspaces";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await requireOrganization();

    const orgId = ctx.organizationId;
    const { id } = await params;
    const workspaceId = parseInt(id);

    const workspace = await prisma.workspaces.findUnique({ where: { id: workspaceId } });
    if (!workspace || workspace.organization_id !== orgId) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    const where: any = { workspace_id: workspaceId };
    if (category) where.category = category;

    const files = await prisma.workspace_files.findMany({
      where,
      orderBy: { created_at: "desc" },
      include: { user: { select: { id: true, name: true, avatar_url: true } } },
    });

    return NextResponse.json(files);
  } catch (err: any) {
    console.error("[GET /api/workspaces/:id/files]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await requireOrganization();

    const orgId = ctx.organizationId;
    const userId = (session.user as any).id;
    const { id } = await params;
    const workspaceId = parseInt(id);
    const body = await req.json();

    const workspace = await prisma.workspaces.findUnique({ where: { id: workspaceId } });
    if (!workspace || workspace.organization_id !== orgId) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const parsed = createFileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });
    }

    const file = await prisma.workspace_files.create({
      data: { workspace_id: workspaceId, uploaded_by: userId, ...parsed.data },
    });

    await prisma.workspace_timeline_events.create({
      data: {
        workspace_id: workspaceId,
        user_id: userId,
        event_type: "file_upload",
        summary: `File "${parsed.data.original_name}" uploaded to ${parsed.data.category}`,
      },
    });

    return NextResponse.json(file, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/workspaces/:id/files]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await requireOrganization();

    const orgId = ctx.organizationId;
    const { id } = await params;
    const workspaceId = parseInt(id);
    const { searchParams } = new URL(req.url);
    const fileId = parseInt(searchParams.get("file_id") || "");

    if (!fileId) return NextResponse.json({ error: "Missing file_id" }, { status: 400 });

    const workspace = await prisma.workspaces.findUnique({ where: { id: workspaceId } });
    if (!workspace || workspace.organization_id !== orgId) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    await prisma.workspace_files.delete({ where: { id: fileId } });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/workspaces/:id/files]", err);
    return NextResponse.json({ error: `Could not delete file: ${err.message}` }, { status: 400 });
  }
}
