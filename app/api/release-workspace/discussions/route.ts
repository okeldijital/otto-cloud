import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createDiscussionChannelSchema, createDiscussionMessageSchema } from "@/types/release-workspace";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspace_id");
    if (!workspaceId) return NextResponse.json({ error: "workspace_id required" }, { status: 400 });
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;
    const channels = await prisma.workspace_discussion_channels.findMany({
      where: { workspace_id: parseInt(workspaceId), organization_id: orgId, is_deleted: false },
      orderBy: { sort_order: "asc" },
      include: { messages: { orderBy: { created_at: "asc" }, take: 100 } },
    });
    return NextResponse.json(channels);
  } catch (err: any) {
    console.error("[GET /api/release-workspace/discussions]", err);
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

    if (body._type === "channel") {
      const parsed = createDiscussionChannelSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });
      const channel = await prisma.workspace_discussion_channels.create({
        data: { ...parsed.data, organization_id: orgId, created_by: userId },
      });
      return NextResponse.json(channel, { status: 201 });
    }

    const parsed = createDiscussionMessageSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: "Validation error", details: parsed.error.flatten() }, { status: 400 });
    const message = await prisma.workspace_discussion_messages.create({
      data: { ...parsed.data, organization_id: orgId, user_id: userId },
    });
    return NextResponse.json(message, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/release-workspace/discussions]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
