import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await requireOrganization();

    const orgId = ctx.organizationId;
    const { searchParams } = new URL(req.url);
    const releaseId = searchParams.get("release_id");

    if (!releaseId) {
      return NextResponse.json({ error: "release_id is required" }, { status: 400 });
    }

    const workspace = await prisma.workspaces.findFirst({
      where: { release_id: parseInt(releaseId), organization_id: orgId, is_deleted: false },
      include: {
        template: {
          include: { sections: { orderBy: { sort_order: "asc" } }, statuses: { orderBy: { sort_order: "asc" } } },
        },
        members: {
          include: { user: { select: { id: true, name: true, email: true, avatar_url: true } } },
          orderBy: { role: "asc" },
        },
        timeline_events: {
          orderBy: { created_at: "desc" }, take: 50,
          include: { user: { select: { id: true, name: true, avatar_url: true } } },
        },
        files: { orderBy: { created_at: "desc" }, take: 50 },
        notifications: { orderBy: { created_at: "desc" }, take: 20 },
        deliverables: { where: { is_deleted: false }, orderBy: { sort_order: "asc" } },
        milestones: { where: { is_deleted: false }, orderBy: { sort_order: "asc" } },
        approvals: { where: { is_deleted: false }, orderBy: { created_at: "desc" } },
        publications: { where: { is_deleted: false }, orderBy: { created_at: "desc" } },
        videos: { where: { is_deleted: false }, orderBy: { created_at: "desc" } },
        marketing_phases: {
          where: { is_deleted: false },
          orderBy: { sort_order: "asc" },
          include: { tasks: { where: { is_deleted: false }, orderBy: { sort_order: "asc" } } },
        },
        discussion_channels: {
          where: { is_deleted: false },
          orderBy: { sort_order: "asc" },
          include: { messages: { orderBy: { created_at: "asc" }, take: 50 } },
        },
        readiness_scores: { orderBy: { calculated_at: "desc" }, take: 1 },
      },
    });

    return NextResponse.json(workspace);
  } catch (err: any) {
    console.error("[GET /api/release-workspace]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await requireOrganization();

    const orgId = ctx.organizationId;
    const userId = (session.user as any).id;
    const body = await req.json();
    const { release_id } = body;

    if (!release_id) {
      return NextResponse.json({ error: "release_id is required" }, { status: 400 });
    }

    const release = await prisma.releases.findUnique({ where: { id: parseInt(release_id) } });
    if (!release) return NextResponse.json({ error: "Release not found" }, { status: 404 });

    const existing = await prisma.workspaces.findFirst({
      where: { release_id: release.id, organization_id: orgId, is_deleted: false },
    });
    if (existing) return NextResponse.json(existing);

    const template = await prisma.workspace_templates.findFirst({
      where: { slug: "release" },
    });

    let releaseType = release.release_type || "Single";
    const workspaceName = `${release.title} - ${releaseType} Release`;

    const workspace = await prisma.workspaces.create({
      data: {
        name: workspaceName,
        description: `Release workspace for "${release.title}"`,
        template_id: template?.id,
        release_id: release.id,
        status: "planning",
        organization_id: orgId,
        created_by: userId,
      },
    });

    await prisma.workspace_members.create({
      data: { workspace_id: workspace.id, user_id: userId, role: "owner" },
    });

    await prisma.workspace_timeline_events.create({
      data: {
        workspace_id: workspace.id,
        user_id: userId,
        event_type: "system",
        summary: `Release workspace created for "${release.title}"`,
      },
    });

    await createDefaultChannels(workspace.id, orgId, userId);
    await calculateReadinessScore(workspace.id, orgId);

    const fullWorkspace = await prisma.workspaces.findUnique({
      where: { id: workspace.id },
      include: {
        template: { include: { sections: true, statuses: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        deliverables: true, milestones: true, approvals: true,
        publications: true, videos: true, readiness_scores: { orderBy: { calculated_at: "desc" }, take: 1 },
        marketing_phases: { include: { tasks: true } },
        discussion_channels: { include: { messages: { take: 50, orderBy: { created_at: "asc" } } } },
      },
    });

    return NextResponse.json(fullWorkspace, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/release-workspace]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

async function createDefaultChannels(workspaceId: number, orgId: string, userId: number) {
  const channels = [
    { name: "General", slug: "general" },
    { name: "Artwork", slug: "artwork" },
    { name: "Marketing", slug: "marketing" },
    { name: "Distribution", slug: "distribution" },
    { name: "Production", slug: "production" },
    { name: "Legal", slug: "legal" },
  ];
  for (let i = 0; i < channels.length; i++) {
    await prisma.workspace_discussion_channels.create({
      data: {
        workspace_id: workspaceId,
        organization_id: orgId,
        name: channels[i].name,
        slug: channels[i].slug,
        sort_order: i,
        created_by: userId,
      },
    });
  }
}

export async function calculateReadinessScore(workspaceId: number, orgId: string) {
  const [deliverables, approvals, videos, publications] = await Promise.all([
    prisma.workspace_deliverables.findMany({ where: { workspace_id: workspaceId, is_deleted: false } }),
    prisma.workspace_approvals.findMany({ where: { workspace_id: workspaceId, is_deleted: false } }),
    prisma.workspace_videos.findMany({ where: { workspace_id: workspaceId, is_deleted: false } }),
    prisma.workspace_publications.findMany({ where: { workspace_id: workspaceId, is_deleted: false } }),
  ]);

  const calcCategory = (items: any[], statusField: string, doneStatuses: string[]) => {
    if (!items.length) return 0;
    const done = items.filter((i) => doneStatuses.includes(i[statusField])).length;
    return Math.round((done / items.length) * 100);
  };

  const metadataScore = 0;
  const artworkScore = calcCategory(deliverables, "status", ["approved"]);
  const marketingScore = calcCategory(publications, "status", ["approved", "published", "scheduled"]);
  const distributionScore = calcCategory(deliverables, "status", ["approved"]);
  const approvalsScore = calcCategory(approvals, "status", ["approved"]);
  const videosScore = calcCategory(videos, "status", ["completed"]);

  const weights = { metadata: 20, artwork: 15, marketing: 20, distribution: 20, approvals: 15, videos: 10 };
  const totalWeight = weights.metadata + weights.artwork + weights.marketing + weights.distribution + weights.approvals + weights.videos;
  const overallScore = Math.round(
    (metadataScore * weights.metadata +
      artworkScore * weights.artwork +
      marketingScore * weights.marketing +
      distributionScore * weights.distribution +
      approvalsScore * weights.approvals +
      videosScore * weights.videos) / totalWeight
  );

  const breakdown = { metadata: metadataScore, artwork: artworkScore, marketing: marketingScore, distribution: distributionScore, approvals: approvalsScore, videos: videosScore };

  await prisma.workspace_readiness_scores.create({
    data: {
      workspace_id: workspaceId,
      organization_id: orgId,
      overall_score: overallScore,
      metadata_score: metadataScore,
      artwork_score: artworkScore,
      marketing_score: marketingScore,
      distribution_score: distributionScore,
      approvals_score: approvalsScore,
      videos_score: videosScore,
      breakdown_json: JSON.stringify(breakdown),
    },
  });

  return { overallScore, breakdown };
}
