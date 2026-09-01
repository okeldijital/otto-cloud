import assert from "node:assert/strict";
import {
  assertContractReady,
  buildContractReadiness,
} from "../contract-readiness-service";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error: any) {
    failed++;
    console.error(`  ✗ ${name}: ${error.message}`);
  }
}

console.log("\nContract Readiness\n");

test("missing verified contract blocks capture and readiness", () => {
  const result = buildContractReadiness({
    verifiedContract: false,
    artist: false,
    release: false,
    terms: false,
  });
  assert.equal(result.ready, false);
  assert.equal(result.captureReady, false);
  assert.equal(result.captureStatus, "blocked");
  assert.equal(result.catalogueLinkageStatus, "pending");
  assert.deepEqual(result.blockers, ["verified_contract_missing"]);
});

test("verified contract with terms is captured even when catalogue links are pending", () => {
  const result = buildContractReadiness({
    verifiedContract: true,
    artist: false,
    release: false,
    terms: true,
  });
  assert.equal(result.captureReady, true);
  assert.equal(result.captureStatus, "captured");
  assert.equal(result.catalogueLinkageStatus, "pending");
  assert.equal(result.ready, false);
  assert.deepEqual(result.blockers, ["artist_unresolved", "release_unresolved"]);
});

test("verified contract with missing terms is not captured", () => {
  const result = buildContractReadiness({
    verifiedContract: true,
    artist: true,
    release: true,
    terms: false,
  });
  assert.equal(result.captureReady, false);
  assert.equal(result.captureStatus, "blocked");
  assert.equal(result.catalogueLinkageStatus, "pending");
  assert.equal(result.ready, false);
  assert.deepEqual(result.blockers, ["terms_unverified"]);
});

test("all operational dependencies contextualise the contract", () => {
  const result = buildContractReadiness({
    verifiedContract: true,
    artist: true,
    release: true,
    terms: true,
  });
  assert.equal(result.captureReady, true);
  assert.equal(result.captureStatus, "captured");
  assert.equal(result.catalogueLinkageStatus, "contextualised");
  assert.equal(result.ready, true);
  assert.equal(result.status, "ready");
  assert.deepEqual(result.blockers, []);
});

test("pending suggestions do not satisfy catalogue readiness", () => {
  const result = buildContractReadiness({
    verifiedContract: true,
    artist: false,
    release: false,
    terms: true,
  });
  assert.equal(result.captureReady, true);
  assert.equal(result.catalogueLinkageStatus, "pending");
  assert.equal(result.ready, false);
  assert.deepEqual(result.blockers, ["artist_unresolved", "release_unresolved"]);
});

test("operational readiness assertion accepts contextualised contracts", () => {
  const result = buildContractReadiness({
    verifiedContract: true,
    artist: true,
    release: true,
    terms: true,
  });
  assert.doesNotThrow(() => assertContractReady(result));
});

test("operational readiness assertion rejects non-contextualised contracts", () => {
  const result = buildContractReadiness({
    verifiedContract: true,
    artist: false,
    release: true,
    terms: false,
  });
  assert.throws(
    () => assertContractReady(result),
    (error: any) =>
      error?.status === 409 &&
      error?.code === "CONTRACT_NOT_OPERATIONALLY_READY" &&
      Array.isArray(error?.details) &&
      error.details.includes("artist_unresolved") &&
      error.details.includes("terms_unverified")
  );
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
