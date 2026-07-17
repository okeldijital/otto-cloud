import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const wpId = parseInt(id);
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const orgId = (session.user as any).organization_id;

    const workspace = await prisma.workspaces.findUnique({
      where: { id: wpId },
      select: { template_id: true, organization_id: true },
    });
    if (!workspace || workspace.organization_id !== orgId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const [definitions, values] = await Promise.all([
      workspace.template_id
        ? prisma.workspace_template_fields.findMany({
            where: { template_id: workspace.template_id },
            orderBy: { sort_order: "asc" },
          })
        : Promise.resolve([]),
      prisma.workspace_dynamic_fields.findMany({
        where: { workspace_id: wpId, organization_id: orgId },
      }),
    ]);

    const valueMap = new Map(values.map((v) => [v.field_key, v.field_value]));

    const fields = definitions.map((def) => ({
      id: def.id,
      field_key: def.field_key,
      label: def.label,
      field_type: def.field_type,
      options: def.options ? JSON.parse(def.options) : undefined,
      is_required: def.is_required,
      placeholder: def.placeholder,
      sort_order: def.sort_order,
      section_slug: def.section_slug,
      value: valueMap.get(def.field_key) || def.default_value || null,
    }));

    return NextResponse.json(fields);
  } catch (err: any) {
    console.error("[GET /api/workspace/[id]/fields]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const wpId = parseInt(id);
    const session = await getServerSession(authOptions);
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const orgId = (session.user as any).organization_id;
    const userId = parseInt((session.user as any).id) || undefined;

    const workspace = await prisma.workspaces.findUnique({
      where: { id: wpId },
      select: { organization_id: true },
    });
    if (!workspace || workspace.organization_id !== orgId) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = await req.json();
    const { fields } = body;

    if (!fields || typeof fields !== "object") {
      return NextResponse.json({ error: "fields object required" }, { status: 400 });
    }

    for (const [fieldKey, fieldValue] of Object.entries(fields)) {
      const stringValue = fieldValue !== null && fieldValue !== undefined ? JSON.stringify(fieldValue) : null;
      await prisma.workspace_dynamic_fields.upsert({
        where: { workspace_id_field_key: { workspace_id: wpId, field_key: fieldKey } },
        update: { field_value: stringValue, updated_by: userId },
        create: { workspace_id: wpId, organization_id: orgId, field_key: fieldKey, field_value: stringValue, updated_by: userId },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[PUT /api/workspace/[id]/fields]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
