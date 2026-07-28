/**
 * CookieService — secure cookie set/clear for session, refresh, access tokens.
 */

import { NextResponse } from "next/server";
import { getPlatformConfig } from "@/lib/platform/config";

export type CookieBag = {
  name: string;
  value: string;
  maxAge?: number;
};

export class CookieService {
  private policy() {
    return getPlatformConfig().security.session;
  }

  private baseOptions(maxAgeSeconds: number) {
    const p = this.policy();
    return {
      httpOnly: true,
      secure: p.cookieSecure,
      sameSite: p.cookieSameSite as "lax" | "strict" | "none",
      path: "/",
      maxAge: maxAgeSeconds,
    };
  }

  applyAuthCookies(
    res: NextResponse,
    params: {
      sessionToken: string;
      refreshToken: string;
      accessToken: string;
      rememberMe?: boolean;
      accessMaxAgeSeconds: number;
      sessionMaxAgeSeconds: number;
      refreshMaxAgeSeconds: number;
    }
  ): NextResponse {
    const p = this.policy();
    res.cookies.set(
      p.sessionCookieName,
      params.sessionToken,
      this.baseOptions(params.sessionMaxAgeSeconds)
    );
    res.cookies.set(
      p.refreshCookieName,
      params.refreshToken,
      this.baseOptions(params.refreshMaxAgeSeconds)
    );
    res.cookies.set(
      p.accessCookieName,
      params.accessToken,
      this.baseOptions(params.accessMaxAgeSeconds)
    );
    return res;
  }

  clearAuthCookies(res: NextResponse): NextResponse {
    const p = this.policy();
    const clear = {
      httpOnly: true,
      secure: p.cookieSecure,
      sameSite: p.cookieSameSite as "lax" | "strict" | "none",
      path: "/",
      maxAge: 0,
    };
    res.cookies.set(p.sessionCookieName, "", clear);
    res.cookies.set(p.refreshCookieName, "", clear);
    res.cookies.set(p.accessCookieName, "", clear);
    return res;
  }

  readonly trustedDeviceCookieName = "otto_td";

  readFromRequest(cookieHeader: string | null): {
    sessionToken?: string;
    refreshToken?: string;
    accessToken?: string;
    trustedDeviceToken?: string;
  } {
    if (!cookieHeader) return {};
    const p = this.policy();
    const map = new Map<string, string>();
    for (const part of cookieHeader.split(";")) {
      const [k, ...rest] = part.trim().split("=");
      if (k) map.set(k, rest.join("="));
    }
    return {
      sessionToken: map.get(p.sessionCookieName),
      refreshToken: map.get(p.refreshCookieName),
      accessToken: map.get(p.accessCookieName),
      trustedDeviceToken: map.get(this.trustedDeviceCookieName),
    };
  }

  setTrustedDeviceCookie(
    res: NextResponse,
    token: string,
    maxAgeSeconds: number
  ): NextResponse {
    res.cookies.set(
      this.trustedDeviceCookieName,
      token,
      this.baseOptions(maxAgeSeconds)
    );
    return res;
  }

  clearTrustedDeviceCookie(res: NextResponse): NextResponse {
    const p = this.policy();
    res.cookies.set(this.trustedDeviceCookieName, "", {
      httpOnly: true,
      secure: p.cookieSecure,
      sameSite: p.cookieSameSite as "lax" | "strict" | "none",
      path: "/",
      maxAge: 0,
    });
    return res;
  }
}

export const cookieService = new CookieService();
