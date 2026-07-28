/**
 * IAM Foundation tests (Milestone A.0)
 * Run: npm run test:identity
 */
import assert from "node:assert/strict";
import {
  hashPassword,
  verifyPassword,
  isArgon2idHash,
  generateSecureToken,
  hashToken,
  secureCompare,
  normalizeEmail,
  encryptSecret,
  decryptSecret,
  validatePasswordStrength,
  PermissionSet,
  PERMISSION_CATALOG,
  IDENTITY_EVENTS,
  isKnownPermission,
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
  console.log("\nIAM Identity Foundation (A.0)\n");

  await test("argon2id hash and verify", async () => {
    const h = await hashPassword("Str0ng!Password99");
    assert.ok(isArgon2idHash(h));
    assert.equal(await verifyPassword("Str0ng!Password99", h), true);
    assert.equal(await verifyPassword("wrong-password!!", h), false);
  });

  await test("password policy enforces length and complexity", () => {
    assert.equal(validatePasswordStrength("short").ok, false);
    assert.equal(validatePasswordStrength("alllowercase1!").ok, false);
    assert.ok(validatePasswordStrength("GoodPassw0rd!x").ok);
  });

  await test("secure tokens are unique and hashable", () => {
    const a = generateSecureToken();
    const b = generateSecureToken();
    assert.notEqual(a, b);
    assert.equal(hashToken(a).length, 64);
    assert.ok(secureCompare(hashToken(a), hashToken(a)));
    assert.equal(secureCompare(hashToken(a), hashToken(b)), false);
  });

  await test("normalizeEmail lowercases", () => {
    assert.equal(normalizeEmail("  Admin@OTTO.IO "), "admin@otto.io");
  });

  await test("secret box encrypt/decrypt roundtrip", () => {
    const { ciphertext, keyVersion } = encryptSecret("otpauth-secret-value");
    assert.ok(ciphertext.length > 20);
    assert.equal(decryptSecret(ciphertext, keyVersion), "otpauth-secret-value");
  });

  await test("PermissionSet replaces role string checks", () => {
    const p = PermissionSet.from(["contracts.view", "rights.review"]);
    assert.ok(p.has("contracts.view"));
    assert.equal(p.has("contracts.promote"), false);
    assert.ok(p.hasAny("rights.review", "rights.manage"));
    assert.equal(p.hasAll("contracts.view", "contracts.promote"), false);
  });

  await test("permission catalog includes contracts rights royalties platform", () => {
    assert.ok(isKnownPermission("contracts.review"));
    assert.ok(isKnownPermission("rights.manage"));
    assert.ok(isKnownPermission("royalties.view"));
    assert.ok(isKnownPermission("platform.events.replay"));
    assert.ok(isKnownPermission("users.invite"));
    assert.ok(PERMISSION_CATALOG.length >= 10);
  });

  await test("identity events use stable names", () => {
    assert.equal(IDENTITY_EVENTS.LoginSuccess, "identity.login.success");
    assert.equal(IDENTITY_EVENTS.MfaEnabled, "identity.mfa.enabled");
    assert.equal(
      IDENTITY_EVENTS.PasswordResetCompleted,
      "identity.password.reset.completed"
    );
  });

  await test("platform config owns security password policy", () => {
    resetPlatformConfig();
    const cfg = getPlatformConfig();
    assert.ok(cfg.security.password.minLength >= 12);
    assert.equal(cfg.security.password.algorithm, "argon2id");
    assert.ok(cfg.security.session.maxAgeHours > 0);
    assert.equal(typeof cfg.features.legacyNextAuth, "boolean");
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main();
