/**
 * GET /api/auth/organizations/roles — roles for active org
 */

import { NextResponse } from "next/server";
import {
  requireOrganization,
  identityErrorResponse,
} from "@/lib/platform/identity";
import { roleRepository } from "@/lib/platform/identity/repositories/RoleRepository";

export async function GET(req: Request) {
  try {
    const ctx = await requireOrganization(req);
    const roles = await roleRepository.listForOrganization(ctx.organizationId);
    return NextResponse.json({
      roles: roles.map((r) => ({
        id: r.id,
        key: r.key,
        name: r.name,
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
