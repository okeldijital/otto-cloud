/**
 * Server session resolution.
 *
 * Better Auth is the authentication/session provider. OTTO IAM remains the
 * authoritative identity, organization membership and authorization boundary.
 */

import { headers, cookies } from "next/headers";
import { auth as betterAuth } from "@/lib/auth/better-auth";
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

  // Better Auth is authoritative when its session cookie is present. An
  // invalid Better Auth session must fail closed rather than falling through
  // to the legacy/native session path.
  if (hasBetterAuthSessionCookie(cookie)) {
    const requestHeaders = new Headers();
    if (cookie) requestHeaders.set("cookie", cookie);
    if (authorization) requestHeaders.set("authorization", authorization);

    try {
      const session = await betterAuth.api.getSession({ headers: requestHeaders });
      if (!session) return null;

      return currentIdentityService.resolveFromBetterAuthSession(session, orgHint);
    } catch {
      return null;
    }
  }

  return currentIdentityService.resolveFromRequest({
    cookieHeader: cookie,
    authorizationHeader: authorization,
    organizationIdHint: orgHint,
  });
}

function hasBetterAuthSessionCookie(cookieHeader: string | null): boolean {
  if (!cookieHeader) return false;
  return cookieHeader.includes("better-auth.session_token=") ||
    cookieHeader.includes("__Secure-better-auth.session_token=");
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
