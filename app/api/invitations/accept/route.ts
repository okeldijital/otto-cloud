import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { recordAudit } from "@/lib/audit";

export async function POST(req: Request) {
  try {
    const { token, password, name } = await req.json();
    if (!token || !password) {
      return NextResponse.json({ error: "Token and password required" }, { status: 400 });
    }

    const invitation = await prisma.invitations.findUnique({
      where: { token },
      include: { tenants: true },
    });

    if (!invitation) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    if (invitation.accepted_at) return NextResponse.json({ error: "Invitation already accepted" }, { status: 400 });
    if (new Date() > invitation.expires_at) return NextResponse.json({ error: "Invitation expired" }, { status: 400 });

    const hashedPassword = await bcrypt.hash(password, 10);

    let user = await prisma.user.findUnique({ where: { email: invitation.email } });
    if (user) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          hashed_password: hashedPassword,
          name: name || user.name,
          is_active: true,
          tenant_id: invitation.tenant_id,
          organization_id: invitation.tenant_id,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          email: invitation.email,
          hashed_password: hashedPassword,
          name: name || invitation.email.split("@")[0],
          is_active: true,
          organization_id: invitation.tenant_id,
          tenant_id: invitation.tenant_id,
        },
      });
    }

    await prisma.tenant_users.upsert({
      where: { tenant_id_user_id: { tenant_id: invitation.tenant_id, user_id: user.id } },
      update: { accepted_at: new Date(), role_id: invitation.role_id || undefined },
      create: {
        tenant_id: invitation.tenant_id,
        user_id: user.id,
        is_default: true,
        accepted_at: new Date(),
        role_id: invitation.role_id || null,
        invited_by: invitation.invited_by,
      },
    });

    await prisma.invitations.update({
      where: { id: invitation.id },
      data: { accepted_at: new Date() },
    });

    recordAudit({
      action: "invitation.accepted",
      entity_type: "invitation",
      entity_id: invitation.id,
      entity_name: invitation.email,
      user_id: user.id,
      organization_id: invitation.tenant_id,
    });

    return NextResponse.json({
      success: true,
      message: "Account created! You can now log in.",
      email: invitation.email,
    });
  } catch (error: any) {
    console.error("Accept invitation error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
