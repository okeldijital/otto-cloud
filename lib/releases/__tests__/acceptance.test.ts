import assert from "node:assert/strict";
import { validateReleaseMetadata } from "@/lib/releases/validation";
import { isReleaseStatus, validateReleaseTransition } from "@/lib/releases/lifecycle";

function testLifecycleContract() {
  for (const status of ["draft", "ready", "scheduled", "released"]) {
    assert.equal(isReleaseStatus(status), true);
  }

  assert.equal(isReleaseStatus("invalid"), false);

  assert.equal(validateReleaseTransition("draft", "draft").ok, true);
  assert.equal(validateReleaseTransition("draft", "ready").ok, true);
  assert.equal(validateReleaseTransition("ready", "scheduled").ok, true);
  assert.equal(validateReleaseTransition("scheduled", "released").ok, true);
  assert.equal(validateReleaseTransition("released", "released").ok, true);

  assert.equal(validateReleaseTransition("draft", "scheduled").ok, false);
  assert.equal(validateReleaseTransition("ready", "released").ok, false);
  assert.equal(validateReleaseTransition("released", "draft").ok, false);
  assert.equal(validateReleaseTransition("invalid", "ready").ok, false);
}

function testMetadataContract() {
  const valid = validateReleaseMetadata(
    {
      title: "RRM Acceptance Release",
      release_type: "Single",
      catalog_number: "OD-2026-001",
      upc_code: "123456789012",
      release_date: "2026-09-01",
      artwork_url: "https://example.com/artwork.jpg",
      track_ids: [1],
    },
    "create"
  );
  assert.equal(valid.valid, true);

  const missingTitle = validateReleaseMetadata(
    {
      release_type: "Single",
      catalog_number: "OD-2026-002",
      upc_code: "123456789012",
    },
    "create"
  );
  assert.equal(missingTitle.valid, false);

  const invalidUpc = validateReleaseMetadata(
    {
      title: "Invalid UPC",
      release_type: "Single",
      catalog_number: "OD-2026-003",
      upc_code: "not-a-upc",
    },
    "create"
  );
  assert.equal(invalidUpc.valid, false);
}

testLifecycleContract();
testMetadataContract();
console.log("RRM-007 release API acceptance regression tests passed.");
