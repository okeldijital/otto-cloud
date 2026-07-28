/**
 * AuthenticationService — login / logout orchestration (native IAM, not NextAuth).
 *
 * Flow:
 * Validate → Lookup identity → Verify password → Status → Email verify gate
 * → Create session → Refresh + access tokens → Cookies (caller) → Events
 */

import { prisma } from "@/lib/prisma";
import { getPlatformConfig } from "@/lib/platform/config";
import { IdentityError } from "../domain/types";
import { verifyPassword } from "./crypto/password";
import { normalizeEmail } from "./crypto/tokens";
import { emitIdentityEvent, IDENTITY_EVENTS } from "./events";
import { lockoutService } from "./lockout/lockout-service";
import { rateLimitService } from "./rate-limit/rate-limit-service";
import { sessionService, type SessionCreateResult } from "./sessions/session-service";
import { currentIdentityService } from "./current-identity-service";

export type LoginResult = {
  identity: {
    id: string;
    email: string;
    displayName: string | null;
    emailVerified: boolean;
    status: string;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
  } | null;
  permissions: string[];
  roles: string[];
  requiresMfa: boolean;
  requiresEmailVerification: boolean;
  session: SessionCreateResult;
};

export type PublicSessionView = {
  authenticated: boolean;
  identity: {
    id: string;
    email: string;
    displayName: string | null;
    emailVerified: boolean;
    status: string;
  } | null;
  organization: {
    id: string;
    name: string;
    slug: string;
    status: string;
  } | null;
  roles: string[];
  permissions: string[];
  sessionExpiresAt: string | null;
  emailVerificationStatus: "verified" | "pending" | "unknown";
};

