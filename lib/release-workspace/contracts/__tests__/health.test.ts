/**
 * Release contract health + projection pure tests (Milestone 5.0).
 * Run: npm run test:release-contracts
 */
import assert from "node:assert/strict";
import {
  computeContractHealth,
  aggregateReleaseHealth,
} from "../health-service";
import {
  HEALTH_STATUS,
  RELEASE_CONTRACT_EVENTS,
  EXPIRING_SOON_DAYS,
} from "../constants";
import { isEventRegistered } from "@/lib/platform/events";

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

console.log("\nRelease Workspace Contracts (M5.0)\n");

test("healthy when verified, active, far expiration", () => {
  const far = new Date();
  far.setDate(far.getDate() + 365);
  const h = computeContractHealth({
    hasVerifiedContract: true,
    lifecycleStatus: "active",
    expirationDate: far,
    relationshipActive: true,
  });
  assert.equal(h.status, HEALTH_STATUS.healthy);
});

test("critical when missing verified contract", () => {
  const h = computeContractHealth({
    hasVerifiedContract: false,
    lifecycleStatus: "active",
    relationshipActive: true,
  });
  assert.equal(h.status, HEALTH_STATUS.critical);
  assert.ok(h.reasons.some((r) => /missing verified/i.test(r)));
});

test("critical when expired lifecycle", () => {
  const h = computeContractHealth({
    hasVerifiedContract: true,
    lifecycleStatus: "expired",
    relationshipActive: true,
  });
  assert.equal(h.status, HEALTH_STATUS.critical);
});

test("critical when relationship broken", () => {
  const h = computeContractHealth({
    hasVerifiedContract: true,
    lifecycleStatus: "active",
    relationshipActive: false,
  });
  assert.equal(h.status, HEALTH_STATUS.critical);
});

test("warning when expiring within threshold", () => {
  const soon = new Date();
  soon.setDate(soon.getDate() + Math.min(30, EXPIRING_SOON_DAYS - 1));
  const h = computeContractHealth({
    hasVerifiedContract: true,
    lifecycleStatus: "active",
    expirationDate: soon,
    relationshipActive: true,
  });
  assert.equal(h.status, HEALTH_STATUS.warning);
});

test("warning on pending renewal", () => {
  const h = computeContractHealth({
    hasVerifiedContract: true,
    lifecycleStatus: "pending_renewal",
    relationshipActive: true,
  });
  assert.equal(h.status, HEALTH_STATUS.warning);
});

test("warning on verification reopened", () => {
  const h = computeContractHealth({
    hasVerifiedContract: true,
    lifecycleStatus: "active",
    relationshipActive: true,
    verificationReopened: true,
  });
  assert.equal(h.status, HEALTH_STATUS.warning);
});

test("aggregate health takes worst status", () => {
  const agg = aggregateReleaseHealth([
    { status: "healthy", reasons: ["ok"] },
    { status: "warning", reasons: ["soon"] },
    { status: "critical", reasons: ["expired"] },
  ]);
  assert.equal(agg.status, "critical");
});

test("empty links yield warning", () => {
  const agg = aggregateReleaseHealth([]);
  assert.equal(agg.status, HEALTH_STATUS.warning);
  assert.ok(agg.reasons.some((r) => /no contracts/i.test(r)));
});

test("release workspace events are registered on platform bus", () => {
  assert.ok(isEventRegistered(RELEASE_CONTRACT_EVENTS.SummaryUpdated));
  assert.ok(isEventRegistered(RELEASE_CONTRACT_EVENTS.HealthChanged));
});

test("health is derived not a free-form enum", () => {
  assert.deepEqual(Object.values(HEALTH_STATUS).sort(), [
    "critical",
    "healthy",
    "warning",
  ]);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
