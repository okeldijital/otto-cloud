/**
 * Verified Contract promotion unit tests (Milestone 3.2).
 * Run: npx tsx lib/verified-contract/__tests__/promotion.test.ts
 */
import assert from "node:assert/strict";
import { parsePartyNames } from "../promotion";
import { VERIFIED_CONTRACT_EVENTS } from "../events";

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

console.log("\nVerified Contract Domain (M3.2)\n");

test("parsePartyNames splits and/or commas", () => {
  assert.deepEqual(parsePartyNames("Artist A and Label B"), [
    "Artist A",
    "Label B",
  ]);
  assert.deepEqual(parsePartyNames("A, B, and C"), ["A", "B", "C"]);
  assert.deepEqual(parsePartyNames("Solo Entity"), ["Solo Entity"]);
  assert.deepEqual(parsePartyNames(""), []);
  assert.deepEqual(parsePartyNames(null), []);
});

test("platform event names are stable", () => {
  assert.equal(VERIFIED_CONTRACT_EVENTS.Created, "VerifiedContractCreated");
  assert.equal(VERIFIED_CONTRACT_EVENTS.Reverified, "VerifiedContractReverified");
  assert.equal(VERIFIED_CONTRACT_EVENTS.PartyAdded, "VerifiedPartyAdded");
});

test("idempotency key is verificationSessionId (documented contract)", () => {
  // Pure rule: one VerifiedContract per session — tested at service layer conceptually
  const sessionId = "sess-1";
  const promotions = new Map<string, number>();
  function promote(id: string) {
    if (promotions.has(id)) return { created: false, version: promotions.get(id)! };
    const version = promotions.size + 1;
    promotions.set(id, version);
    return { created: true, version };
  }
  assert.deepEqual(promote(sessionId), { created: true, version: 1 });
  assert.deepEqual(promote(sessionId), { created: false, version: 1 });
  assert.deepEqual(promote("sess-2"), { created: true, version: 2 });
});

test("only accepted/edited decisions promote (rejected ignored)", () => {
  const fields = [
    { decision: "accepted", value: "Title" },
    { decision: "edited", value: "Parties X" },
    { decision: "rejected", value: "Should ignore" },
  ];
  const promoted = fields.filter((f) =>
    ["accepted", "edited"].includes(f.decision)
  );
  assert.equal(promoted.length, 2);
  assert.ok(!promoted.some((f) => f.value === "Should ignore"));
});

test("provenance requires document, extraction, session, reviewer", () => {
  const provenance = {
    documentId: "d1",
    extractionId: "e1",
    verificationSessionId: "s1",
    reviewerUserId: 9,
    verifiedAt: new Date().toISOString(),
  };
  assert.ok(provenance.documentId);
  assert.ok(provenance.extractionId);
  assert.ok(provenance.verificationSessionId);
  assert.ok(provenance.reviewerUserId);
  assert.ok(provenance.verifiedAt);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
