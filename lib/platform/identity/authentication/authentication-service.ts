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
import { mfaService } from "./mfa/mfa-service";

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
  /** Present when requiresMfa — complete with POST /api/auth/mfa/challenge */
  mfaToken?: string;
  /** Pending rememberMe when MFA still required */
  rememberMe?: boolean;
  requiresEmailVerification: boolean;
  session: SessionCreateResult | null;
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
    /** Trusted device cookie to skip MFA */
    trustedDeviceToken?: string | null;
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

    // NextAuth removed: only IAM identities can authenticate.
    // Migrate legacy users via scripts/migrate-legacy-auth.ts
    if (!identity) {
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
    const mfaEnabled = await mfaService.isEnabled(fresh.id);
    const trusted = mfaEnabled
      ? await mfaService.isTrustedDevice(
          fresh.id,
          params.trustedDeviceToken ?? undefined
        )
      : true;
    const requiresMfa = mfaEnabled && !trusted;

    const profile = await this.buildLoginProfile(fresh.id);

    // MFA required — do not create session yet
    if (requiresMfa) {
      const mfaToken = mfaService.issueChallengeToken(fresh.id);
      return {
        identity: profile.identity,
        organization: profile.organization,
        permissions: profile.permissions,
        roles: profile.roles,
        requiresMfa: true,
        mfaToken,
        rememberMe: params.rememberMe ?? false,
        requiresEmailVerification,
        session: null,
      };
    }

    const session = await sessionService.createSession({
      identityId: fresh.id,
      organizationId: profile.organization?.id ?? null,
      rememberMe: params.rememberMe ?? false,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.LoginSuccess,
      identityId: fresh.id,
      organizationId: profile.organization?.id,
      payload: {
        sessionId: session.sessionId,
        rememberMe: params.rememberMe ?? false,
        requiresEmailVerification,
        mfaUsed: mfaEnabled,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return {
      ...profile,
      requiresMfa: false,
      requiresEmailVerification,
      session,
    };
  }

  /** Complete MFA step after password login */
  async completeMfaLogin(params: {
    mfaToken: string;
    code: string;
    rememberMe?: boolean;
    trustDevice?: boolean;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<LoginResult & { trustedDeviceToken?: string }> {
    const identityId = mfaService.verifyChallengeToken(params.mfaToken);
    const ok = await mfaService.verifyCode({
      identityId,
      code: params.code,
      allowRecovery: true,
      ipAddress: params.ipAddress,
    });
    if (!ok) {
      throw new IdentityError("Invalid MFA code", 401, "INVALID_MFA_CODE");
    }

    const identity = await prisma.iamIdentity.findUnique({
      where: { id: identityId },
    });
    if (!identity) {
      throw new IdentityError("Identity not found", 404, "IDENTITY_NOT_FOUND");
    }

    const profile = await this.buildLoginProfile(identityId);
    const session = await sessionService.createSession({
      identityId,
      organizationId: profile.organization?.id ?? null,
      rememberMe: params.rememberMe ?? false,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    let trustedDeviceToken: string | undefined;
    if (params.trustDevice) {
      const device = await mfaService.createTrustedDevice({
        identityId,
        userAgent: params.userAgent,
      });
      trustedDeviceToken = device.token;
    }

    await emitIdentityEvent({
      eventType: IDENTITY_EVENTS.LoginSuccess,
      identityId,
      organizationId: profile.organization?.id,
      payload: {
        sessionId: session.sessionId,
        mfa: true,
        trustDevice: !!params.trustDevice,
      },
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return {
      ...profile,
      requiresMfa: false,
      requiresEmailVerification: !identity.emailVerifiedAt,
      session,
      trustedDeviceToken,
    };
  }

  private async buildLoginProfile(identityId: string) {
    const identity = await prisma.iamIdentity.findUnique({
      where: { id: identityId },
    });
    if (!identity) {
      throw new IdentityError("Identity not found", 404, "IDENTITY_NOT_FOUND");
    }

    const membership = await prisma.iamOrganizationMembership.findFirst({
      where: { identityId, status: "active" },
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

    return {
      identity: {
        id: identity.id,
        email: identity.email,
        displayName: identity.displayName,
        emailVerified: !!identity.emailVerifiedAt,
        status: identity.emailVerifiedAt
          ? identity.status === "pending_verification"
            ? "active"
            : identity.status
          : identity.status,
      },
      organization,
      permissions,
      roles,
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
