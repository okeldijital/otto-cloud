import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  orgContextErrorResponse,
  requireOrganization,
} from "@/lib/auth/organization-context";

/**
 * Labels are a GLOBAL entity today (no organization_id column).
 * See docs/architecture/multi-tenant-model.md §4.3.
 */
export async function GET(req: Request) {
  try {
    await requireOrganization();

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");

    if (idStr) {
      const id = parseInt(idStr);
      const relation = searchParams.get("relation");

      if (relation === "releases") {
        const releases = await prisma.releases.findMany({
          where: { label_id: id, is_deleted: false },
        });
        return NextResponse.json(releases);
      }

      if (relation === "artists") {
        const artists = await prisma.artists.findMany({ where: { label_id: id } });
        return NextResponse.json(artists);
      }

      const label = await prisma.labels.findUnique({ where: { id } });
      if (!label) return NextResponse.json({ error: "Label not found" }, { status: 404 });
      return NextResponse.json(label);
    }

    const skip = parseInt(searchParams.get("skip") || "0");
    const limit = parseInt(searchParams.get("limit") || "100");

    const [labels, total] = await Promise.all([
      prisma.labels.findMany({ skip, take: limit, orderBy: { name: "asc" } }),
      prisma.labels.count(),
    ]);
    return NextResponse.json({ total, items: labels });
  } catch (err: any) {
    const mapped = orgContextErrorResponse(err);
    if (mapped.status === 401 || mapped.status === 403) {
      return NextResponse.json(mapped.body, { status: mapped.status });
    }
    console.error("[GET /api/labels]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    const existing = await prisma.labels.findFirst({ where: { name: body.name } });
    if (existing) {
      return NextResponse.json(
        { error: `A label with the name '${body.name}' already exists.` },
        { status: 409 }
      );
    }

    const newLabel = await prisma.labels.create({ data: body });
    return NextResponse.json(newLabel, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/labels]", err);
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "A database integrity error occurred. This label name or ID might already exist." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing label ID" }, { status: 400 });
    const id = parseInt(idStr);

    const body = await req.json();

    const existing = await prisma.labels.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Label not found" }, { status: 404 });

    if (body.name && body.name !== existing.name) {
      const dup = await prisma.labels.findFirst({ where: { name: body.name } });
      if (dup) {
        return NextResponse.json(
          { error: `A label with the name '${body.name}' already exists.` },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.labels.update({ where: { id }, data: body });
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/labels]", err);
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "A database integrity error occurred. This label name or ID might already be in use." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing label ID" }, { status: 400 });
    const id = parseInt(idStr);

    const existing = await prisma.labels.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Label not found" }, { status: 404 });

    await prisma.labels.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/labels]", err);
    if (err.code === "P2003" || err.code === "P2014") {
      return NextResponse.json(
        { error: "Cannot delete label because it is associated with artists or releases." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
