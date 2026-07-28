/**
 * Royalty entitlement unit tests (Milestone 7.0).
 * Run: npm run test:royalty-entitlements
 */
import assert from "node:assert/strict";
import {
  canTransitionEntitlement,
  ENTITLEMENT_EVENTS,
  ENTITLEMENT_STATUS,
  ENTITLEMENT_TRANSITIONS,
  mapRightCategoryToRevenue,
  REVENUE_CATEGORIES,
  validateFractionalSplit,
} from "../constants";
import {
  canManageEntitlements,
  canReviewEntitlements,
} from "../permissions";
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

console.log("\nRoyalty Entitlements (M7.0)\n");

test("revenue categories are data-driven", () => {
  assert.ok(REVENUE_CATEGORIES.includes("master"));
  assert.ok(REVENUE_CATEGORIES.includes("streaming"));
  assert.ok(REVENUE_CATEGORIES.includes("mechanical"));
});

test("maps right categories to revenue categories", () => {
  assert.equal(mapRightCategoryToRevenue("master_recording"), "master");
  assert.equal(mapRightCategoryToRevenue("synchronization"), "sync");
  assert.equal(mapRightCategoryToRevenue("streaming"), "streaming");
});

test("lifecycle transitions validated", () => {
  assert.ok(canTransitionEntitlement("pending_review", "approved"));
  assert.ok(canTransitionEntitlement("approved", "active"));
  assert.ok(canTransitionEntitlement("active", "suspended"));
  assert.equal(canTransitionEntitlement("archived", "active"), false);
  assert.deepEqual(ENTITLEMENT_TRANSITIONS.archived, []);
});

test("fractional split validation totals 100", () => {
  assert.ok(
    validateFractionalSplit([
      { sharePercent: 50 },
      { sharePercent: 50 },
    ]).ok
  );
  assert.equal(
    validateFractionalSplit([{ sharePercent: 60 }, { sharePercent: 50 }]).ok,
    false
  );
  assert.ok(
    validateFractionalSplit([{ sharePercent: 0.5 }, { sharePercent: 0.5 }]).ok
  );
});

test("platform entitlement events registered", () => {
  assert.ok(isEventRegistered(ENTITLEMENT_EVENTS.CandidateCreated));
  assert.ok(isEventRegistered(ENTITLEMENT_EVENTS.ReviewCompleted));
  assert.ok(isEventRegistered(ENTITLEMENT_EVENTS.Created));
  assert.ok(isEventRegistered(ENTITLEMENT_EVENTS.Activated));
  assert.ok(isEventRegistered(ENTITLEMENT_EVENTS.Expired));
  assert.ok(isEventRegistered(ENTITLEMENT_EVENTS.Terminated));
});

test("viewers cannot review entitlements", () => {
  assert.equal(
    canReviewEntitlements({ isSuperAdmin: false, role: "viewer" } as any),
    false
  );
  assert.equal(
    canManageEntitlements({ isSuperAdmin: false, role: "admin" } as any),
    true
  );
});

test("happy path candidate → approved → active", () => {
  assert.ok(canTransitionEntitlement("candidate", "pending_review"));
  assert.ok(canTransitionEntitlement("pending_review", "approved"));
  assert.ok(canTransitionEntitlement("approved", "active"));
  assert.equal(ENTITLEMENT_STATUS.active, "active");
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
