import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenant_id;
  if (!tenantId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

  const memberships = await prisma.tenant_users.findMany({
    where: { tenant_id: tenantId },
    include: {
      users: {
        select: {
          id: true,
          email: true,
          name: true,
          is_active: true,
          role: true,
          avatar_url: true,
          last_login: true,
          createdAt: true,
        },
      },
    },
    orderBy: { invited_at: "asc" },
  });

  const members = await Promise.all(memberships.map(async (m) => {
    const userRoles = await prisma.user_roles.findMany({
      where: { user_id: m.user_id },
      include: { roles: true },
    });
    return {
      id: m.id,
      user_id: m.user_id,
      email: m.users.email,
      name: m.users.name,
      is_active: m.users.is_active,
      avatar_url: m.users.avatar_url,
      role: m.users.role,
      last_login: m.users.last_login,
      createdAt: m.users.createdAt,
      roles: userRoles.map(ur => ur.roles),
      is_default: m.is_default,
      invited_at: m.invited_at,
      accepted_at: m.accepted_at,
    };
  }));

  return NextResponse.json(members);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenant_id;
  const actorId = parseInt((session.user as any).id);
  if (!tenantId || isNaN(actorId)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const { email, role_id } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      const alreadyMember = await prisma.tenant_users.findUnique({
        where: { tenant_id_user_id: { tenant_id: tenantId, user_id: existingUser.id } },
      });
      if (alreadyMember) {
        return NextResponse.json({ error: "User is already a member" }, { status: 400 });
      }

      await prisma.tenant_users.create({
        data: {
          tenant_id: tenantId,
          user_id: existingUser.id,
          role_id: role_id || null,
          is_default: false,
          invited_at: new Date(),
          accepted_at: new Date(),
        },
      });

      return NextResponse.json({ success: true, message: "Member added" });
    }

    const token = uuidv4().replace(/-/g, "").slice(0, 32);
    await prisma.invitations.create({
      data: {
        tenant_id: tenantId,
        email,
        invited_by: actorId,
        token,
        role_id: role_id || null,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return NextResponse.json({ success: true, message: "Invitation sent" });
  } catch (error: any) {
    console.error("Error inviting member:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tenantId = (session.user as any).tenant_id;
  if (!tenantId) return NextResponse.json({ error: "No organization context" }, { status: 400 });

  const { searchParams } = new URL(req.url);
  const userId = parseInt(searchParams.get("user_id") || "");

  if (!userId) return NextResponse.json({ error: "user_id is required" }, { status: 400 });

  const org = await prisma.tenants.findUnique({
    where: { id: tenantId },
    select: { owner_id: true },
  });

  if (org?.owner_id === userId) {
    return NextResponse.json({ error: "Cannot remove the organization owner" }, { status: 400 });
  }

  await prisma.tenant_users.deleteMany({
    where: { tenant_id: tenantId, user_id: userId },
  });

  return NextResponse.json({ success: true });
}
