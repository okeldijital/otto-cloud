/**
 * GET / PATCH / DELETE /api/admin/organizations/:id
 */

import { NextResponse } from "next/server";
import {
  organizationService,
  requirePermission,
  identityErrorResponse,
} from "@/lib/platform/identity";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePermission(req, ["organizations.manage", "users.manage"]);
    const { id } = await params;
    const org = await organizationService.get(id);
    return NextResponse.json({ organization: org });
  } catch (err) {
    return identityErrorResponse(err);
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission(req, [
      "organizations.manage",
      "security.manage",
    ]);
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const org = await organizationService.update(
      id,
      {
        name: typeof body.name === "string" ? body.name : undefined,
        mfaPolicy:
          typeof body.mfaPolicy === "string" ? body.mfaPolicy : undefined,
        policies:
          body.policies && typeof body.policies === "object"
            ? body.policies
            : undefined,
      },
      ctx.identityId
    );
    return NextResponse.json({ organization: org });
  } catch (err) {
    return identityErrorResponse(err);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await requirePermission(req, [
      "organizations.manage",
      "platform.admin",
    ]);
    const { id } = await params;
    await organizationService.archive(id, ctx.identityId);
    return NextResponse.json({ success: true });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
