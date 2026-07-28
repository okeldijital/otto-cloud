/**
 * Centralized IAM middleware helpers for route handlers.
 *
 * Business modules should consume these rather than implementing own checks.
 */

import { NextResponse } from "next/server";
import { IdentityError } from "../domain/types";
import {
  currentIdentityService,
  type CurrentIdentityContext,
} from "./current-identity-service";

export type AuthRequestMeta = {
  cookieHeader?: string | null;
  authorizationHeader?: string | null;
  organizationIdHint?: string | null;
};

export function metaFromRequest(req: Request): AuthRequestMeta {
  return {
    cookieHeader: req.headers.get("cookie"),
    authorizationHeader: req.headers.get("authorization"),
    organizationIdHint:
      req.headers.get("x-organization-id") ||
      req.headers.get("x-org-id") ||
      null,
  };
}

export function identityErrorResponse(err: unknown): NextResponse {
  if (err instanceof IdentityError) {
    return NextResponse.json(
      {
        error: err.message,
        code: err.code,
        details: err.details ?? null,
      },
      { status: err.status }
    );
  }
  console.error("[iam] unexpected error", err);
  return NextResponse.json(
    { error: "Internal Server Error", code: "INTERNAL_ERROR" },
    { status: 500 }
  );
}

export async function requireAuthentication(
  req: Request
): Promise<CurrentIdentityContext> {
  return currentIdentityService.requireFromRequest(metaFromRequest(req));
}

export async function requireActiveSession(
  req: Request
): Promise<CurrentIdentityContext> {
  const ctx = await requireAuthentication(req);
  if (ctx.sessionExpiresAt <= new Date()) {
    throw new IdentityError("Session expired", 401, "SESSION_EXPIRED");
  }
  return ctx;
}

export async function requireEmailVerification(
  req: Request
): Promise<CurrentIdentityContext> {
  const ctx = await requireActiveSession(req);
  if (!ctx.emailVerified) {
    throw new IdentityError(
      "Email verification required",
      403,
      "EMAIL_VERIFICATION_REQUIRED"
    );
  }
  return ctx;
}

export async function requireOrganization(
  req: Request
): Promise<CurrentIdentityContext & { organizationId: string }> {
  const ctx = await requireActiveSession(req);
  if (!ctx.organizationId || !ctx.organization) {
    throw new IdentityError(
      "Organization context required",
      403,
      "ORGANIZATION_REQUIRED"
    );
  }
  return ctx as CurrentIdentityContext & { organizationId: string };
}

export async function requirePermission(
  req: Request,
  permission: string | string[]
): Promise<CurrentIdentityContext> {
  const ctx = await requireActiveSession(req);
  if (ctx.isSuperAdmin) return ctx;

  // Resolve effective permissions for active organization (A.5)
  if (ctx.organizationId) {
    const { permissionResolver } = await import(
      "../authorization/PermissionResolver"
    );
    const { authorizationService } = await import(
      "../authorization/AuthorizationService"
    );
    const resolved = await permissionResolver.resolve(
      ctx.identityId,
      ctx.organizationId
    );
    if (resolved.membershipStatus !== "active") {
      throw new IdentityError(
        "Active membership required",
        403,
        "MEMBERSHIP_REQUIRED"
      );
    }
    authorizationService.authorize(
      {
        identityId: ctx.identityId,
        organizationId: ctx.organizationId,
        permissions: resolved.permissions,
        permissionSet: resolved.permissionSet,
        isOwner: resolved.isOwner,
      },
      permission
    );
    return {
      ...ctx,
      permissions: resolved.permissions,
      roles: resolved.roles,
      permissionSet: resolved.permissionSet,
    };
  }

  const needed = Array.isArray(permission) ? permission : [permission];
  if (!ctx.permissionSet.hasAny(...needed)) {
    throw new IdentityError("Permission denied", 403, "PERMISSION_DENIED", needed);
  }
  return ctx;
}

export async function requireMembership(
  req: Request
): Promise<CurrentIdentityContext & { organizationId: string; membershipId: string }> {
  const ctx = await requireOrganization(req);
  const { membershipRepository } = await import(
    "../repositories/MembershipRepository"
  );
  const membership = await membershipRepository.find(
    ctx.identityId,
    ctx.organizationId
  );
  if (!membership || membership.status !== "active") {
    throw new IdentityError(
      "Active membership required",
      403,
      "MEMBERSHIP_REQUIRED"
    );
  }
  return { ...ctx, membershipId: membership.id };
}

export async function requireOrganizationOwner(
  req: Request
): Promise<CurrentIdentityContext & { organizationId: string }> {
  const ctx = await requireMembership(req);
  if (ctx.isSuperAdmin) return ctx;
  const { membershipRepository } = await import(
    "../repositories/MembershipRepository"
  );
  const membership = await membershipRepository.find(
    ctx.identityId,
    ctx.organizationId
  );
  if (membership?.isOwner) return ctx;
  // Fall through to organizations.manage
  return requirePermission(req, "organizations.manage") as Promise<
    CurrentIdentityContext & { organizationId: string }
  >;
}

/** Client IP from common proxy headers */
export function clientIp(req: Request): string | null {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]?.trim() || null;
  return req.headers.get("x-real-ip");
}

export function clientUserAgent(req: Request): string | null {
  return req.headers.get("user-agent");
}
