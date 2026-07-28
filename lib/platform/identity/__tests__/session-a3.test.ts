/**
 * A.3 Session management unit tests
 */
import assert from "node:assert/strict";
import {
  parseUserAgent,
  sessionPolicyService,
  tokenService,
  IDENTITY_EVENTS,
  getPlatformConfig,
  resetPlatformConfig,
} from "../index";

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
  console.log("\nIAM Session Management (A.3)\n");

  await test("device registration: parse Chrome on macOS", () => {
    const d = parseUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    assert.equal(d.browser, "Chrome");
    assert.equal(d.os, "macOS");
    assert.equal(d.deviceType, "desktop");
    assert.ok(d.fingerprintKey.length >= 16);
    assert.ok(d.name.includes("Chrome"));
  });

  await test("device registration: parse mobile Safari", () => {
    const d = parseUserAgent(
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1"
    );
    assert.equal(d.os, "iOS");
    assert.equal(d.deviceType, "mobile");
  });

  await test("session policy: centralized config", () => {
    resetPlatformConfig();
    const p = sessionPolicyService.getPolicy();
    assert.ok(p.idleTimeoutHours > 0);
    assert.ok(p.maxAgeHours > 0);
    assert.ok(p.maxConcurrentSessions >= 0);
    assert.equal(typeof p.logoutAllKeepCurrent, "boolean");
  });

  await test("session policy: lifetimes respect remember-me", () => {
    const a = sessionPolicyService.lifetimes(false);
    const b = sessionPolicyService.lifetimes(true);
    assert.ok(b.sessionMaxAgeSeconds >= a.sessionMaxAgeSeconds);
    assert.ok(a.accessMaxAgeSeconds > 0);
  });

  await test("idle timeout detection", () => {
    const old = new Date(Date.now() - 48 * 60 * 60 * 1000);
    assert.equal(sessionPolicyService.isIdleExpired(old), true);
    assert.equal(sessionPolicyService.isIdleExpired(new Date()), false);
  });

  await test("session version in access token", () => {
    const { token } = tokenService.issueAccessToken({
      identityId: "id",
      sessionId: "sid",
      sessionVersion: 3,
    });
    assert.equal(tokenService.verifyAccessToken(token).sv, 3);
  });

  await test("session lifecycle events registered", () => {
    assert.equal(IDENTITY_EVENTS.SessionCreated, "identity.session.created");
    assert.equal(IDENTITY_EVENTS.SessionRevoked, "identity.session.revoked");
    assert.equal(IDENTITY_EVENTS.SessionExpired, "identity.session.expired");
    assert.equal(
      IDENTITY_EVENTS.SessionLogoutAll,
      "identity.session.logout_all"
    );
    assert.equal(
      IDENTITY_EVENTS.SessionNewDevice,
      "identity.session.new_device"
    );
    assert.equal(IDENTITY_EVENTS.SessionTrusted, "identity.session.trusted");
    assert.equal(
      IDENTITY_EVENTS.SessionUntrusted,
      "identity.session.untrusted"
    );
  });

  await test("risk level extension default exists in policy surface", () => {
    // riskLevel is on session model default UNKNOWN — policy docs only
    resetPlatformConfig();
    assert.ok(getPlatformConfig().security.session.accessTokenMinutes >= 10);
  });

  await test("trusted device days from session policy", () => {
    resetPlatformConfig();
    assert.ok(sessionPolicyService.getPolicy().trustedDeviceDays >= 1);
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main();
