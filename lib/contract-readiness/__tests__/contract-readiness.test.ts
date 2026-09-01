import assert from "node:assert/strict";
import { buildContractReadiness } from "../contract-readiness-service";

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

test("missing verified contract blocks readiness", () => {
  const result = buildContractReadiness({
    verifiedContract: false,
    artist: false,
    release: false,
    terms: false,
  });
  assert.equal(result.ready, false);
  assert.deepEqual(result.blockers, ["verified_contract_missing"]);
});

test("verified contract with missing dependencies is blocked", () => {
  const result = buildContractReadiness({
    verifiedContract: true,
    artist: true,
    release: false,
    terms: false,
  });
  assert.equal(result.ready, false);
  assert.deepEqual(result.blockers, ["release_unresolved", "terms_unverified"]);
});

test("all operational dependencies make contract ready", () => {
  const result = buildContractReadiness({
    verifiedContract: true,
    artist: true,
    release: true,
    terms: true,
  });
  assert.equal(result.ready, true);
  assert.equal(result.status, "ready");
  assert.deepEqual(result.blockers, []);
});

test("pending suggestions do not satisfy readiness", () => {
  const result = buildContractReadiness({
    verifiedContract: true,
    artist: false,
    release: false,
    terms: true,
  });
  assert.equal(result.ready, false);
  assert.deepEqual(result.blockers, ["artist_unresolved", "release_unresolved"]);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
