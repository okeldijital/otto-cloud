import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const relationships = await prisma.network_relationships.findMany({
      orderBy: { created_at: "desc" },
    });
    return NextResponse.json(relationships);
  } catch (err: any) {
    console.error("[GET /api/network/relationships]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    if (!body.relationship_type || !body.source_type || !body.target_type) {
      return NextResponse.json({ error: "relationship_type, source_type, and target_type are required" }, { status: 400 });
    }

    const relationship = await prisma.network_relationships.create({
      data: {
        relationship_type: body.relationship_type,
        source_type: body.source_type,
        source_id: body.source_id ? parseInt(body.source_id) : null,
        target_type: body.target_type,
        target_id: body.target_id ? parseInt(body.target_id) : null,
        start_date: body.start_date ? new Date(body.start_date) : null,
        end_date: body.end_date ? new Date(body.end_date) : null,
        notes: body.notes || null,
      },
    });
    return NextResponse.json(relationship, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/network/relationships]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const idStr = searchParams.get("id");
    if (!idStr) return NextResponse.json({ error: "Missing id" }, { status: 400 });
    const id = parseInt(idStr);

    const existing = await prisma.network_relationships.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Relationship not found" }, { status: 404 });

    await prisma.network_relationships.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/network/relationships]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
