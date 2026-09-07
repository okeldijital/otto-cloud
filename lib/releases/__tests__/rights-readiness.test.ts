import assert from "node:assert/strict";
import { buildRightsReadiness } from "@/lib/releases/readiness";

function testRightsReadinessPolicy() {
  // Same-organization release-level evidence plus complete artist coverage.
  assert.equal(
    buildRightsReadiness({
      hasArtists: true,
      artistCoverage: true,
      releaseCoverage: true,
      trackCoverage: false,
    }),
    true
  );

  // Track-level evidence can satisfy release coverage when every track is covered.
  assert.equal(
    buildRightsReadiness({
      hasArtists: true,
      artistCoverage: true,
      releaseCoverage: false,
      trackCoverage: true,
    }),
    true
  );

  // Missing artist coverage blocks readiness even when a release contract exists.
  assert.equal(
    buildRightsReadiness({
      hasArtists: true,
      artistCoverage: false,
      releaseCoverage: true,
      trackCoverage: true,
    }),
    false
  );

  // Missing release/track coverage blocks readiness.
  assert.equal(
    buildRightsReadiness({
      hasArtists: true,
      artistCoverage: true,
      releaseCoverage: false,
      trackCoverage: false,
    }),
    false
  );

  // A release without an associated artist does not require artist coverage.
  assert.equal(
    buildRightsReadiness({
      hasArtists: false,
      artistCoverage: false,
      releaseCoverage: true,
      trackCoverage: false,
    }),
    true
  );

  // Unrelated/foreign evidence is represented by absent organization-scoped coverage.
  assert.equal(
    buildRightsReadiness({
      hasArtists: true,
      artistCoverage: false,
      releaseCoverage: false,
      trackCoverage: false,
    }),
    false
  );
}

testRightsReadinessPolicy();
console.log("RRM rights readiness regression tests passed.");
