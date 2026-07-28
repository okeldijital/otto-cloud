/**
 * Platform Event Framework tests (Milestone 4.2).
 * Run: npm run test:platform-events
 */
import assert from "node:assert/strict";
import {
  isEventRegistered,
  listEventDefinitions,
  resolvePlatformEventName,
  LEGACY_EVENT_MAP,
  PLATFORM_EVENT_DEFINITIONS,
  requireEventDefinition,
} from "../registry";
import { PlatformEventError } from "../types";
import {
  registerSubscriber,
  unregisterSubscriber,
  matchSubscribers,
  clearSubscribers,
  listSubscribers,
} from "../subscribers/registry";
import {
  computeNextRetryAt,
  shouldRetry,
  DEFAULT_RETRY_POLICY,
} from "../retry/policy";
import {
  getInMemoryMetrics,
  incMetric,
  resetInMemoryMetrics,
  recordProcessingTime,
} from "../metrics";
import {
  canReplayPlatformEvents,
  canViewPlatformEvents,
} from "../permissions";

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

console.log("\nPlatform Event Framework (M4.2)\n");

// ── Registry ────────────────────────────────────────────────────────────────

test("event registry is non-empty and uses dotted names", () => {
  const defs = listEventDefinitions();
  assert.ok(defs.length >= 10);
  for (const d of defs) {
    assert.ok(d.name.includes("."), d.name);
    assert.ok(d.version);
    assert.ok(d.producer);
    assert.ok(d.contract?.fields, d.name);
  }
});

test("required contract lifecycle events are registered", () => {
  const required = [
    "contracts.lifecycle.activated",
    "contracts.lifecycle.expired",
    "contracts.lifecycle.renewal_due",
    "contracts.lifecycle.amended",
    "contracts.lifecycle.superseded",
    "contracts.relationship.created",
    "contracts.verification.completed",
    "contracts.verified.created",
  ];
  for (const name of required) {
    assert.ok(isEventRegistered(name), name);
    assert.equal(requireEventDefinition(name).name, name);
  }
});

test("unregistered event throws EVENT_NOT_REGISTERED", () => {
  assert.throws(
    () => requireEventDefinition("unknown.event.foo"),
    (e: any) => e instanceof PlatformEventError && e.code === "EVENT_NOT_REGISTERED"
  );
});

test("legacy PascalCase names map to platform names", () => {
  assert.equal(
    resolvePlatformEventName("ContractActivated"),
    "contracts.lifecycle.activated"
  );
  assert.equal(
    resolvePlatformEventName("RelationshipCreated"),
    "contracts.relationship.created"
  );
  assert.equal(
    resolvePlatformEventName("VerifiedContractCreated"),
    "contracts.verified.created"
  );
  assert.equal(
    resolvePlatformEventName("contracts.lifecycle.activated"),
    "contracts.lifecycle.activated"
  );
  assert.ok(LEGACY_EVENT_MAP.ContractAmended);
});

test("definitions declare consumers and idempotency", () => {
  const activated = requireEventDefinition("contracts.lifecycle.activated");
  assert.ok(activated.consumers.includes("notifications"));
  assert.equal(activated.idempotencyStrategy, "event_subscriber");
});

test("definitions include formal contracts (semver 1.0.0)", () => {
  const activated = requireEventDefinition("contracts.lifecycle.activated");
  assert.equal(activated.version, "1.0.0");
  assert.ok(activated.contract);
  assert.ok(activated.contract.fields.contractId);
  assert.equal(activated.contract.fields.contractId.required, true);
});

// ── Subscribers ─────────────────────────────────────────────────────────────

