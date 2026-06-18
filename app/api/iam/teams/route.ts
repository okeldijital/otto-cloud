import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/iam";
import { recordAudit } from "@/lib/audit";

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const orgId = (session.user as any).organization_id;
  const action = searchParams.get("action");

  if (action === "members") {
    const teamId = parseInt(searchParams.get("team_id") || "");
    if (!teamId) return NextResponse.json({ error: "team_id required" }, { status: 400 });
    const members = await prisma.team_members.findMany({
      where: { team_id: teamId },
      include: { users: { select: { id: true, email: true, name: true, is_active: true, role: true } } },
    });
    return NextResponse.json(members);
  }

  const teams = await prisma.teams.findMany({
    where: { organization_id: orgId },
    orderBy: { name: "asc" },
    include: { _count: { select: { team_members: true } } },
  });
  return NextResponse.json(teams);
}

export async function POST(req: Request) {
  const { user, error } = await requirePermission("teams.manage");
  if (error) return error;

  const body = await req.json();
  const orgId = (user as any).organization_id;

  if (body.action === "add-member") {
    const teamId = body.team_id;
    const userId = body.user_id;
    if (!teamId || !userId) return NextResponse.json({ error: "team_id and user_id required" }, { status: 400 });

    const existing = await prisma.team_members.findUnique({
      where: { team_id_user_id: { team_id: teamId, user_id: userId } },
    });
    if (existing) return NextResponse.json({ error: "Already a member" }, { status: 400 });

    const member = await prisma.team_members.create({
      data: { team_id: teamId, user_id: userId, role: body.role || null },
    });
    recordAudit({ action: "team.member.added", entity_type: "team", entity_id: teamId, user_id: parseInt(user.id) });
    return NextResponse.json(member, { status: 201 });
  }

  if (!body.name) return NextResponse.json({ error: "Team name required" }, { status: 400 });

  const existing = await prisma.teams.findUnique({
    where: { organization_id_name: { organization_id: orgId, name: body.name } },
  });
  if (existing) return NextResponse.json({ error: "Team already exists" }, { status: 400 });

  const team = await prisma.teams.create({
    data: { name: body.name, description: body.description || null, organization_id: orgId },
  });
  recordAudit({ action: "team.created", entity_type: "team", entity_id: team.id, entity_name: team.name, user_id: parseInt(user.id) });
  return NextResponse.json(team, { status: 201 });
}

export async function PUT(req: Request) {
  const { user, error } = await requirePermission("teams.manage");
  if (error) return error;

  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: "Team ID required" }, { status: 400 });

  if (body.action === "remove-member") {
    await prisma.team_members.deleteMany({
      where: { team_id: body.id, user_id: body.user_id },
    });
    return NextResponse.json({ success: true });
  }

  const orgId = (user as any).organization_id;
  const team = await prisma.teams.findFirst({ where: { id: body.id, organization_id: orgId } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  await prisma.teams.update({
    where: { id: body.id },
    data: { name: body.name, description: body.description },
  });
  recordAudit({ action: "team.updated", entity_type: "team", entity_id: team.id, entity_name: team.name, user_id: parseInt(user.id) });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const { user, error } = await requirePermission("teams.manage");
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const id = parseInt(searchParams.get("id") || "");
  if (!id) return NextResponse.json({ error: "Team ID required" }, { status: 400 });

  const team = await prisma.teams.findUnique({ where: { id } });
  if (!team) return NextResponse.json({ error: "Team not found" }, { status: 404 });

  await prisma.teams.delete({ where: { id } });
  recordAudit({ action: "team.deleted", entity_type: "team", entity_id: id, entity_name: team?.name, user_id: parseInt(user.id) });
  return NextResponse.json({ success: true });
}
