/**
 * A.4 TOTP MFA unit tests
 */
import assert from "node:assert/strict";
import { createHmac } from "crypto";
import {
  generateTotpSecret,
  verifyTotp,
  buildOtpAuthUrl,
  totpService,
  mfaPolicyService,
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
  console.log("\nIAM MFA TOTP (A.4)\n");

  await test("enrollment secret generate + encrypt roundtrip", () => {
    const secret = totpService.generateSecret();
    const { ciphertext, keyVersion } = totpService.encryptSecret(secret);
    assert.ok(ciphertext.length > 10);
    assert.equal(totpService.decryptSecret(ciphertext, keyVersion), secret);
  });

  await test("valid TOTP verifies", () => {
    const secret = generateTotpSecret();
    const code = currentTotp(secret);
    assert.equal(verifyTotp(secret, code), true);
    assert.equal(totpService.verify(secret, code), true);
  });

  await test("invalid TOTP rejected", () => {
    const secret = generateTotpSecret();
    assert.equal(verifyTotp(secret, "000000"), false);
    assert.equal(verifyTotp(secret, "abcdef"), false);
  });

  await test("otpauth URL for authenticators", () => {
    const secret = generateTotpSecret();
    const url = buildOtpAuthUrl({
      secret,
      accountName: "user@otto.io",
      issuer: "OTTO",
    });
    assert.ok(url.startsWith("otpauth://totp/"));
    assert.ok(url.includes("secret="));
  });

  await test("MFA policy defaults", () => {
    resetPlatformConfig();
    const p = mfaPolicyService.getPlatformPolicy();
    assert.equal(p.recoveryCodeCount, 10);
    assert.ok(p.challengeTtlSeconds >= 60);
    assert.ok(p.challengeMaxAttempts >= 3);
  });

  await test("org MFA policy optional when not enrolled", async () => {
    const r = await mfaPolicyService.isMfaRequiredForLogin({
      identityId: "id",
      organizationId: null,
      roles: ["member"],
      mfaEnrolled: false,
    });
    assert.equal(r.required, false);
  });

  await test("enrolled user requires MFA challenge", async () => {
    const r = await mfaPolicyService.isMfaRequiredForLogin({
      identityId: "id",
      roles: ["member"],
      mfaEnrolled: true,
    });
    assert.equal(r.required, true);
  });

  await test("MFA events catalog", () => {
    assert.equal(IDENTITY_EVENTS.MfaEnabled, "identity.mfa.enabled");
    assert.equal(
      IDENTITY_EVENTS.MfaChallengeCreated,
      "identity.mfa.challenge.created"
    );
    assert.equal(
      IDENTITY_EVENTS.MfaChallengeCompleted,
      "identity.mfa.challenge.completed"
    );
    assert.equal(
      IDENTITY_EVENTS.MfaChallengeFailed,
      "identity.mfa.challenge.failed"
    );
    assert.equal(
      IDENTITY_EVENTS.MfaRecoveryUsed,
      "identity.mfa.recovery.used"
    );
    assert.equal(
      IDENTITY_EVENTS.MfaRecoveryRegenerated,
      "identity.mfa.recovery.regenerated"
    );
  });

  await test("challenge TTL configurable", () => {
    resetPlatformConfig();
    assert.ok(
      getPlatformConfig().security.mfa.challengeTtlSeconds <= 600
    );
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main();
