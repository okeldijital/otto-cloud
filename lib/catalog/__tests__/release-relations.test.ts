import assert from "node:assert/strict";
import { normalizeSecondaryReleaseIds } from "@/lib/catalog-release-relations";

function expectValidationError(fn: () => unknown, message: string) {
  assert.throws(fn, (error: unknown) => {
    assert.equal((error as Error).message, message);
    return true;
  });
}

assert.deepEqual(normalizeSecondaryReleaseIds([12, 12, 13], 11), [12, 13]);
assert.deepEqual(normalizeSecondaryReleaseIds([], 11), []);

expectValidationError(
  () => normalizeSecondaryReleaseIds([11, 12], 11),
  "The primary release cannot also be a secondary release",
);
expectValidationError(
  () => normalizeSecondaryReleaseIds([12, 0], 11),
  "secondary_release_ids must contain positive integer release IDs",
);
expectValidationError(
  () => normalizeSecondaryReleaseIds("12" as unknown, 11),
  "secondary_release_ids must be an array of release IDs",
);

console.log("Catalog release relationship contract tests passed.");
