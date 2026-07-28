import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/iam";
import { recordAudit } from "@/lib/audit";
import crypto from "crypto";

export async function GET(req: Request) {
  const session = await getServerSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  if (token) {
    const invitation = await prisma.invitations.findUnique({
      where: { token },
      include: { tenants: { select: { name: true, display_name: true } } },
    });
    if (!invitation) return NextResponse.json({ error: "Invitation not found" }, { status: 404 });
    if (invitation.accepted_at) return NextResponse.json({ error: "Invitation already accepted" }, { status: 400 });
    if (new Date() > invitation.expires_at) return NextResponse.json({ error: "Invitation expired" }, { status: 400 });
    return NextResponse.json({
      id: invitation.id,
      email: invitation.email,
      tenant_name: invitation.tenants.display_name || invitation.tenants.name,
      message: invitation.message,
    });
  }

  const { user, error } = await requirePermission("users.manage");
  if (error) return error;

  const orgId = (user as any).organization_id;
  const tenantId = (user as any).tenant_id || orgId;

  const invitations = await prisma.invitations.findMany({
    where: { tenant_id: tenantId },
    orderBy: { created_at: "desc" },
    take: 50,
  });
  return NextResponse.json(invitations);
}

export async function POST(req: Request) {
  const { user, error } = await requirePermission("users.invite");
  if (error) return error;

  const body = await req.json();
  if (!body.email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const orgId = (user as any).organization_id;
  const tenantId = (user as any).tenant_id || orgId;
  const existingUser = await prisma.user.findUnique({ where: { email: body.email } });

  const token = `otto_invite_${crypto.randomBytes(32).toString("hex")}`;
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const invitation = await prisma.invitations.create({
    data: {
      tenant_id: tenantId,
      email: body.email,
      invited_by: parseInt(user.id),
      token,
      role_id: body.role_id || null,
      message: body.message || null,
      expires_at: expiresAt,
    },
  });

  recordAudit({
    action: "invitation.created",
    entity_type: "invitation",
    entity_id: invitation.id,
    entity_name: body.email,
    user_id: parseInt(user.id),
    organization_id: orgId,
  });

  const inviteUrl = `${process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_URL || "http://localhost:3000"}/invite?token=${token}`;

  return NextResponse.json({
    id: invitation.id,
    email: invitation.email,
    invite_url: inviteUrl,
    token,
    expires_at: expiresAt,
    message: existingUser
      ? "User already has an account. They will be added to your organization when they accept."
      : "Invitation created. Share the invite link with the user.",
  }, { status: 201 });
}
