import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email as string },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const action = searchParams.get("action");
    const ctx = await requireOrganization();
    const orgId = ctx.organizationId;
    if (action === "team") {
      const members = await prisma.user.findMany({
        where: { organization_id: orgId },
        select: { id: true, email: true, name: true, is_active: true, role: true, createdAt: true, last_login: true },
        orderBy: { id: "asc" },
      });
      return NextResponse.json(members);
    }

    const adminList = searchParams.get("all");
    if (adminList === "true" && currentUser.is_superuser) {
      const users = await prisma.user.findMany({
        select: { id: true, email: true, name: true, is_active: true, is_superuser: true, role: true, createdAt: true, last_login: true, organization_id: true },
        orderBy: { id: "asc" },
      });
      return NextResponse.json(users);
    }

    const { hashed_password, ...userWithoutPassword } = currentUser;
    return NextResponse.json(userWithoutPassword);
  } catch (error: any) {
    console.error("Error fetching users:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "invite") {
      const { email, password, name, role } = await req.json();
      if (!email || !password) {
        return NextResponse.json({ error: "Email and password required" }, { status: 400 });
      }

      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) {
        return NextResponse.json({ error: "Email already registered" }, { status: 400 });
      }

      const ctx = await requireOrganization();

      const orgId = ctx.organizationId;
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await prisma.user.create({
        data: {
          email,
          hashed_password: hashedPassword,
          name: name || email.split("@")[0],
          organization_id: orgId,
          role: role || "user",
          is_active: true,
        },
        select: { id: true, email: true, name: true, role: true, is_active: true },
      });

      return NextResponse.json(newUser, { status: 201 });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    console.error("Error in users POST:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const updateData: any = {};
    if (body.full_name) updateData.name = body.full_name;
    if (body.avatar_url) updateData.avatar_url = body.avatar_url;

    const updatedUser = await prisma.user.update({
      where: { email: session.user.email as string },
      data: updateData,
    });

    const { hashed_password, ...userWithoutPassword } = updatedUser;
    return NextResponse.json(userWithoutPassword);
  } catch (error: any) {
    console.error("Error updating me:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
