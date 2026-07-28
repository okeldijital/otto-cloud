/**
 * SessionPolicyService — centralized session policy (A.3).
 */

import {
  getPlatformConfig,
  type SessionPolicyConfig,
} from "@/lib/platform/config";

export class SessionPolicyService {
  getPolicy(): SessionPolicyConfig {
    return getPlatformConfig().security.session;
  }

  lifetimes(rememberMe: boolean) {
    const p = this.getPolicy();
    const sessionHours = rememberMe
      ? Math.min(p.rememberMeDays * 24, p.refreshTokenDays * 24)
      : p.maxAgeHours;
    const refreshDays = rememberMe
      ? Math.min(p.rememberMeDays, p.refreshTokenDays)
      : Math.max(1, Math.ceil(p.maxAgeHours / 24));
    const now = Date.now();
    const sessionExpiresAt = new Date(now + sessionHours * 60 * 60 * 1000);
    const absoluteExpiresAt = new Date(now + sessionHours * 60 * 60 * 1000);
    return {
      sessionExpiresAt,
      absoluteExpiresAt,
      refreshExpiresAt: new Date(now + refreshDays * 24 * 60 * 60 * 1000),
      sessionMaxAgeSeconds: Math.floor(sessionHours * 60 * 60),
      refreshMaxAgeSeconds: Math.floor(refreshDays * 24 * 60 * 60),
      accessMaxAgeSeconds: p.accessTokenMinutes * 60,
      idleTimeoutMs: p.idleTimeoutHours * 60 * 60 * 1000,
    };
  }

  /** Next idle-based expiry from last activity */
  idleExpiresAt(lastActivityAt: Date): Date {
    const p = this.getPolicy();
    return new Date(
      lastActivityAt.getTime() + p.idleTimeoutHours * 60 * 60 * 1000
    );
  }

  isIdleExpired(lastActivityAt: Date, absoluteExpiresAt?: Date | null): boolean {
    const idle = this.idleExpiresAt(lastActivityAt);
    if (idle <= new Date()) return true;
    if (absoluteExpiresAt && absoluteExpiresAt <= new Date()) return true;
    return false;
  }
}

export const sessionPolicyService = new SessionPolicyService();
