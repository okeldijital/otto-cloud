import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  playlistOrgScopeWhere,
  requireOrgAuth,
  requirePlaylistInOrg,
  resourceAuthErrorResponse,
} from "@/lib/auth/resource-authorization";

/**
 * Playlists have no organization_id column.
 * Scoped by tenant_id (= org UUID) or created_by for legacy untenanted rows.
 */
export async function GET(req: Request) {
  try {
    const ctx = await requireOrgAuth();
    const scope = playlistOrgScopeWhere(ctx);

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");

    if (idStr) {
      const id = parseInt(idStr);
      if (!Number.isFinite(id)) {
        return NextResponse.json({ error: "Invalid playlist ID" }, { status: 400 });
      }
      const playlist = await requirePlaylistInOrg(id, ctx);
      return NextResponse.json(playlist);
    }

    const skip = parseInt(searchParams.get("skip") || "0");
    const limit = parseInt(searchParams.get("limit") || "100");

    const [items, total] = await Promise.all([
      prisma.playlists.findMany({
        where: scope as object,
        skip,
        take: limit,
        orderBy: { name: "asc" },
      }),
      prisma.playlists.count({ where: scope as object }),
    ]);
    return NextResponse.json({ total, items });
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[GET /api/playlists]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requireOrgAuth();
    const body = await req.json();
    delete body.organization_id;

    const existing = await prisma.playlists.findFirst({
      where: {
        name: body.name,
        ...(playlistOrgScopeWhere(ctx) as object),
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: `A playlist with the name '${body.name}' already exists.` },
        { status: 409 }
      );
    }

    const newItem = await prisma.playlists.create({
      data: {
        ...body,
        tenant_id: ctx.organizationId,
        created_by: ctx.userId > 0 ? ctx.userId : body.created_by ?? null,
      },
    });
    return NextResponse.json(newItem, { status: 201 });
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[POST /api/playlists]", err);
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "A playlist with this name already exists." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const ctx = await requireOrgAuth();
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing playlist ID" }, { status: 400 });
    const id = parseInt(idStr);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid playlist ID" }, { status: 400 });
    }

    const body = await req.json();
    delete body.organization_id;
    delete body.tenant_id;
    delete body.created_by;

    const existing = await requirePlaylistInOrg(id, ctx);

    if (body.name && body.name !== existing.name) {
      const dup = await prisma.playlists.findFirst({
        where: {
          name: body.name,
          ...(playlistOrgScopeWhere(ctx) as object),
        },
      });
      if (dup)
        return NextResponse.json(
          { error: `A playlist with the name '${body.name}' already exists.` },
          { status: 409 }
        );
    }

    const updated = await prisma.playlists.update({
      where: { id },
      data: { ...body, tenant_id: ctx.organizationId },
    });
    return NextResponse.json(updated);
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[PUT /api/playlists]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const ctx = await requireOrgAuth();
    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing playlist ID" }, { status: 400 });
    const id = parseInt(idStr);
    if (!Number.isFinite(id)) {
      return NextResponse.json({ error: "Invalid playlist ID" }, { status: 400 });
    }

    await requirePlaylistInOrg(id, ctx);
    await prisma.playlists.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    const mapped = resourceAuthErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403 || mapped.status === 404) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[DELETE /api/playlists]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
