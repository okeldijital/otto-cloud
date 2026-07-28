/**
 * IAM A.2–A.4 unit tests (no DB).
 */
import assert from "node:assert/strict";
import {
  validatePasswordStrength,
  generateTotpSecret,
  verifyTotp,
  buildOtpAuthUrl,
  mfaService,
  IDENTITY_EVENTS,
  getPlatformConfig,
  resetPlatformConfig,
  PermissionSet,
  PERMISSION_CATALOG,
  SYSTEM_ROLE_TEMPLATES,
} from "../index";
import { createHmac } from "crypto";

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

/** Generate current TOTP for a base32 secret (test helper) */
function currentTotp(secretBase32: string): string {
  const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const cleaned = secretBase32.toUpperCase().replace(/=+$/, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of cleaned) {
    const idx = BASE32.indexOf(ch);
    if (idx < 0) continue;
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  const secret = Buffer.from(out);
  const counter = Math.floor(Date.now() / 1000 / 30);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));
  const hmac = createHmac("sha1", secret).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0xf;
  const bin =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);
  return (bin % 1_000_000).toString().padStart(6, "0");
}

async function main() {
  console.log("\nIAM Authentication A.2–A.4 / A.5–A.6\n");

  await test("password policy rejects weak passwords", () => {
    assert.equal(validatePasswordStrength("short").ok, false);
    assert.ok(validatePasswordStrength("GoodPassw0rd!x").ok);
  });

  await test("TOTP secret generate and verify", () => {
    const secret = generateTotpSecret();
    assert.ok(secret.length >= 16);
    const code = currentTotp(secret);
    assert.equal(verifyTotp(secret, code), true);
    assert.equal(verifyTotp(secret, "000000"), false);
  });

  await test("otpauth URL includes issuer and secret", () => {
    const secret = generateTotpSecret();
    const url = buildOtpAuthUrl({
      secret,
      accountName: "user@otto.io",
      issuer: "OTTO",
    });
    assert.ok(url.startsWith("otpauth://totp/"));
    assert.ok(url.includes("secret="));
    assert.ok(url.includes("OTTO"));
  });

  await test("MFA legacy challenge token compat", () => {
    const token = mfaService.issueChallengeToken(
      "00000000-0000-0000-0000-000000000001"
    );
    const id = mfaService.verifyChallengeToken(token);
    assert.equal(id, "00000000-0000-0000-0000-000000000001");
  });

  await test("password/reset/session events exist", () => {
    assert.equal(
      IDENTITY_EVENTS.PasswordResetRequested,
      "identity.password.reset.requested"
    );
    assert.equal(
      IDENTITY_EVENTS.PasswordChanged,
      "identity.password.changed"
    );
    assert.equal(IDENTITY_EVENTS.MfaEnabled, "identity.mfa.enabled");
  });

  await test("RBAC catalog and system roles defined", () => {
    assert.ok(PERMISSION_CATALOG.length >= 10);
    assert.ok(SYSTEM_ROLE_TEMPLATES.org_admin);
    assert.ok(SYSTEM_ROLE_TEMPLATES.member);
    assert.ok(SYSTEM_ROLE_TEMPLATES.viewer);
    const adminPerms = PermissionSet.from(
      SYSTEM_ROLE_TEMPLATES.org_admin.permissions
    );
    assert.ok(adminPerms.has("organizations.manage"));
    assert.ok(adminPerms.has("security.manage"));
  });

  await test("legacy nextauth feature flag is off", () => {
    resetPlatformConfig();
    assert.equal(getPlatformConfig().features.legacyNextAuth, false);
    assert.equal(getPlatformConfig().features.iamNativeAuth, true);
  });

  await test("token policy has password reset TTL", () => {
    resetPlatformConfig();
    assert.ok(
      getPlatformConfig().security.tokens.passwordResetTtlMinutes >= 15
    );
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main();
