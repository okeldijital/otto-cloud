/**
 * In-process rate limiter for auth endpoints (A.1).
 * Suitable for single-instance; replace with Redis for multi-instance.
 */

import { getPlatformConfig } from "@/lib/platform/config";
import { IdentityError } from "../../domain/types";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export class RateLimitService {
  private hit(key: string, limit: number, windowMs: number): void {
    const now = Date.now();
    const b = buckets.get(key);
    if (!b || b.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }
    b.count += 1;
    if (b.count > limit) {
      throw new IdentityError(
        "Too many attempts. Try again later.",
        429,
        "RATE_LIMITED"
      );
    }
  }

  assertLogin(params: { email: string; ip?: string | null }): void {
    const limit = getPlatformConfig().security.lockout.loginRateLimitPerMinute;
    const windowMs = 60_000;
    this.hit(`login:email:${params.email.toLowerCase()}`, limit, windowMs);
    if (params.ip) this.hit(`login:ip:${params.ip}`, limit * 3, windowMs);
  }

  assertRefresh(params: { ip?: string | null; sessionId?: string }): void {
    const windowMs = 60_000;
    if (params.sessionId)
      this.hit(`refresh:sid:${params.sessionId}`, 30, windowMs);
    if (params.ip) this.hit(`refresh:ip:${params.ip}`, 60, windowMs);
  }

  assertVerificationResend(params: { email: string; ip?: string | null }): void {
    const windowMs = 60 * 60_000; // 1 hour
    this.hit(`verify:email:${params.email.toLowerCase()}`, 5, windowMs);
    if (params.ip) this.hit(`verify:ip:${params.ip}`, 20, windowMs);
  }

  assertPasswordReset(params: { email: string; ip?: string | null }): void {
    const windowMs = 60 * 60_000; // 1 hour
    this.hit(`reset:email:${params.email.toLowerCase()}`, 5, windowMs);
    if (params.ip) this.hit(`reset:ip:${params.ip}`, 20, windowMs);
  }

  assertMfa(params: { identityId: string; ip?: string | null }): void {
    const windowMs = 60_000;
    this.hit(`mfa:id:${params.identityId}`, 10, windowMs);
    if (params.ip) this.hit(`mfa:ip:${params.ip}`, 30, windowMs);
  }
}

export const rateLimitService = new RateLimitService();
