/**
 * Platform Projection Framework tests.
 * Run: npm run test:projections
 */
import assert from "node:assert/strict";
import {
  registerProjection,
  unregisterProjection,
  listProjections,
  clearProjections,
  requireProjection,
  matchEventPattern,
  matchProjectionsForEvent,
  ProjectionError,
  resetProjectionMetrics,
  getProjectionMetrics,
  incProjectionMetric,
  type ProjectionDefinition,
  type ProjectionKey,
} from "../index";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed++;
      console.log(`  ✓ ${name}`);
    })
    .catch((e: any) => {
      failed++;
      console.error(`  ✗ ${name}: ${e.message}`);
    });
}

function mockDef(
  partial: Partial<ProjectionDefinition> & { name: string }
): ProjectionDefinition {
  return {
    version: "1.0.0",
    owner: "test",
    description: "test",
    events: ["contracts.lifecycle.*"],
    resolveKeys: () => [{ key: "release:1", parts: { releaseId: 1 } }],
    project: async () => {},
    ...partial,
  };
}

async function main() {
  console.log("\nPlatform Projections\n");

  await test("register and list projections", () => {
    clearProjections();
    registerProjection(mockDef({ name: "test.a" }));
    registerProjection(mockDef({ name: "test.b", events: ["releases.*"] }));
    assert.equal(listProjections().length, 2);
    assert.equal(requireProjection("test.a").name, "test.a");
    clearProjections();
  });

  await test("requireProjection throws when missing", () => {
    clearProjections();
    assert.throws(
      () => requireProjection("missing"),
      (e: any) => e instanceof ProjectionError && e.code === "PROJECTION_NOT_FOUND"
    );
  });

  await test("registration requires resolveKeys and project", () => {
    clearProjections();
    assert.throws(
      () =>
        registerProjection({
          name: "bad",
          version: "1",
          owner: "t",
          description: "",
          events: ["x"],
          resolveKeys: null as any,
          project: async () => {},
        }),
      (e: any) => e.code === "HANDLERS_REQUIRED"
    );
  });

  await test("event pattern matching", () => {
    assert.ok(matchEventPattern("contracts.lifecycle.*", "contracts.lifecycle.activated"));
    assert.ok(matchEventPattern("contracts.lifecycle.activated", "contracts.lifecycle.activated"));
    assert.ok(!matchEventPattern("contracts.lifecycle.*", "contracts.relationship.created"));
    assert.ok(matchEventPattern("*", "anything"));
  });

  await test("matchProjectionsForEvent selects correct defs", () => {
    clearProjections();
    registerProjection(
      mockDef({ name: "lc", events: ["contracts.lifecycle.*"] })
    );
    registerProjection(
      mockDef({ name: "rel", events: ["contracts.relationship.*"] })
    );
    const m = matchProjectionsForEvent("contracts.lifecycle.expired");
    assert.equal(m.length, 1);
    assert.equal(m[0].name, "lc");
    clearProjections();
  });

  await test("unregister projection", () => {
    clearProjections();
    registerProjection(mockDef({ name: "tmp" }));
    assert.ok(unregisterProjection("tmp"));
    assert.equal(listProjections().length, 0);
  });

  await test("metrics increment", () => {
    resetProjectionMetrics();
    incProjectionMetric("events_applied", 2);
    incProjectionMetric("keys_projected", 5);
    const m = getProjectionMetrics();
    assert.equal(m.eventsApplied, 2);
    assert.equal(m.keysProjected, 5);
    resetProjectionMetrics();
  });

  await test("module only implements definition shape (key + project)", async () => {
    clearProjections();
    const projected: string[] = [];
    registerProjection(
      mockDef({
        name: "demo",
        resolveKeys: () => [{ key: "k1" } as ProjectionKey],
        project: async (key) => {
          projected.push(key.key);
        },
      })
    );
    const def = requireProjection("demo");
    const keys = await def.resolveKeys({
      id: "e1",
      eventName: "contracts.lifecycle.activated",
      version: "1.0.0",
      producer: "test",
      organizationId: "org",
      payload: {},
      metadata: null,
      occurredAt: new Date(),
      publishedAt: new Date(),
      status: "delivered",
      retryCount: 0,
      correlationId: null,
      causationId: null,
      parentEventId: null,
      processingHistory: [],
      actorUserId: null,
      entityType: null,
      entityId: null,
    });
    for (const k of keys) {
      await def.project(k, {
        organizationId: "org",
        mode: "event",
      });
    }
    assert.deepEqual(projected, ["k1"]);
    clearProjections();
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main();
