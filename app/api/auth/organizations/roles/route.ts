/**
 * Organization Roles — tenant-scoped RBAC administration.
 *
 * GET  /api/auth/organizations/roles
 * POST /api/auth/organizations/roles
 *
 * Permissions are always validated server-side. Custom roles may only grant
 * organization permissions already held by the actor; platform.admin is never
 * grantable through organization IAM.
 */

import { NextResponse } from "next/server";
import {
  requireOrganization,
  requirePermission,
  identityErrorResponse,
  IdentityError,
} from "@/lib/platform/identity";
import { roleRepository } from "@/lib/platform/identity/repositories/RoleRepository";
import { PERMISSION_CATALOG } from "@/lib/platform/identity/permissions/catalog";

const catalogKeys: Set<string> = new Set(PERMISSION_CATALOG.map((p) => p.key));

function validateRoleInput(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description =
    typeof body.description === "string" ? body.description.trim() : "";
  const permissions = Array.isArray(body.permissions)
    ? body.permissions.filter((value): value is string => typeof value === "string")
    : [];

  if (!name || name.length < 2 || name.length > 128) {
    throw new IdentityError("Role name must be 2–128 characters", 400, "VALIDATION_ERROR");
  }

  const unknown = permissions.filter((key) => !catalogKeys.has(key));
  if (unknown.length) {
    throw new IdentityError(
      `Unknown permission: ${unknown[0]}`,
      400,
      "UNKNOWN_PERMISSION"
    );
  }

  if (permissions.includes("platform.admin")) {
    throw new IdentityError(
      "Platform administration cannot be granted through organization roles",
      403,
      "PLATFORM_PERMISSION_DENIED"
    );
  }

  return { name, description, permissions: [...new Set(permissions)] };
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

export async function GET(req: Request) {
  try {
    const ctx = await requireOrganization(req);
    const roles = await roleRepository.listForOrganization(ctx.organizationId);
    return NextResponse.json({
      roles: roles.map((r) => ({
        id: r.id,
        key: r.key,
        name: r.name,
        description: r.description,
        isSystem: r.isSystem,
        permissionCount: r.permissions.length,
        memberCount: r._count.memberships,
        permissions: r.permissions.map((p) => p.permission.key),
      })),
    });
  } catch (err) {
    return identityErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await requirePermission(req, "roles.manage");
    if (!ctx.organizationId) {
      throw new IdentityError("Organization context required", 403, "ORGANIZATION_REQUIRED");
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const input = validateRoleInput(body);
    assertDelegatedPermissions(ctx, input.permissions);

    const role = await roleRepository.createCustomRole({
      organizationId: ctx.organizationId,
      name: input.name,
      description: input.description,
      permissionKeys: input.permissions,
    });

    return NextResponse.json({ role }, { status: 201 });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
