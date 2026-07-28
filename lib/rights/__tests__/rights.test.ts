/**
 * Rights domain unit tests (Milestone 6.0).
 * Run: npm run test:rights
 */
import assert from "node:assert/strict";
import {
  canTransitionRight,
  RIGHT_CATEGORIES,
  RIGHT_EVENTS,
  RIGHT_STATUS,
  RIGHT_TRANSITIONS,
} from "../constants";
import { canManageRights, canReviewRights } from "../permissions";
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

console.log("\nRights Domain (M6.0)\n");

test("categories are data-driven and non-empty", () => {
  assert.ok(RIGHT_CATEGORIES.length >= 10);
  assert.ok(RIGHT_CATEGORIES.includes("master_recording"));
  assert.ok(RIGHT_CATEGORIES.includes("synchronization"));
  assert.ok(RIGHT_CATEGORIES.includes("custom"));
});

test("lifecycle transitions are validated", () => {
  assert.ok(canTransitionRight("candidate", "pending_review"));
  assert.ok(canTransitionRight("pending_review", "approved"));
  assert.ok(canTransitionRight("approved", "active"));
  assert.ok(canTransitionRight("active", "expired"));
  assert.ok(canTransitionRight("active", "terminated"));
  assert.equal(canTransitionRight("archived", "active"), false);
  assert.equal(canTransitionRight("terminated", "active"), false);
});

test("same status transition allowed", () => {
  for (const s of Object.values(RIGHT_STATUS)) {
    assert.equal(canTransitionRight(s as any, s as any), true);
  }
});

test("archived is terminal", () => {
  assert.deepEqual(RIGHT_TRANSITIONS.archived, []);
});

test("platform rights events are registered", () => {
  assert.ok(isEventRegistered(RIGHT_EVENTS.CandidateCreated));
  assert.ok(isEventRegistered(RIGHT_EVENTS.ReviewCompleted));
  assert.ok(isEventRegistered(RIGHT_EVENTS.Created));
  assert.ok(isEventRegistered(RIGHT_EVENTS.Activated));
  assert.ok(isEventRegistered(RIGHT_EVENTS.Expired));
  assert.ok(isEventRegistered(RIGHT_EVENTS.Terminated));
  assert.ok(isEventRegistered(RIGHT_EVENTS.Restricted));
});

test("viewers cannot review or manage rights", () => {
  assert.equal(
    canReviewRights({ isSuperAdmin: false, role: "viewer" } as any),
    false
  );
  assert.equal(
    canManageRights({ isSuperAdmin: false, role: "viewer" } as any),
    false
  );
});

test("members can review; admins can manage", () => {
  assert.equal(
    canReviewRights({ isSuperAdmin: false, role: "member" } as any),
    true
  );
  assert.equal(
    canManageRights({ isSuperAdmin: false, role: "admin" } as any),
    true
  );
  assert.equal(
    canManageRights({ isSuperAdmin: true, role: "viewer" } as any),
    true
  );
});

test("happy path candidate → approved → active", () => {
  assert.ok(canTransitionRight("candidate", "pending_review"));
  assert.ok(canTransitionRight("pending_review", "approved"));
  assert.ok(canTransitionRight("approved", "active"));
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
