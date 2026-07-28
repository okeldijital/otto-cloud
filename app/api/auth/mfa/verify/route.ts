/**
 * POST /api/auth/mfa/verify
 * - Enrollment confirm: { code } when authenticated + pending enrollment
 * - Login challenge: { mfaToken, code, rememberMe?, trustDevice? }
 */

import { NextResponse } from "next/server";
import {
  mfaService,
  authenticationService,
  currentIdentityService,
  cookieService,
  identityErrorResponse,
  clientIp,
  clientUserAgent,
  metaFromRequest,
  IdentityError,
} from "@/lib/platform/identity";
import { getPlatformConfig } from "@/lib/platform/config";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const code = typeof body.code === "string" ? body.code : "";
    const mfaToken = typeof body.mfaToken === "string" ? body.mfaToken : "";
    const rememberMe = Boolean(body.rememberMe);
    const trustDevice = Boolean(body.trustDevice);
    const ip = clientIp(req);
    const ua = clientUserAgent(req);

    if (!code) {
      throw new IdentityError("code required", 400, "VALIDATION_ERROR");
    }

    // Login MFA challenge path — no session yet
    if (mfaToken) {
      const result = await authenticationService.completeMfaLogin({
        mfaToken,
        code,
        rememberMe,
        trustDevice,
        ipAddress: ip,
        userAgent: ua,
      });
      if (!result.session) {
        throw new IdentityError("Session not created", 500, "SESSION_ERROR");
      }
      const res = NextResponse.json({
        nextStep: result.nextStep,
        identity: result.identity,
        organization: result.organization,
        permissions: result.permissions,
        roles: result.roles,
        requiresMfa: false,
        requiresEmailVerification: result.requiresEmailVerification,
        requiresPasswordChange: result.requiresPasswordChange,
      });
      cookieService.applyAuthCookies(res, {
        sessionToken: result.session.sessionToken,
        refreshToken: result.session.refreshToken,
        accessToken: result.session.accessToken,
        rememberMe,
        accessMaxAgeSeconds: result.session.accessMaxAgeSeconds,
        sessionMaxAgeSeconds: result.session.sessionMaxAgeSeconds,
        refreshMaxAgeSeconds: result.session.refreshMaxAgeSeconds,
      });
      if (result.trustedDeviceToken) {
        const days = getPlatformConfig().security.mfa.trustedDeviceDays;
        cookieService.setTrustedDeviceCookie(
          res,
          result.trustedDeviceToken,
          days * 24 * 60 * 60
        );
      }
      return res;
    }

    // Enrollment confirm (authenticated)
    const ctx = await currentIdentityService.requireFromRequest(
      metaFromRequest(req)
    );
    const confirmed = await mfaService.confirmEnrollment({
      identityId: ctx.identityId,
      code,
      ipAddress: ip,
      userAgent: ua,
    });
    return NextResponse.json(confirmed);
  } catch (err) {
    return identityErrorResponse(err);
  }
}