export class AuthenticationService {
  async login(params: {
    email: string;
    password: string;
    rememberMe?: boolean;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<LoginResult> {
    const email = params.email?.trim() ?? "";
    const password = params.password ?? "";

    if (!email || !password) {
      throw new IdentityError(
        "Email and password required",
        400,
        "VALIDATION_ERROR"
      );
    }

    rateLimitService.assertLogin({
      email,
      ip: params.ipAddress,
    });

    const emailNormalized = normalizeEmail(email);
    const identity = await prisma.iamIdentity.findUnique({
      where: { emailNormalized },
      include: {
        passwordCreds: true,
      },
    });

    // Dual-run: identity not on IAM → client should use legacy next-auth
    if (!identity) {
      const features = getPlatformConfig().features;
      if (features.legacyNextAuth) {
        // Check if legacy user exists to avoid enumerating via different codes
        const legacy = await prisma.user.findUnique({
          where: { email },
        });
        if (legacy) {
          throw new IdentityError(
            "Use legacy authentication",
            409,
            "LEGACY_AUTH_REQUIRED"
          );
        }
      }
      await this.recordUnknownFailure(email, params);
      throw new IdentityError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    await lockoutService.maybeAutoUnlock(identity);

    // Re-fetch after possible unlock
    const fresh = await prisma.iamIdentity.findUnique({
      where: { id: identity.id },
      include: { passwordCreds: true },
    });
    if (!fresh) {
      throw new IdentityError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    if (lockoutService.isLocked(fresh)) {
      await emitIdentityEvent({
        eventType: IDENTITY_EVENTS.LoginFailed,
        identityId: fresh.id,
        payload: { reason: "account_locked", email: fresh.email },
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });
      throw new IdentityError(
        "Account temporarily locked. Try again later.",
        403,
        "ACCOUNT_LOCKED"
      );
    }

    if (fresh.status === "disabled") {
      await emitIdentityEvent({
        eventType: IDENTITY_EVENTS.LoginFailed,
        identityId: fresh.id,
        payload: { reason: "account_disabled", email: fresh.email },
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });
      throw new IdentityError("Account is disabled", 403, "ACCOUNT_DISABLED");
    }

    const cred = fresh.passwordCreds[0];
    if (!cred) {
      await this.failLogin(fresh.id, fresh.email, "no_password_credential", params);
      throw new IdentityError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    const ok = await verifyPassword(password, cred.passwordHash);
    if (!ok) {
      const lock = await lockoutService.recordFailure({
        identityId: fresh.id,
        email: fresh.email,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });
      await emitIdentityEvent({
        eventType: IDENTITY_EVENTS.LoginFailed,
        identityId: fresh.id,
        payload: {
          reason: "invalid_credentials",
          locked: lock.locked,
        },
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });
      if (lock.locked) {
        throw new IdentityError(
          "Account temporarily locked. Try again later.",
          403,
          "ACCOUNT_LOCKED"
        );
      }
      throw new IdentityError("Invalid credentials", 401, "INVALID_CREDENTIALS");
    }

    // Password verified — explicit transition
    await lockoutService.recordSuccess({
      identityId: fresh.id,
      email: fresh.email,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    const requiresEmailVerification = !fresh.emailVerifiedAt;
    // MFA is A.4 — always false for now
    const requiresMfa = false;

    const membership = await prisma.iamOrganizationMembership.findFirst({
      where: { identityId: fresh.id, status: "active" },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      include: {
        organization: true,
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    const organization = membership?.organization
      ? {
          id: membership.organization.id,
          name: membership.organization.name,
          slug: membership.organization.slug,
        }
      : null;

    const roles: string[] = membership?.role ? [membership.role.key] : [];
    const permissions: string[] = membership?.role
      ? [
          ...new Set(
            membership.role.permissions.map((rp) => rp.permission.key)
          ),
        ]
      : [];

    // Allow login even when email not verified — session created, client may gate
    const session = await sessionService.createSession({
      identityId: fresh.id,
      organizationId: organization?.id ?? null,
      rememberMe: params.rememberMe ?? false,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.LoginSuccess,
      identityId: fresh.id,
      organizationId: organization?.id,
      payload: {
        sessionId: session.sessionId,
        rememberMe: params.rememberMe ?? false,
        requiresEmailVerification,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return {
      identity: {
        id: fresh.id,
        email: fresh.email,
        displayName: fresh.displayName,
        emailVerified: !!fresh.emailVerifiedAt,
        status: fresh.emailVerifiedAt
          ? fresh.status === "pending_verification"
            ? "active"
            : fresh.status
          : fresh.status,
      },
      organization,
      permissions,
      roles,
      requiresMfa,
      requiresEmailVerification,
      session,
    };
  }

  async logout(params: {
    sessionId: string;
    identityId: string;
    organizationId?: string | null;
    allSessions?: boolean;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    if (params.allSessions) {
      await sessionService.revokeAllSessions(
        params.identityId,
        "logout_all"
      );
    } else {
      await sessionService.revokeSession(params.sessionId, "logout", {
        identityId: params.identityId,
        organizationId: params.organizationId,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
      });
    }

    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.Logout,
      identityId: params.identityId,
      organizationId: params.organizationId,
      payload: {
        sessionId: params.sessionId,
        allSessions: params.allSessions ?? false,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  async getPublicSession(params: {
    cookieHeader?: string | null;
    authorizationHeader?: string | null;
  }): Promise<PublicSessionView> {
    const ctx = await currentIdentityService.resolveFromRequest(params);
    if (!ctx) {
      return {
        authenticated: false,
        identity: null,
        organization: null,
        roles: [],
        permissions: [],
        sessionExpiresAt: null,
        emailVerificationStatus: "unknown",
      };
    }
    return {
      authenticated: true,
      identity: {
        id: ctx.identityId,
        email: ctx.email,
        displayName: ctx.displayName,
        emailVerified: ctx.emailVerified,
        status: ctx.status,
      },
      organization: ctx.organization,
      roles: ctx.roles,
      permissions: ctx.permissions,
      sessionExpiresAt: ctx.sessionExpiresAt.toISOString(),
      emailVerificationStatus: ctx.emailVerified ? "verified" : "pending",
    };
  }

  private async failLogin(
    identityId: string,
    email: string,
    reason: string,
    params: { ipAddress?: string | null; userAgent?: string | null }
  ) {
    await lockoutService.recordFailure({
      identityId,
      email,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.LoginFailed,
      identityId,
      payload: { reason, email },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }

  private async recordUnknownFailure(
    email: string,
    params: { ipAddress?: string | null; userAgent?: string | null }
  ) {
    try {
      await prisma.iamLoginAttempt.create({
        data: {
          email: normalizeEmail(email),
          success: false,
          ipAddress: params.ipAddress ?? null,
          userAgent: params.userAgent ?? null,
          reason: "unknown_identity",
        },
      });
    } catch {
      /* non-blocking */
    }
    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.LoginFailed,
      payload: { reason: "unknown_identity", email: normalizeEmail(email) },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });
  }
}

export const authenticationService = new AuthenticationService();
