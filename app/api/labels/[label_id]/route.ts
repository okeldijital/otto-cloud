import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ label_id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { label_id } = await params;
    const id = parseInt(label_id);

    const label = await prisma.labels.findUnique({ where: { id } });
    if (!label) return NextResponse.json({ error: "Label not found" }, { status: 404 });

    return NextResponse.json(label);
  } catch (err: any) {
    console.error("[GET /api/labels/[id]]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ label_id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { label_id } = await params;
    const id = parseInt(label_id);
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
    console.error("[PUT /api/labels/[id]]", err);
    if (err.code === "P2002") {
      return NextResponse.json(
        { error: "A database integrity error occurred. This label name or ID might already be in use." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ label_id: string }> }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { label_id } = await params;
    const id = parseInt(label_id);

    const existing = await prisma.labels.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Label not found" }, { status: 404 });

    await prisma.labels.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err: any) {
    console.error("[DELETE /api/labels/[id]]", err);
    if (err.code === "P2003" || err.code === "P2014") {
      return NextResponse.json(
        { error: "Cannot delete label because it is associated with artists or releases." },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
