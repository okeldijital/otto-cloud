import assert from "node:assert/strict";
import {
  labelRelatedCatalogWhere,
  parsePositiveIntId,
} from "@/lib/catalog/label-scope";

assert.equal(parsePositiveIntId("12"), 12);
assert.equal(parsePositiveIntId(" 7 "), 7);
assert.equal(parsePositiveIntId("0"), null);
assert.equal(parsePositiveIntId("-3"), null);
assert.equal(parsePositiveIntId("12abc"), null);
assert.equal(parsePositiveIntId(""), null);
assert.equal(parsePositiveIntId(null), null);

const orgA = "11111111-1111-1111-1111-111111111111";
const orgB = "22222222-2222-2222-2222-222222222222";

assert.deepEqual(labelRelatedCatalogWhere("releases", 4, orgA), {
  label_id: 4,
  organization_id: orgA,
  is_deleted: false,
});
assert.deepEqual(labelRelatedCatalogWhere("artists", 4, orgB), {
  label_id: 4,
  organization_id: orgB,
  is_deleted: false,
});
assert.notEqual(
  labelRelatedCatalogWhere("releases", 4, orgA).organization_id,
  labelRelatedCatalogWhere("releases", 4, orgB).organization_id,
);

assert.throws(
  () => labelRelatedCatalogWhere("releases", 0, orgA),
  /positive integer/,
);
assert.throws(
  () => labelRelatedCatalogWhere("releases", 4, ""),
  /organizationId is required/,
);
assert.throws(
  () => labelRelatedCatalogWhere("tracks" as "artists", 4, orgA),
  /Unsupported Label catalog relation/,
);

console.log("Label scope contract tests passed.");
