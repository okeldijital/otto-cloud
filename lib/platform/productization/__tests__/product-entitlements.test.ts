import assert from "node:assert/strict";
import {
  PRODUCT_PLAN_KEYS,
  featureForPermission,
  requiredProductFeatures,
} from "@/lib/platform/productization";

assert.equal(PRODUCT_PLAN_KEYS.CORE, "OTTO_CORE");
assert.equal(featureForPermission("contracts.view"), "contracts.core");
assert.equal(featureForPermission("rights.review"), "rights");
assert.equal(featureForPermission("royalties.view"), "royalties");
assert.equal(featureForPermission("ai.chat"), "ai");
assert.equal(featureForPermission("platform.audit.view"), null);
assert.deepEqual(
  requiredProductFeatures(["contracts.view", "contracts.edit", "ai.chat"]),
  ["contracts.core", "ai"]
);

console.log("Commercial entitlement mapping tests passed");
