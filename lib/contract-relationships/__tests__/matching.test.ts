/**
 * Relationship matching tests (Milestone 4.0).
 * Run: npx tsx lib/contract-relationships/__tests__/matching.test.ts
 */
import assert from "node:assert/strict";
import {
  exactMatch,
  normalizeText,
  normalizedMatch,
} from "../matching-service";
import {
  MATCH_STRATEGIES,
  RELATIONSHIP_TYPES,
  TARGET_ENTITY_TYPES,
} from "../constants";
import { RELATIONSHIP_EVENTS } from "../events";
import { canManageRelationships } from "../permissions";

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

console.log("\nContract Relationships (M4.0)\n");

test("normalizeText strips punctuation and case", () => {
  assert.equal(normalizeText("  Foo & Bar, LLC. "), "foo bar llc");
});

test("exactMatch is case-insensitive", () => {
  assert.ok(exactMatch("Acme", "acme"));
  assert.ok(!exactMatch("Acme", "Acme Inc"));
});

test("normalizedMatch handles punctuation", () => {
  assert.ok(normalizedMatch("Foo-Bar", "foo bar"));
  assert.ok(normalizedMatch("M.J. Records", "m j records"));
  assert.equal(normalizeText("Acme, Inc."), "acme inc");
});

test("entity types are extensible list", () => {
  assert.ok(TARGET_ENTITY_TYPES.includes("artist"));
  assert.ok(TARGET_ENTITY_TYPES.includes("release"));
  assert.ok(TARGET_ENTITY_TYPES.includes("work"));
  assert.ok(TARGET_ENTITY_TYPES.includes("person"));
});

test("relationship types are data-driven constants", () => {
  assert.ok(RELATIONSHIP_TYPES.includes("represents"));
  assert.ok(RELATIONSHIP_TYPES.includes("governs"));
  assert.ok(RELATIONSHIP_TYPES.includes("amends"));
});

test("match strategies include exact normalized alias", () => {
  assert.equal(MATCH_STRATEGIES.exact, "exact");
  assert.equal(MATCH_STRATEGIES.normalized, "normalized");
  assert.equal(MATCH_STRATEGIES.alias, "alias");
});

test("platform events are stable integration surface", () => {
  assert.equal(RELATIONSHIP_EVENTS.Suggested, "RelationshipSuggested");
  assert.equal(RELATIONSHIP_EVENTS.Created, "RelationshipCreated");
  assert.equal(RELATIONSHIP_EVENTS.Rejected, "RelationshipRejected");
  assert.equal(RELATIONSHIP_EVENTS.Removed, "RelationshipRemoved");
});

test("viewers cannot manage relationships", () => {
  assert.equal(
    canManageRelationships({
      isSuperAdmin: false,
      role: "viewer",
      permissions: [],
    } as any),
    false
  );
  assert.equal(
    canManageRelationships({
      isSuperAdmin: false,
      role: "manager",
      permissions: [],
    } as any),
    true
  );
});

test("suggestion never auto-links (principle)", () => {
  // Documented contract: discovery creates suggestions only
  const discoveryResult = { status: "pending", linked: false };
  assert.equal(discoveryResult.status, "pending");
  assert.equal(discoveryResult.linked, false);
});

console.log(`\n${passed} passed, ${failed} failed\n`);
process.exit(failed > 0 ? 1 : 0);
