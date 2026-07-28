/**
 * Human verification helpers (Milestone 3.1).
 * Run: npx tsx lib/document-intelligence/__tests__/verification.test.ts
 */
import assert from "node:assert/strict";
import {
  confidenceBand,
  confidenceBandVariant,
} from "../verification/confidence-ui";
import { canVerifyDocuments } from "../verification/permissions";
import {
  DEFAULT_ACCEPT_CONFIDENCE_THRESHOLD,
  FIELD_VERIFICATION_STATE,
  REQUIRED_VERIFICATION_FIELDS,
  SESSION_STATUS,
} from "../constants";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e: any) {
    failed++;
    console.error(`  ✗ ${name}: ${e.message}`);
  }
}

console.log("\nHuman Verification (M3.1)\n");

test("confidence bands 95/80 thresholds", () => {
  assert.equal(confidenceBand(0.99), "high");
  assert.equal(confidenceBand(0.95), "high");
  assert.equal(confidenceBand(0.94), "medium");
  assert.equal(confidenceBand(0.8), "medium");
  assert.equal(confidenceBand(0.79), "low");
});

test("confidence variants map to badge colors", () => {
  assert.equal(confidenceBandVariant("high"), "success");
  assert.equal(confidenceBandVariant("medium"), "warn");
  assert.equal(confidenceBandVariant("low"), "critical");
});

test("viewers cannot verify", () => {
  assert.equal(
    canVerifyDocuments({
      isSuperAdmin: false,
      role: "viewer",
      permissions: [],
    } as any),
    false
  );
});

test("admins and managers can verify", () => {
  assert.equal(
    canVerifyDocuments({
      isSuperAdmin: false,
      role: "admin",
      permissions: [],
    } as any),
    true
  );
  assert.equal(
    canVerifyDocuments({
      isSuperAdmin: true,
      role: "viewer",
      permissions: [],
    } as any),
    true
  );
});

test("required fields defined for completion", () => {
  assert.ok(REQUIRED_VERIFICATION_FIELDS.includes("title" as any));
  assert.ok(REQUIRED_VERIFICATION_FIELDS.includes("parties" as any));
  assert.ok(REQUIRED_VERIFICATION_FIELDS.includes("effective_date" as any));
});

test("field states include verified promotion", () => {
  assert.equal(FIELD_VERIFICATION_STATE.verified, "verified");
  assert.equal(FIELD_VERIFICATION_STATE.draft, "draft");
});

test("session statuses", () => {
  assert.equal(SESSION_STATUS.completed, "completed");
  assert.equal(SESSION_STATUS.reopened, "reopened");
});

test("bulk accept threshold default 80%", () => {
  assert.equal(DEFAULT_ACCEPT_CONFIDENCE_THRESHOLD, 0.8);
});

test("completion rule: draft required fields block complete", () => {
  const fields = [
    { fieldKey: "title", verificationState: "accepted" },
    { fieldKey: "parties", verificationState: "draft" },
    { fieldKey: "effective_date", verificationState: "edited" },
  ];
  const pending = REQUIRED_VERIFICATION_FIELDS.filter((key) => {
    const f = fields.find((x) => x.fieldKey === key);
    return !f || f.verificationState === "draft";
  });
  assert.deepEqual(pending, ["parties"]);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
