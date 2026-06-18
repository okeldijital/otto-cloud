import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/iam";
import { recordAudit } from "@/lib/audit";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const orgId = (session.user as any).organization_id;
  const tenantId = (session.user as any).tenant_id || orgId;
  const action = searchParams.get("action");

  if (action === "detail") {
    const userId = parseInt(searchParams.get("user_id") || "");
    if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, is_active: true, is_superuser: true, role: true, department: true, last_login: true, createdAt: true, organization_id: true },
    });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const roles = await prisma.user_roles.findMany({
      where: { user_id: userId },
      include: { roles: true },
    });
    const teams = await prisma.team_members.findMany({
      where: { user_id: userId },
      include: { teams: true },
    });
    return NextResponse.json({ user, roles: roles.map(r => r.roles), teams: teams.map(t => t.teams) });
  }

  const users = await prisma.user.findMany({
    where: { tenant_id: tenantId },
    select: { id: true, email: true, name: true, is_active: true, is_superuser: true, role: true, department: true, last_login: true, createdAt: true },
    orderBy: { id: "asc" },
  });

  const userIds = users.map(u => u.id);
  const [allRoles, allTeams] = await Promise.all([
    prisma.user_roles.findMany({ where: { user_id: { in: userIds } }, include: { roles: true } }),
    prisma.team_members.findMany({ where: { user_id: { in: userIds } }, include: { teams: true } }),
  ]);
  const rolesByUser: Record<number, any[]> = {};
  const teamsByUser: Record<number, any[]> = {};
  for (const ur of allRoles) { if (!rolesByUser[ur.user_id]) rolesByUser[ur.user_id] = []; rolesByUser[ur.user_id].push(ur.roles); }
  for (const tm of allTeams) { if (!teamsByUser[tm.user_id]) teamsByUser[tm.user_id] = []; teamsByUser[tm.user_id].push(tm.teams); }

  return NextResponse.json(users.map(u => ({ ...u, roles: rolesByUser[u.id] || [], teams: teamsByUser[u.id] || [] })));
}

export async function POST(req: Request) {
  const { user: actor, error } = await requirePermission("users.manage");
  if (error) return error;

  const body = await req.json();
  const orgId = (actor as any).organization_id;
  const action = body.action;

  if (action === "assign-role") {
    const targetUserId = body.user_id;
    const roleId = body.role_id;
    if (!targetUserId || !roleId) return NextResponse.json({ error: "user_id and role_id required" }, { status: 400 });

    const existing = await prisma.user_roles.findUnique({
      where: { user_id_role_id: { user_id: targetUserId, role_id: roleId } },
    });
    if (existing) return NextResponse.json({ error: "Already assigned" }, { status: 400 });

    await prisma.user_roles.create({ data: { user_id: targetUserId, role_id: roleId } });
    recordAudit({ action: "user.role.assigned", entity_type: "user", entity_id: targetUserId, user_id: parseInt(actor.id) });
    return NextResponse.json({ success: true });
  }

  if (action === "remove-role") {
    const targetUserId = body.user_id;
    const roleId = body.role_id;
    await prisma.user_roles.deleteMany({ where: { user_id: targetUserId, role_id: roleId } });
    recordAudit({ action: "user.role.removed", entity_type: "user", entity_id: targetUserId, user_id: parseInt(actor.id) });
    return NextResponse.json({ success: true });
  }

  if (action === "suspend") {
    const targetUserId = body.user_id;
    const user = await prisma.user.findUnique({ where: { id: targetUserId }, select: { id: true, is_active: true } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    const newStatus = !user.is_active;
    await prisma.user.update({ where: { id: targetUserId }, data: { is_active: newStatus } });
    recordAudit({ action: newStatus ? "user.activated" : "user.suspended", entity_type: "user", entity_id: targetUserId, user_id: parseInt(actor.id) });
    return NextResponse.json({ is_active: newStatus });
  }

  if (action === "reset-password") {
    const targetUserId = body.user_id;
    const newPassword = body.password;
    if (!newPassword || newPassword.length < 6) return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 });
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: targetUserId }, data: { hashed_password: hashed } });
    recordAudit({ action: "user.password.reset", entity_type: "user", entity_id: targetUserId, user_id: parseInt(actor.id) });
    return NextResponse.json({ success: true });
  }

  if (action === "update") {
    const targetUserId = body.user_id;
    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.department !== undefined) updateData.department = body.department;
    if (body.role !== undefined) updateData.role = body.role;
    if (Object.keys(updateData).length === 0) return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    await prisma.user.update({ where: { id: targetUserId }, data: updateData });
    recordAudit({ action: "user.updated", entity_type: "user", entity_id: targetUserId, user_id: parseInt(actor.id) });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
