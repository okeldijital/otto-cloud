import { NextResponse } from "next/server";
import {
  requirePermission,
  identityErrorResponse,
  IdentityError,
} from "@/lib/platform/identity";
import { roleRepository } from "@/lib/platform/identity/repositories/RoleRepository";
import { PERMISSION_CATALOG } from "@/lib/platform/identity/permissions/catalog";

const catalogKeys = new Set(PERMISSION_CATALOG.map((p) => p.key));

function parseBody(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  const permissions = Array.isArray(body.permissions)
    ? body.permissions.filter((value): value is string => typeof value === "string")
    : [];

  if (!name || name.length < 2 || name.length > 128) {
    throw new IdentityError("Role name must be 2–128 characters", 400, "VALIDATION_ERROR");
  }

  const unique = [...new Set(permissions)];
  const unknown = unique.find((key) => !catalogKeys.has(key));
  if (unknown) {
    throw new IdentityError(`Unknown permission: ${unknown}`, 400, "UNKNOWN_PERMISSION");
  }
  if (unique.includes("platform.admin")) {
    throw new IdentityError(
      "Platform administration cannot be granted through organization roles",
      403,
      "PLATFORM_PERMISSION_DENIED"
    );
  }

  return { name, description, permissions: unique };
}

function assertDelegatedPermissions(
  ctx: { isSuperAdmin?: boolean; permissions?: string[] },
  permissions: string[]
) {
  if (ctx.isSuperAdmin) return;
  const allowed = new Set(ctx.permissions ?? []);
  const denied = permissions.find((permission) => !allowed.has(permission));
  if (denied) {
    throw new IdentityError(
      `You cannot grant a permission you do not have: ${denied}`,
      403,
      "ROLE_GRANT_DENIED"
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ roleId: string }> }
) {
  try {
    const ctx = await requirePermission(req, "roles.manage");
    if (!ctx.organizationId) {
      throw new IdentityError("Organization context required", 403, "ORGANIZATION_REQUIRED");
    }

    const { roleId } = await params;
    const existing = await roleRepository.findByIdForOrganization(ctx.organizationId, roleId);
    if (!existing) throw new IdentityError("Role not found", 404, "ROLE_NOT_FOUND");
    if (existing.isSystem) {
      throw new IdentityError("System roles are managed by Otto and cannot be edited", 409, "SYSTEM_ROLE_IMMUTABLE");
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const input = parseBody(body);
    assertDelegatedPermissions(ctx, input.permissions);

    const role = await roleRepository.updateCustomRole({
      organizationId: ctx.organizationId,
      id: roleId,
      name: input.name,
      description: input.description,
      permissionKeys: input.permissions,
    });

    return NextResponse.json({ role });
  } catch (err) {
    return identityErrorResponse(err);
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ roleId: string }> }
) {
  try {
    const ctx = await requirePermission(req, "roles.manage");
    if (!ctx.organizationId) {
      throw new IdentityError("Organization context required", 403, "ORGANIZATION_REQUIRED");
    }

    const { roleId } = await params;
    const result = await roleRepository.deleteCustomRole(ctx.organizationId, roleId);

    if (!result.deleted) {
      if (result.reason === "NOT_FOUND") {
        throw new IdentityError("Role not found", 404, "ROLE_NOT_FOUND");
      }
      if (result.reason === "SYSTEM_ROLE") {
        throw new IdentityError("System roles cannot be deleted", 409, "SYSTEM_ROLE_IMMUTABLE");
      }
      throw new IdentityError(
        `Role is assigned to ${result.memberCount} member(s). Reassign them before deleting it.`,
        409,
        "ROLE_IN_USE"
      );
    }

    return NextResponse.json({ deleted: true });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
