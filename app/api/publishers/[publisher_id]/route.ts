import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ publisher_id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { publisher_id } = await params;
    const id = parseInt(publisher_id);

    const publisher = await prisma.publishers.findUnique({ where: { id } });
    if (!publisher) return NextResponse.json({ error: "Publisher not found" }, { status: 404 });

    return NextResponse.json(publisher);
  } catch (err: any) {
    console.error("[GET /api/publishers/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ publisher_id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { publisher_id } = await params;
    const id = parseInt(publisher_id);
    const body = await req.json();

    const existing = await prisma.publishers.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Publisher not found" }, { status: 404 });

    if (body.name && body.name !== existing.name) {
      const dup = await prisma.publishers.findFirst({ where: { name: body.name } });
      if (dup) {
        return NextResponse.json(
          { error: `A publisher with the name '${body.name}' already exists.` },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.publishers.update({ where: { id }, data: body });
    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("[PUT /api/publishers/[id]]", err);
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "A database integrity error occurred. This publisher name or ID might already be in use." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ publisher_id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { publisher_id } = await params;
    const id = parseInt(publisher_id);

    const existing = await prisma.publishers.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Publisher not found" }, { status: 404 });

    await prisma.publishers.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/publishers/[id]]", err);
    if (err.code === "P2003" || err.code === "P2014") {
      return NextResponse.json(
        { error: "Cannot delete publisher because it is associated with artists or works." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
