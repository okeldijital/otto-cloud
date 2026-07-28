/**
 * IAM metrics — in-process counters/timers for observability (A.6).
 * Suitable for single-instance; export via health/metrics endpoint.
 */

type TimerBucket = { count: number; totalMs: number; maxMs: number };

const counters = new Map<string, number>();
const timers = new Map<string, TimerBucket>();

function inc(key: string, n = 1): void {
  counters.set(key, (counters.get(key) || 0) + n);
}

function observe(key: string, ms: number): void {
  const b = timers.get(key) || { count: 0, totalMs: 0, maxMs: 0 };
  b.count += 1;
  b.totalMs += ms;
  b.maxMs = Math.max(b.maxMs, ms);
  timers.set(key, b);
}

export const iamMetrics = {
  loginSuccess() {
    inc("auth.login.success");
  },
  loginFailure() {
    inc("auth.login.failure");
  },
  mfaFailure() {
    inc("auth.mfa.failure");
  },
  mfaSuccess() {
    inc("auth.mfa.success");
  },
  passwordReset() {
    inc("auth.password.reset");
  },
  sessionCreated() {
    inc("session.created");
  },
  sessionRevoked() {
    inc("session.revoked");
  },
  sessionRefresh(ms: number) {
    inc("session.refresh");
    observe("session.refresh.latency_ms", ms);
  },
  permissionResolve(ms: number, cacheHit: boolean) {
    inc(cacheHit ? "authz.cache.hit" : "authz.cache.miss");
    observe("authz.resolve.latency_ms", ms);
  },
  orgSwitch(ms: number) {
    inc("org.switch");
    observe("org.switch.latency_ms", ms);
  },
  invitationAccepted() {
    inc("org.invitation.accepted");
  },
  membershipChanged() {
    inc("org.membership.changed");
  },
  loginDuration(ms: number) {
    observe("auth.login.latency_ms", ms);
  },

  snapshot() {
    const counterObj: Record<string, number> = {};
    for (const [k, v] of counters) counterObj[k] = v;

    const timerObj: Record<
      string,
      { count: number; avgMs: number; maxMs: number }
    > = {};
    for (const [k, b] of timers) {
      timerObj[k] = {
        count: b.count,
        avgMs: b.count ? Math.round((b.totalMs / b.count) * 100) / 100 : 0,
        maxMs: Math.round(b.maxMs * 100) / 100,
      };
    }

    const hits = counters.get("authz.cache.hit") || 0;
    const misses = counters.get("authz.cache.miss") || 0;
    const total = hits + misses;

    return {
      counters: counterObj,
      timers: timerObj,
      authzCacheHitRatio: total ? hits / total : null,
      collectedAt: new Date().toISOString(),
    };
  },

  reset() {
    counters.clear();
    timers.clear();
  },
};

export type IamMetricsSnapshot = ReturnType<typeof iamMetrics.snapshot>;
