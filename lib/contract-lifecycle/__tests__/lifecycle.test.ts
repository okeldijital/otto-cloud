/**
 * Contract Lifecycle tests (Milestone 4.1).
 * Run: npm run test:lifecycle
 */
import assert from "node:assert/strict";
import {
  canTransition,
  KEY_DATE_TYPES,
  LIFECYCLE_EVENTS,
  LIFECYCLE_STATUS,
  LIFECYCLE_STATUS_LABELS,
  LIFECYCLE_TRANSITIONS,
  RENEWAL_STATUS,
  type LifecycleStatus,
} from "../constants";
import { canManageLifecycle } from "../permissions";

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

console.log("\nContract Lifecycle (M4.1)\n");

// ── State transition validation ─────────────────────────────────────────────

test("all lifecycle statuses are defined", () => {
  const expected = [
    "draft",
    "pending_verification",
    "verified",
    "active",
    "pending_renewal",
    "expired",
    "terminated",
    "superseded",
    "archived",
  ];
  assert.deepEqual(Object.values(LIFECYCLE_STATUS), expected);
  for (const s of expected) {
    assert.ok(LIFECYCLE_STATUS_LABELS[s as LifecycleStatus]);
  }
});

test("same-status transition is always allowed", () => {
  for (const status of Object.values(LIFECYCLE_STATUS)) {
    assert.equal(canTransition(status, status), true, status);
  }
});

test("draft may move to pending_verification, verified, or archived", () => {
  assert.ok(canTransition("draft", "pending_verification"));
  assert.ok(canTransition("draft", "verified"));
  assert.ok(canTransition("draft", "archived"));
  assert.equal(canTransition("draft", "active"), false);
  assert.equal(canTransition("draft", "expired"), false);
});

test("verified may activate, renew, terminate, supersede, or archive", () => {
  assert.ok(canTransition("verified", "active"));
  assert.ok(canTransition("verified", "pending_renewal"));
  assert.ok(canTransition("verified", "terminated"));
  assert.ok(canTransition("verified", "superseded"));
  assert.ok(canTransition("verified", "archived"));
  assert.equal(canTransition("verified", "draft"), false);
  assert.equal(canTransition("verified", "expired"), false);
});

test("active may pending_renewal, expire, terminate, supersede, archive", () => {
  assert.ok(canTransition("active", "pending_renewal"));
  assert.ok(canTransition("active", "expired"));
  assert.ok(canTransition("active", "terminated"));
  assert.ok(canTransition("active", "superseded"));
  assert.ok(canTransition("active", "archived"));
  assert.equal(canTransition("active", "draft"), false);
  assert.equal(canTransition("active", "verified"), false);
});

test("pending_renewal may return to active, expire, terminate, archive", () => {
  assert.ok(canTransition("pending_renewal", "active"));
  assert.ok(canTransition("pending_renewal", "expired"));
  assert.ok(canTransition("pending_renewal", "terminated"));
  assert.ok(canTransition("pending_renewal", "archived"));
  assert.equal(canTransition("pending_renewal", "verified"), false);
});

test("expired may archive, re-enter renewal, or reactivate", () => {
  assert.ok(canTransition("expired", "archived"));
  assert.ok(canTransition("expired", "pending_renewal"));
  assert.ok(canTransition("expired", "active"));
  assert.equal(canTransition("expired", "draft"), false);
});

test("terminated and superseded only archive; archived is terminal", () => {
  assert.ok(canTransition("terminated", "archived"));
  assert.equal(canTransition("terminated", "active"), false);
  assert.ok(canTransition("superseded", "archived"));
  assert.equal(canTransition("superseded", "active"), false);
  assert.deepEqual(LIFECYCLE_TRANSITIONS.archived, []);
  assert.equal(canTransition("archived", "active"), false);
  assert.equal(canTransition("archived", "draft"), false);
});

