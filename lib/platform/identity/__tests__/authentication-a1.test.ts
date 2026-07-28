/**
 * IAM Authentication A.1 unit tests (no DB).
 * Run: npm run test:identity
 */
import assert from "node:assert/strict";
import {
  tokenService,
  cookieService,
  rateLimitService,
  generateSecureToken,
  hashToken,
  PermissionSet,
  IDENTITY_EVENTS,
  getPlatformConfig,
  resetPlatformConfig,
  IdentityError,
} from "../index";
import { NextResponse } from "next/server";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed++;
      console.log(`  ✓ ${name}`);
    })
    .catch((e: any) => {
      failed++;
      console.error(`  ✗ ${name}: ${e.message}`);
    });
}

async function main() {
  console.log("\nIAM Authentication (A.1)\n");

  await test("access token issue and verify roundtrip", () => {
    const { token, expiresAt } = tokenService.issueAccessToken({
      identityId: "id-1",
      sessionId: "sid-1",
      organizationId: "org-1",
    });
    assert.ok(token.includes("."));
    assert.ok(expiresAt > new Date());
    const claims = tokenService.verifyAccessToken(token);
    assert.equal(claims.sub, "id-1");
    assert.equal(claims.sid, "sid-1");
    assert.equal(claims.org, "org-1");
  });

  await test("access token rejects tampered signature", () => {
    const { token } = tokenService.issueAccessToken({
      identityId: "id-1",
      sessionId: "sid-1",
    });
    const bad = token.slice(0, -4) + "xxxx";
    assert.throws(
      () => tokenService.verifyAccessToken(bad),
      (e: unknown) => e instanceof IdentityError
    );
  });

  await test("opaque token hash is stable", () => {
    const { token, hash } = tokenService.issueOpaque();
    assert.equal(hash, hashToken(token));
    assert.notEqual(token, hash);
  });

  await test("cookie service sets and clears httpOnly cookies", () => {
    resetPlatformConfig();
    const cfg = getPlatformConfig().security.session;
    let res: NextResponse = NextResponse.json({ ok: true });
    res = cookieService.applyAuthCookies(res, {
      sessionToken: "s",
      refreshToken: "r",
      accessToken: "a",
      accessMaxAgeSeconds: 900,
      sessionMaxAgeSeconds: 3600,
      refreshMaxAgeSeconds: 86400,
    });
    const sid = res.cookies.get(cfg.sessionCookieName);
    const rid = res.cookies.get(cfg.refreshCookieName);
    const at = res.cookies.get(cfg.accessCookieName);
    assert.equal(sid?.value, "s");
    assert.equal(rid?.value, "r");
    assert.equal(at?.value, "a");

    res = cookieService.clearAuthCookies(res);
    assert.equal(res.cookies.get(cfg.sessionCookieName)?.value, "");
  });

  await test("cookie readFromRequest parses header", () => {
    resetPlatformConfig();
    const cfg = getPlatformConfig().security.session;
    const header = `${cfg.sessionCookieName}=abc; ${cfg.refreshCookieName}=def; ${cfg.accessCookieName}=ghi`;
    const parsed = cookieService.readFromRequest(header);
    assert.equal(parsed.sessionToken, "abc");
    assert.equal(parsed.refreshToken, "def");
    assert.equal(parsed.accessToken, "ghi");
  });

  await test("rate limit throws after threshold", () => {
    const email = `rate-${generateSecureToken(8)}@example.com`;
    const limit = getPlatformConfig().security.lockout.loginRateLimitPerMinute;
    for (let i = 0; i < limit; i++) {
      rateLimitService.assertLogin({ email, ip: "127.0.0.1" });
    }
    assert.throws(
      () => rateLimitService.assertLogin({ email, ip: "127.0.0.1" }),
      (e: unknown) =>
        e instanceof IdentityError && (e as IdentityError).code === "RATE_LIMITED"
    );
  });

  await test("session config has short access token default", () => {
    resetPlatformConfig();
    const s = getPlatformConfig().security.session;
    assert.ok(s.accessTokenMinutes >= 10 && s.accessTokenMinutes <= 15);
    assert.ok(s.refreshTokenDays >= 1);
    assert.equal(s.cookieSameSite, "lax");
  });

  await test("lockout policy matches A.1 example defaults", () => {
    resetPlatformConfig();
    const l = getPlatformConfig().security.lockout;
    assert.equal(l.maxAttempts, 5);
    assert.equal(l.durationMinutes, 15);
  });

  await test("A.1 identity events are registered in catalog", () => {
    assert.equal(IDENTITY_EVENTS.SessionRefreshed, "identity.session.refreshed");
    assert.equal(
      IDENTITY_EVENTS.EmailVerificationSent,
      "identity.email.verification.sent"
    );
    assert.equal(IDENTITY_EVENTS.AccountUnlocked, "identity.account.unlocked");
    assert.equal(IDENTITY_EVENTS.Logout, "identity.logout");
  });

  await test("PermissionSet used for request context checks", () => {
    const p = PermissionSet.from(["contracts.view"]);
    assert.ok(p.has("contracts.view"));
    assert.equal(p.has("contracts.review"), false);
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main();
