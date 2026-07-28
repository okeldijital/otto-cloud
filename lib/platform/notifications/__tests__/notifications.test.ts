/**
 * Notification framework unit tests (Milestone 4.2).
 * Run: npm run test:notifications
 */
import assert from "node:assert/strict";
import {
  EVENT_TO_NOTIFICATION_TYPE,
  NOTIFICATION_DEFINITIONS,
  NOTIFICATION_STATUS,
  NOTIFICATION_TYPES,
} from "../types";
import { LEGACY_EVENT_MAP, resolvePlatformEventName } from "@/lib/platform/events";

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

console.log("\nNotification Framework (M4.2)\n");

test("notification types are data-driven string keys", () => {
  assert.equal(
    NOTIFICATION_TYPES.renewalDue,
    "contracts.lifecycle.renewal_due"
  );
  assert.equal(
    NOTIFICATION_TYPES.relationshipAdded,
    "contracts.relationship.created"
  );
  assert.ok(NOTIFICATION_DEFINITIONS[NOTIFICATION_TYPES.contractExpiring]);
});

test("event to notification mapping covers lifecycle and relationships", () => {
  assert.equal(
    EVENT_TO_NOTIFICATION_TYPE["contracts.lifecycle.activated"],
    NOTIFICATION_TYPES.contractActivated
  );
  assert.equal(
    EVENT_TO_NOTIFICATION_TYPE["contracts.relationship.rejected"],
    NOTIFICATION_TYPES.relationshipRejected
  );
  assert.equal(
    EVENT_TO_NOTIFICATION_TYPE["contracts.verification.completed"],
    NOTIFICATION_TYPES.verificationCompleted
  );
});

test("notification statuses support unread read archive dismiss", () => {
  assert.equal(NOTIFICATION_STATUS.unread, "unread");
  assert.equal(NOTIFICATION_STATUS.read, "read");
  assert.equal(NOTIFICATION_STATUS.archived, "archived");
  assert.equal(NOTIFICATION_STATUS.dismissed, "dismissed");
});

test("every mapped platform event is registered", () => {
  for (const eventName of Object.keys(EVENT_TO_NOTIFICATION_TYPE)) {
    // Must resolve (registered or known path)
    const resolved = resolvePlatformEventName(eventName);
    assert.equal(resolved, eventName);
  }
});

test("legacy contract events map into notification-capable platform names", () => {
  const platformName = resolvePlatformEventName("ContractRenewalDue");
  assert.equal(platformName, "contracts.lifecycle.renewal_due");
  assert.ok(EVENT_TO_NOTIFICATION_TYPE[platformName]);
  assert.ok(LEGACY_EVENT_MAP.ContractRenewalDue);
});

test("definitions include defaultEnabled for preferences", () => {
  for (const [type, def] of Object.entries(NOTIFICATION_DEFINITIONS)) {
    assert.equal(typeof def.defaultEnabled, "boolean", type);
    assert.ok(def.title, type);
  }
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