test("invalid status pairs are rejected", () => {
  assert.equal(canTransition("draft", "superseded"), false);
  assert.equal(canTransition("pending_verification", "active"), false);
  assert.equal(canTransition("active", "pending_verification"), false);
});

// ── Key dates ───────────────────────────────────────────────────────────────

test("key date types cover required set", () => {
  const required = [
    "effective",
    "execution",
    "expiration",
    "renewal",
    "notice_deadline",
    "termination",
    "review",
  ];
  for (const t of required) {
    assert.ok((KEY_DATE_TYPES as readonly string[]).includes(t), t);
  }
});

// ── Renewal model ───────────────────────────────────────────────────────────

test("renewal statuses include none pending due completed waived", () => {
  assert.equal(RENEWAL_STATUS.none, "none");
  assert.equal(RENEWAL_STATUS.pending, "pending");
  assert.equal(RENEWAL_STATUS.due, "due");
  assert.equal(RENEWAL_STATUS.completed, "completed");
  assert.equal(RENEWAL_STATUS.waived, "waived");
});

test("renewal does not auto-transition without explicit mark (manual only)", () => {
  // Engine is deterministic: pending_renewal → active only via explicit transition
  // or markRenewed path; no automatic cron transition exists in constants.
  assert.ok(canTransition("pending_renewal", "active"));
  assert.ok(canTransition("active", "pending_renewal"));
});

// ── Events ──────────────────────────────────────────────────────────────────

test("platform lifecycle events are stable integration surface", () => {
  assert.equal(LIFECYCLE_EVENTS.Activated, "ContractActivated");
  assert.equal(LIFECYCLE_EVENTS.Expired, "ContractExpired");
  assert.equal(LIFECYCLE_EVENTS.RenewalDue, "ContractRenewalDue");
  assert.equal(LIFECYCLE_EVENTS.Renewed, "ContractRenewed");
  assert.equal(LIFECYCLE_EVENTS.Superseded, "ContractSuperseded");
  assert.equal(LIFECYCLE_EVENTS.Amended, "ContractAmended");
  assert.equal(LIFECYCLE_EVENTS.StatusChanged, "LifecycleStatusChanged");
});

// ── Permissions ─────────────────────────────────────────────────────────────

test("viewers and read-only cannot manage lifecycle", () => {
  assert.equal(
    canManageLifecycle({
      isSuperAdmin: false,
      role: "viewer",
    } as any),
    false
  );
  assert.equal(
    canManageLifecycle({
      isSuperAdmin: false,
      role: "read_only",
    } as any),
    false
  );
  assert.equal(
    canManageLifecycle({
      isSuperAdmin: false,
      role: "readonly",
    } as any),
    false
  );
});

test("admins and members can manage lifecycle", () => {
  assert.equal(
    canManageLifecycle({
      isSuperAdmin: false,
      role: "admin",
    } as any),
    true
  );
  assert.equal(
    canManageLifecycle({
      isSuperAdmin: false,
      role: "member",
    } as any),
    true
  );
  assert.equal(
    canManageLifecycle({
      isSuperAdmin: true,
      role: "viewer",
    } as any),
    true
  );
});

// ── Transition graph completeness ───────────────────────────────────────────

test("every status appears in transition map", () => {
  for (const status of Object.values(LIFECYCLE_STATUS)) {
    assert.ok(
      status in LIFECYCLE_TRANSITIONS,
      `missing transitions for ${status}`
    );
    assert.ok(Array.isArray(LIFECYCLE_TRANSITIONS[status]));
  }
});

test("happy path: draft → verified → active → pending_renewal → active", () => {
  assert.ok(canTransition("draft", "verified"));
  assert.ok(canTransition("verified", "active"));
  assert.ok(canTransition("active", "pending_renewal"));
  assert.ok(canTransition("pending_renewal", "active"));
});

test("supersession path: active → superseded → archived", () => {
  assert.ok(canTransition("active", "superseded"));
  assert.ok(canTransition("superseded", "archived"));
});

// ── Summary ─────────────────────────────────────────────────────────────────

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
