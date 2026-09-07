import assert from "node:assert/strict";
import { LIFECYCLE_STATUS } from "../constants";
import { decideVerificationReconciliation } from "../reconcile-verification-policy";

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

console.log("\nVerification Lifecycle Reconciliation Policy\n");

test("missing lifecycle is created as verified", () => {
  assert.deepEqual(decideVerificationReconciliation(null), {
    action: "create",
    status: LIFECYCLE_STATUS.verified,
  });
});

test("draft lifecycle transitions to verified", () => {
  assert.deepEqual(decideVerificationReconciliation(LIFECYCLE_STATUS.draft), {
    action: "transition",
    from: LIFECYCLE_STATUS.draft,
    to: LIFECYCLE_STATUS.verified,
  });
});

test("pending verification transitions to verified", () => {
  assert.deepEqual(
    decideVerificationReconciliation(LIFECYCLE_STATUS.pending_verification),
    {
      action: "transition",
      from: LIFECYCLE_STATUS.pending_verification,
      to: LIFECYCLE_STATUS.verified,
    }
  );
});

test("active lifecycle remains active on re-verification", () => {
  assert.deepEqual(decideVerificationReconciliation(LIFECYCLE_STATUS.active), {
    action: "bind",
    status: LIFECYCLE_STATUS.active,
  });
});

test("advanced lifecycle states are preserved on re-verification", () => {
  for (const status of [
    LIFECYCLE_STATUS.pending_renewal,
    LIFECYCLE_STATUS.expired,
    LIFECYCLE_STATUS.terminated,
    LIFECYCLE_STATUS.superseded,
    LIFECYCLE_STATUS.archived,
  ]) {
    assert.deepEqual(decideVerificationReconciliation(status), {
      action: "bind",
      status,
    });
  }
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
