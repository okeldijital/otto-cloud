import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { generateApiKey, validScopes } from "@/lib/api-keys";
import { orgContextErrorResponse, requireOrganization } from "@/lib/auth/organization-context";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await requireOrganization();

    const orgId = ctx.organizationId;
    const keys = await prisma.api_keys.findMany({
      where: { organization_id: orgId },
      select: {
        id: true,
        name: true,
        prefix: true,
        key_last_four: true,
        scopes: true,
        rate_limit: true,
        is_active: true,
        last_used_at: true,
        expires_at: true,
        created_at: true,
        revoked_at: true,
      },
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json(keys);
  } catch (err: any) {
    console.error("[GET /api/api-keys]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await requireOrganization();

    const orgId = ctx.organizationId;
    const userId = parseInt((session.user as any).id) || 1;
    const body = await req.json();
    const { name, scopes, rate_limit, expires_in_days } = body;

    if (!name?.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

    const { raw, prefix, hash, lastFour } = generateApiKey();
    const apiKey = `${prefix}${raw}`;

    await prisma.api_keys.create({
      data: {
        organization_id: orgId,
        name: name.trim(),
        prefix,
        key_hash: hash,
        key_last_four: lastFour,
        scopes: scopes || null,
        rate_limit: rate_limit ? parseInt(rate_limit) : null,
        expires_at: expires_in_days
          ? new Date(Date.now() + parseInt(expires_in_days) * 86400000)
          : null,
        created_by: userId,
      },
    });

    return NextResponse.json({
      api_key: apiKey,
      prefix,
      key_last_four: lastFour,
      message: "Save this key — it will not be shown again.",
    }, { status: 201 });
  } catch (err: any) {
    console.error("[POST /api/api-keys]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const ctx = await requireOrganization();

    const orgId = ctx.organizationId;
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const key = await prisma.api_keys.findFirst({
      where: { id: parseInt(id), organization_id: orgId },
    });
    if (!key) return NextResponse.json({ error: "Key not found" }, { status: 404 });

    await prisma.api_keys.update({
      where: { id: key.id },
      data: { is_active: false, revoked_at: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[DELETE /api/api-keys]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
