/**
 * A.2 Password management unit tests
 * Run via npm run test:identity
 */
import assert from "node:assert/strict";
import {
  passwordValidator,
  estimateEntropy,
  passwordPolicyService,
  tokenService,
  IDENTITY_EVENTS,
  getPlatformConfig,
  resetPlatformConfig,
  validatePasswordStrength,
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
  console.log("\nIAM Password Management (A.2)\n");

  await test("test-password-policy: minimum length", () => {
    resetPlatformConfig();
    const r = passwordValidator.validate("Ab1!");
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.code === "MIN_LENGTH"));
  });

  await test("test-password-policy: complexity and entropy", () => {
    resetPlatformConfig();
    const weak = passwordValidator.validate("aaaaaaaaaaaa");
    assert.equal(weak.ok, false);
    const strong = passwordValidator.validate("Str0ng!Passphrase99");
    assert.ok(strong.ok, strong.errors.map((e) => e.message).join("; "));
    assert.ok(estimateEntropy("Str0ng!Passphrase99") > 20);
  });

  await test("test-password-policy: client policy omits banned list", () => {
    const client = passwordPolicyService.getClientPolicy();
    assert.ok(client.minimumLength >= 8);
    assert.equal("bannedSubstrings" in client, false);
    assert.ok(typeof client.historyDepth === "number");
  });

  await test("test-password-change: validatePasswordStrength compat", () => {
    assert.equal(validatePasswordStrength("short").ok, false);
    assert.ok(validatePasswordStrength("GoodPassw0rd!x").ok);
  });

  await test("test-session-version: access token embeds sv claim", () => {
    const { token } = tokenService.issueAccessToken({
      identityId: "id-1",
      sessionId: "sid-1",
      sessionVersion: 7,
    });
    const claims = tokenService.verifyAccessToken(token);
    assert.equal(claims.sv, 7);
  });

  await test("test-session-version: default sv is 0", () => {
    const { token } = tokenService.issueAccessToken({
      identityId: "id-1",
      sessionId: "sid-1",
    });
    const claims = tokenService.verifyAccessToken(token);
    assert.equal(claims.sv, 0);
  });

  await test("test-events: password lifecycle event names", () => {
    assert.equal(IDENTITY_EVENTS.PasswordChanged, "identity.password.changed");
    assert.equal(
      IDENTITY_EVENTS.PasswordResetRequested,
      "identity.password.reset.requested"
    );
    assert.equal(
      IDENTITY_EVENTS.PasswordResetCompleted,
      "identity.password.reset.completed"
    );
    assert.equal(IDENTITY_EVENTS.PasswordExpired, "identity.password.expired");
    assert.equal(
      IDENTITY_EVENTS.PasswordForceReset,
      "identity.password.force_reset"
    );
  });

  await test("test-password-expiration: default max age disabled", () => {
    resetPlatformConfig();
    assert.equal(getPlatformConfig().security.password.maximumAgeDays, 0);
  });

  await test("test-password-history: historyDepth default is 5", () => {
    resetPlatformConfig();
    assert.equal(passwordPolicyService.historyDepth(), 5);
  });

  await test("test-password-policy: max length rejection", () => {
    resetPlatformConfig();
    const long = "Aa1!" + "x".repeat(200);
    const r = passwordValidator.validate(long);
    assert.equal(r.ok, false);
    assert.ok(r.errors.some((e) => e.code === "MAX_LENGTH"));
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main();
