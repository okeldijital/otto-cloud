/**
 * Event contract / schema validation tests (Milestone 4.2A).
 * Run: npm run test:event-contracts
 */
import assert from "node:assert/strict";
import {
  assertValidPayload,
  validatePayload,
  contractToJsonSchema,
  buildEventEnvelope,
  EventSchemaError,
} from "../contracts/schema";
import {
  requireEventDefinition,
  listEventDefinitions,
  resolvePlatformEventName,
} from "../registry";
import { EventDispatcher } from "../dispatcher";
import { clearSubscribers } from "../subscribers/registry";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  const run = Promise.resolve().then(fn);
  return run
    .then(() => {
      passed++;
      console.log(`  ✓ ${name}`);
    })
    .catch((e: any) => {
      failed++;
      console.error(`  ✗ ${name}: ${e.message}`);
    });
}

async function main() {
  console.log("\nEvent Contracts & Schema Validation (M4.2A)\n");

  await test("every registered event has a formal payload contract", () => {
    for (const def of listEventDefinitions()) {
      assert.ok(def.contract, def.name);
      assert.ok(def.contract.version, def.name);
      assert.ok(def.contract.fields, def.name);
      assert.equal(def.version, def.contract.version, def.name);
      assert.match(def.version, /^\d+\.\d+\.\d+$/, def.name);
    }
  });

  await test("activated payload requires contractId + organizationId", () => {
    const def = requireEventDefinition("contracts.lifecycle.activated");
    const org = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

    const bad = validatePayload({}, def.contract, {
      organizationId: org,
      eventName: def.name,
    });
    // organizationId is injected; contractId still missing
    assert.equal(bad.valid, false);
    assert.ok(bad.errors.some((e) => e.includes("contractId")));

    const good = validatePayload(
      { contractId: 42 },
      def.contract,
      {
        organizationId: org,
        eventName: def.name,
        defaults: { activatedAt: new Date().toISOString() },
      }
    );
    assert.equal(good.valid, true, good.errors.join("; "));
    assert.equal(good.payload.organizationId, org);
    assert.equal(good.payload.contractId, 42);
    assert.ok(good.payload.activatedAt);
  });

  await test("wrong types are rejected", () => {
    const def = requireEventDefinition("contracts.lifecycle.status_changed");
    const org = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const result = validatePayload(
      { contractId: "not-a-number", from: "active", to: "expired" },
      def.contract,
      { organizationId: org, eventName: def.name }
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("contractId")));
  });

  await test("additional properties allowed by default (forward-compat)", () => {
    const def = requireEventDefinition("contracts.lifecycle.activated");
    const org = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const result = validatePayload(
      {
        contractId: 1,
        activatedAt: new Date().toISOString(),
        futureField: "ok",
        legacyEventType: "ContractActivated",
      },
      def.contract,
      { organizationId: org, eventName: def.name }
    );
    assert.equal(result.valid, true, result.errors.join("; "));
    assert.equal(result.payload.futureField, "ok");
  });

  await test("strict contracts reject unknown fields", () => {
    const def = requireEventDefinition("contracts.lifecycle.activated");
    const strict = {
      ...def.contract,
      additionalProperties: false,
      fields: {
        organizationId: def.contract.fields.organizationId,
        contractId: def.contract.fields.contractId,
      },
    };
    const org = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const result = validatePayload(
      { contractId: 1, extra: true },
      strict,
      { organizationId: org, eventName: def.name }
    );
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("extra")));
  });

  await test("assertValidPayload throws EventSchemaError", () => {
    const def = requireEventDefinition("contracts.relationship.created");
    const org = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    assert.throws(
      () =>
        assertValidPayload(
          { contractId: 1 }, // missing relationshipId
          def.contract,
          { organizationId: org, eventName: def.name }
        ),
      (e: any) => e instanceof EventSchemaError && e.code === "EVENT_SCHEMA_INVALID"
    );
  });

  await test("nullable contractId allowed on verification.completed", () => {
    const def = requireEventDefinition("contracts.verification.completed");
    const org = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const result = validatePayload(
      { contractId: null, documentId: "doc-1" },
      def.contract,
      { organizationId: org, eventName: def.name }
    );
    assert.equal(result.valid, true, result.errors.join("; "));
  });

  await test("uuid validation for organizationId", () => {
    const def = requireEventDefinition("contracts.lifecycle.activated");
    const result = validatePayload(
      { organizationId: "not-uuid", contractId: 1 },
      def.contract,
      {
        organizationId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
        eventName: def.name,
      }
    );
    // organizationId already set to invalid — inject won't overwrite
    assert.equal(result.valid, false);
    assert.ok(result.errors.some((e) => e.includes("organizationId")));
  });

  await test("contractToJsonSchema exports JSON Schema view", () => {
    const def = requireEventDefinition("contracts.lifecycle.activated");
    const schema = contractToJsonSchema(def.contract) as any;
    assert.equal(schema.type, "object");
    assert.ok(schema.properties.contractId);
    assert.ok(schema.required.includes("contractId"));
    assert.equal(schema["x-contract-version"], "1.0.0");
  });

  await test("buildEventEnvelope matches consumer shape", () => {
    const env = buildEventEnvelope({
      event: "contracts.lifecycle.activated",
      version: "1.0.0",
      organizationId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
      payload: {
        contractId: 9,
        organizationId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
        activatedAt: "2026-07-28T00:00:00.000Z",
      },
    });
    assert.equal(env.event, "contracts.lifecycle.activated");
    assert.equal(env.version, "1.0.0");
    assert.equal(env.payload.contractId, 9);
  });

  await test("legacy names resolve to versioned contracts", () => {
    const name = resolvePlatformEventName("ContractActivated");
    const def = requireEventDefinition(name);
    assert.equal(def.version, "1.0.0");
    assert.ok(def.contract.fields.contractId.required);
  });

  await test("dispatcher publish rejects invalid payload before DB", async () => {
    clearSubscribers();
    const dispatcher = new EventDispatcher();
    // Will fail validation before prisma — no need for DB if validation throws first
    let threw = false;
    try {
      await dispatcher.publish({
        eventName: "contracts.lifecycle.activated",
        organizationId: "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee",
        payload: {}, // missing contractId
      });
    } catch (e: any) {
      threw = true;
      assert.equal(e.code, "EVENT_SCHEMA_INVALID");
      assert.ok(Array.isArray(e.details));
    }
    assert.ok(threw, "expected schema validation error");
  });

  await test("amended requires amendmentId", () => {
    const def = requireEventDefinition("contracts.lifecycle.amended");
    const org = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const missing = validatePayload(
      { contractId: 1 },
      def.contract,
      { organizationId: org, eventName: def.name }
    );
    assert.equal(missing.valid, false);

    const ok = validatePayload(
      { contractId: 1, amendmentId: "amd-1", amendmentNumber: "1" },
      def.contract,
      { organizationId: org, eventName: def.name }
    );
    assert.equal(ok.valid, true, ok.errors.join("; "));
  });

  await test("identity.login.failed accepts platform system org UUID", () => {
    const def = requireEventDefinition("identity.login.failed");
    // PLATFORM_SYSTEM_ORGANIZATION_ID — valid v4; nil UUID must fail
    const systemOrg = "00000000-0000-4000-8000-000000000000";
    const ok = validatePayload(
      { reason: "unknown_identity", email: "x@example.com" },
      def.contract,
      { organizationId: systemOrg, eventName: def.name }
    );
    assert.equal(ok.valid, true, ok.errors.join("; "));
    assert.equal(ok.payload.organizationId, systemOrg);
  });

  await test("identity.login.failed rejects nil UUID organizationId", () => {
    const def = requireEventDefinition("identity.login.failed");
    const nil = "00000000-0000-0000-0000-000000000000";
    const bad = validatePayload(
      { organizationId: nil, reason: "invalid_credentials" },
      def.contract,
      { organizationId: nil, eventName: def.name }
    );
    assert.equal(bad.valid, false);
    assert.ok(bad.errors.some((e) => e.includes("organizationId")));
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main();
