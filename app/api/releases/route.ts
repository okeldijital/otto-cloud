import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  orgContextErrorResponse,
  orgWhereActive,
  requireOrganization,
} from "@/lib/auth/organization-context";

export async function GET(req: Request) {
  try {
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;

    const { searchParams } = new URL(req.url);

    const idStr = searchParams.get("id");
    if (idStr) {
      const id = parseInt(idStr);
      const relation = searchParams.get("relation");

      if (relation === "tracks") {
        const tracks = await prisma.tracks.findMany({
          where: { release_id: id },
          include: { track_releases: true },
        });

        return NextResponse.json(
          tracks.map((t) => ({
            ...t,
            secondary_release_ids: t.track_releases.map((tr) => tr.release_id),
          }))
        );
      }

      const release = await prisma.releases.findFirst({
        where: { id, organization_id: orgId, is_deleted: false },
      });
      if (!release) return NextResponse.json({ error: "Release not found" }, { status: 404 });

      // Enrich with status_quo data
      const tracks = await prisma.tracks.findMany({ where: { release_id: id } });
      const trackIds = tracks.map((t) => t.id);

      let hasContract = !!(await prisma.contract_assets.findFirst({
        where: { asset_type: "Release", asset_id: id },
      }));
      if (!hasContract && trackIds.length) {
        hasContract = !!(await prisma.contract_assets.findFirst({
          where: { asset_type: "Track", asset_id: { in: trackIds } },
        }));
      }

      const artistIdList: number[] = [];
      if (release.artist_id) artistIdList.push(release.artist_id);
      if (Array.isArray(release.artist_ids)) artistIdList.push(...(release.artist_ids as number[]));

      const hasArtistContract =
        artistIdList.length > 0
          ? !!(await prisma.contract_parties.findFirst({
              where: { entity_type: "Artist", entity_id: { in: artistIdList } },
            }))
          : false;

      return NextResponse.json({ ...release, _tracks: tracks, _hasContract: hasContract, _hasArtistContract: hasArtistContract });
    }

    const skip = parseInt(searchParams.get("skip") || "0");
    const limit = parseInt(searchParams.get("limit") || "100");
    const where = orgWhereActive(ctx);

    const [releases, total] = await Promise.all([
      prisma.releases.findMany({
        where,
        skip,
        take: limit,
        orderBy: { created_at: "desc" },
      }),
      prisma.releases.count({ where }),
    ]);

    const enriched = await Promise.all(
      releases.map(async (r) => {
        const tracks = await prisma.tracks.findMany({ where: { release_id: r.id } });
        const trackIds = tracks.map((t) => t.id);

        let hasContract = !!(await prisma.contract_assets.findFirst({
          where: { asset_type: "Release", asset_id: r.id },
        }));
        if (!hasContract && trackIds.length) {
          hasContract = !!(await prisma.contract_assets.findFirst({
            where: { asset_type: "Track", asset_id: { in: trackIds } },
          }));
        }

        const artistIdList: number[] = [];
        if (r.artist_id) artistIdList.push(r.artist_id);
        if (Array.isArray(r.artist_ids)) artistIdList.push(...(r.artist_ids as number[]));

        const hasArtistContract =
          artistIdList.length > 0
            ? !!(await prisma.contract_parties.findFirst({
                where: { entity_type: "Artist", entity_id: { in: artistIdList } },
              }))
            : false;

        return { ...r, _tracks: tracks, _hasContract: hasContract, _hasArtistContract: hasArtistContract };
      })
    );

    return NextResponse.json({ total, items: enriched });
  } catch (err: any) {
    const mapped = orgContextErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[GET /api/releases]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const ctx = await requireOrganization();

    const body = await req.json();
    const { track_ids, ...releaseData } = body;
    releaseData.organization_id = ctx.organizationId;

    const existing = await prisma.releases.findFirst({
      where: { title: releaseData.title, organization_id: ctx.organizationId },
    });
    if (existing) {
      return NextResponse.json(
        { error: `A release with the title '${releaseData.title}' already exists.` },
        { status: 409 }
      );
    }

    const newRelease = await prisma.releases.create({ data: releaseData });

    // Auto-create Release Workspace
    try {
      const userId = (session.user as any).id;
      const template = await prisma.workspace_templates.findFirst({ where: { slug: "release" } });
      const workspaceName = `${newRelease.title} - ${newRelease.release_type || "Single"} Release`;
      const workspace = await prisma.workspaces.create({
        data: {
          name: workspaceName,
          description: `Release workspace for "${newRelease.title}"`,
          template_id: template?.id,
          release_id: newRelease.id,
          status: "planning",
          organization_id: newRelease.organization_id,
          created_by: userId,
        },
      });
      await prisma.workspace_members.create({
        data: { workspace_id: workspace.id, user_id: userId, role: "owner" },
      });
      await prisma.workspace_timeline_events.create({
        data: {
          workspace_id: workspace.id, user_id: userId,
          event_type: "system", summary: `Release workspace created for "${newRelease.title}"`,
        },
      });
      const channels = ["General", "Artwork", "Marketing", "Distribution", "Production", "Legal"];
      for (let i = 0; i < channels.length; i++) {
        await prisma.workspace_discussion_channels.create({
          data: {
            workspace_id: workspace.id, organization_id: newRelease.organization_id,
            name: channels[i], slug: channels[i].toLowerCase(), sort_order: i,
            created_by: userId,
          },
        });
      }
    } catch (wsErr) {
      console.error("[Release Workspace auto-create failed]", wsErr);
    }

    if (track_ids?.length) {
      const tracksToAssign = await prisma.tracks.findMany({ where: { id: { in: track_ids } } });
      await Promise.all(
        tracksToAssign.map((t) =>
          prisma.tracks.update({
            where: { id: t.id },
            data: {
              release_id: newRelease.id,
              credits: !t.credits && newRelease.credits ? (newRelease.credits as any) : ((t.credits as any) ?? undefined),
            },
          })
        )
      );
    }

    return NextResponse.json(newRelease, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/releases]", err);
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "A release with this Title, Catalog Number, or UPC already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing release ID" }, { status: 400 });
    const id = parseInt(idStr);

    const body = await req.json();
    const { track_ids, ...updateData } = body;

    const existing = await prisma.releases.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Release not found" }, { status: 404 });

    if (updateData.title && updateData.title !== existing.title) {
      const dup = await prisma.releases.findFirst({ where: { title: updateData.title } });
      if (dup) {
        return NextResponse.json(
          { error: `A release with the title '${updateData.title}' already exists.` },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.releases.update({ where: { id }, data: updateData });

    if (track_ids !== undefined) {
      const currentTracks = await prisma.tracks.findMany({ where: { release_id: id } });
      const currentIds = new Set(currentTracks.map((t) => t.id));
      const newIds = new Set<number>(track_ids);

      const toUnassign = Array.from(currentIds).filter((tid) => !newIds.has(tid));
      if (toUnassign.length) {
        await prisma.tracks.updateMany({ where: { id: { in: toUnassign } }, data: { release_id: null } });
      }

      const toAssign = Array.from(newIds).filter((tid) => !currentIds.has(tid));
      if (toAssign.length) {
        const tracksToAssign = await prisma.tracks.findMany({ where: { id: { in: toAssign } } });
        await Promise.all(
          tracksToAssign.map((t) =>
            prisma.tracks.update({
              where: { id: t.id },
              data: {
                release_id: id,
                credits: !t.credits && updated.credits ? (updated.credits as any) : ((t.credits as any) ?? undefined),
              },
            })
          )
        );
      }
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/releases]", err);
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "A database integrity error occurred. This release title, catalog number, or UPC might already be in use." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing release ID" }, { status: 400 });
    const id = parseInt(idStr);

    const existing = await prisma.releases.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Release not found" }, { status: 404 });

    await prisma.tracks.updateMany({ where: { release_id: id }, data: { release_id: null } });
    await prisma.releases.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/releases]", err);
    if (err.code === "P2003" || err.code === "P2014") {
      return NextResponse.json(
        { error: "Cannot delete release because it is linked to contracts or other strict dependencies." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: `Could not delete release: ${err.message}` }, { status: 400 });
  }
}