test("subscriber registry matches exact and wildcard patterns", () => {
  clearSubscribers();
  registerSubscriber({
    id: "test.exact",
    events: ["contracts.lifecycle.activated"],
    handler: async () => {},
  });
  registerSubscriber({
    id: "test.wild",
    events: ["contracts.lifecycle.*"],
    handler: async () => {},
  });
  registerSubscriber({
    id: "test.other",
    events: ["releases.*"],
    handler: async () => {},
  });

  const matched = matchSubscribers("contracts.lifecycle.activated");
  assert.equal(matched.length, 2);
  assert.ok(matched.some((s) => s.id === "test.exact"));
  assert.ok(matched.some((s) => s.id === "test.wild"));

  assert.equal(matchSubscribers("releases.created").length, 1);
  assert.equal(matchSubscribers("rights.assigned").length, 0);

  unregisterSubscriber("test.exact");
  assert.equal(matchSubscribers("contracts.lifecycle.activated").length, 1);
  clearSubscribers();
  assert.equal(listSubscribers().length, 0);
});

test("subscribers never share mutable event registry state", () => {
  clearSubscribers();
  const listBefore = listEventDefinitions().length;
  registerSubscriber({
    id: "noop",
    events: ["*"],
    handler: async () => {},
  });
  assert.equal(listEventDefinitions().length, listBefore);
  clearSubscribers();
});

// ── Retry ───────────────────────────────────────────────────────────────────

test("retry policy uses exponential backoff after first attempt", () => {
  const t0 = computeNextRetryAt(1, {
    ...DEFAULT_RETRY_POLICY,
    immediateFirstRetry: true,
  });
  assert.ok(t0.getTime() <= Date.now() + 50);

  const t2 = computeNextRetryAt(3, {
    maxRetries: 5,
    baseDelayMs: 1000,
    maxDelayMs: 60_000,
    immediateFirstRetry: true,
  });
  // attempt 3 → exp 2 → ~4s with jitter
  const delta = t2.getTime() - Date.now();
  assert.ok(delta >= 1000, `expected delay, got ${delta}`);
  assert.ok(delta <= 10_000, `delay too large ${delta}`);
});

test("shouldRetry respects max retries", () => {
  assert.equal(shouldRetry(1, 5), true);
  assert.equal(shouldRetry(4, 5), true);
  assert.equal(shouldRetry(5, 5), false);
  assert.equal(shouldRetry(6, 5), false);
});

// ── Metrics ─────────────────────────────────────────────────────────────────

test("in-memory metrics increment", () => {
  resetInMemoryMetrics();
  incMetric("published", 2);
  incMetric("delivered");
  incMetric("dead_letter");
  recordProcessingTime(100);
  recordProcessingTime(50);
  const m = getInMemoryMetrics();
  assert.equal(m.eventsPublished, 2);
  assert.equal(m.eventsDelivered, 1);
  assert.equal(m.deadLetterCount, 1);
  assert.ok(m.avgProcessingTimeMs === 75);
  resetInMemoryMetrics();
});

// ── Permissions ─────────────────────────────────────────────────────────────

test("viewers can view events but not replay", () => {
  const viewer = {
    isSuperAdmin: false,
    role: "viewer",
    organizationId: "org",
  } as any;
  assert.equal(canViewPlatformEvents(viewer), true);
  assert.equal(canReplayPlatformEvents(viewer), false);
});

test("admins and super-admins can replay", () => {
  assert.equal(
    canReplayPlatformEvents({ isSuperAdmin: false, role: "admin" } as any),
    true
  );
  assert.equal(
    canReplayPlatformEvents({ isSuperAdmin: true, role: "viewer" } as any),
    true
  );
  assert.equal(
    canReplayPlatformEvents({ isSuperAdmin: false, role: "member" } as any),
    false
  );
});

// ── Naming convention ───────────────────────────────────────────────────────

test("no module-specific enums — string identifiers only", () => {
  for (const d of PLATFORM_EVENT_DEFINITIONS) {
    assert.equal(typeof d.name, "string");
    assert.ok(!d.name.includes(" "));
  }
});

console.log(`\n${passed} passed, ${failed} failed\n`);
if (failed > 0) process.exit(1);
