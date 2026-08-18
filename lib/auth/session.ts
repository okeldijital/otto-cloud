/**
 * Server session resolution — IAM native.
 *
 * Authentication and authorization are resolved exclusively through IAM
 * identity, session, organization membership, roles, and permissions.
 */

import { headers, cookies } from "next/headers";
import {
  currentIdentityService,
  type CurrentIdentityContext,
} from "@/lib/platform/sdk";

export type AuthSessionUser = {
  id: string;
  identityId: string;
  email: string;
  name?: string | null;
  organization_id: string;
  tenant_id: string | null;
  role: string | null;
  is_superuser: boolean;
  permissions: string[];
  emailVerified: boolean;
};

export type AuthSession = {
  user: AuthSessionUser;
};

export async function resolveIdentityFromHeaders(
  cookieHeader?: string | null,
  authorizationHeader?: string | null,
  organizationIdHint?: string | null
): Promise<CurrentIdentityContext | null> {
  let cookie = cookieHeader ?? null;
  let authorization = authorizationHeader ?? null;
  let orgHint = organizationIdHint ?? null;

  if (cookie === null || authorization === null) {
    try {
      const h = await headers();
      cookie = cookie ?? h.get("cookie");
      authorization = authorization ?? h.get("authorization");
      orgHint = orgHint ?? h.get("x-organization-id") ?? h.get("x-org-id");
    } catch {
      // outside request context
    }
  }

  if (!cookie) {
    try {
      const jar = await cookies();
      const parts: string[] = [];
      for (const c of jar.getAll()) {
        parts.push(`${c.name}=${c.value}`);
      }
      if (parts.length) cookie = parts.join("; ");
    } catch {
      /* no request store */
    }
  }

  return currentIdentityService.resolveFromRequest({
    cookieHeader: cookie,
    authorizationHeader: authorization,
    organizationIdHint: orgHint,
  });
}

export function toAuthSession(ctx: CurrentIdentityContext): AuthSession {
  return {
    user: {
      id: ctx.identityId,
      identityId: ctx.identityId,
      email: ctx.email,
      name: ctx.displayName,
      organization_id: ctx.organizationId ?? "",
      tenant_id: ctx.organizationId,
      role: ctx.roles[0] ?? null,
      is_superuser: ctx.isSuperAdmin,
      permissions: ctx.permissions,
      emailVerified: ctx.emailVerified,
    },
  };
}

/** Drop-in replacement for getServerSession() */
export async function getServerSession(): Promise<AuthSession | null> {
  const ctx = await resolveIdentityFromHeaders();
  if (!ctx) return null;
  return toAuthSession(ctx);
}

export async function requireServerSession(): Promise<AuthSession> {
  const session = await getServerSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}
