import assert from "node:assert/strict";
import { evaluateContractDeletion } from "../delete-policy";

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

console.log("\nContract Deletion Policy\n");

test("failed draft intake is deletable", () => {
  assert.deepEqual(
    evaluateContractDeletion({
      contractStatus: "Draft",
      lifecycleStatus: "draft",
      hasVerifiedContract: false,
      relationshipCount: 0,
      rightReferenceCount: 0,
      rightCount: 0,
      royaltyEntitlementCount: 0,
    }),
    { allowed: true }
  );
});

test("pending verification intake is deletable when unlinked", () => {
  assert.deepEqual(
    evaluateContractDeletion({
      contractStatus: "Draft",
      lifecycleStatus: "pending_verification",
      hasVerifiedContract: false,
      relationshipCount: 0,
      rightReferenceCount: 0,
      rightCount: 0,
      royaltyEntitlementCount: 0,
    }),
    { allowed: true }
  );
});

test("verified contracts are protected", () => {
  const result = evaluateContractDeletion({
    contractStatus: "Draft",
    lifecycleStatus: "draft",
    hasVerifiedContract: true,
    relationshipCount: 0,
    rightReferenceCount: 0,
    rightCount: 0,
    royaltyEntitlementCount: 0,
  });
  assert.equal(result.allowed, false);
  if (!result.allowed) assert.equal(result.code, "CONTRACT_VERIFIED");
});

test("confirmed relationships block deletion", () => {
  const result = evaluateContractDeletion({
    contractStatus: "Draft",
    lifecycleStatus: "draft",
    hasVerifiedContract: false,
    relationshipCount: 1,
    rightReferenceCount: 0,
    rightCount: 0,
    royaltyEntitlementCount: 0,
  });
  assert.equal(result.allowed, false);
  if (!result.allowed) assert.equal(result.code, "CONTRACT_HAS_RELATIONSHIPS");
});

test("downstream rights block deletion", () => {
  const result = evaluateContractDeletion({
    contractStatus: "Draft",
    lifecycleStatus: "draft",
    hasVerifiedContract: false,
    relationshipCount: 0,
    rightReferenceCount: 0,
    rightCount: 1,
    royaltyEntitlementCount: 0,
  });
  assert.equal(result.allowed, false);
  if (!result.allowed) assert.equal(result.code, "CONTRACT_HAS_RIGHTS");
});

test("downstream royalty entitlements block deletion", () => {
  const result = evaluateContractDeletion({
    contractStatus: "Draft",
    lifecycleStatus: "draft",
    hasVerifiedContract: false,
    relationshipCount: 0,
    rightReferenceCount: 0,
    rightCount: 0,
    royaltyEntitlementCount: 1,
  });
  assert.equal(result.allowed, false);
  if (!result.allowed) assert.equal(result.code, "CONTRACT_HAS_ROYALTY_ENTITLEMENTS");
});

test("active lifecycle states are protected", () => {
  const result = evaluateContractDeletion({
    contractStatus: "Active",
    lifecycleStatus: "active",
    hasVerifiedContract: false,
    relationshipCount: 0,
    rightReferenceCount: 0,
    rightCount: 0,
    royaltyEntitlementCount: 0,
  });
  assert.equal(result.allowed, false);
  if (!result.allowed) assert.equal(result.code, "CONTRACT_LIFECYCLE_LOCKED");
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
