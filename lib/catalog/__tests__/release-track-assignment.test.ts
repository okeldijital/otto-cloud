import assert from "node:assert/strict";
import { validatePrimaryTrackAssignments } from "@/lib/catalog-release-relations";

const tracks = [
  { id: 1, release_id: null },
  { id: 2, release_id: 10 },
  { id: 3, release_id: 20 },
];

assert.deepEqual(validatePrimaryTrackAssignments(tracks, 10, []), {
  assignable: [1],
  alreadyAssigned: [2],
  requiresMove: [3],
});

assert.deepEqual(validatePrimaryTrackAssignments(tracks, 10, [3]), {
  assignable: [1, 3],
  alreadyAssigned: [2],
  requiresMove: [],
});

assert.throws(
  () => validatePrimaryTrackAssignments(tracks, 10, [2]),
  /move_track_ids must only contain tracks being moved from another Primary Release/,
);

assert.throws(
  () => validatePrimaryTrackAssignments(tracks, 10, [1]),
  /move_track_ids must only contain tracks being moved from another Primary Release/,
);

assert.throws(
  () => validatePrimaryTrackAssignments(tracks, 10, [99]),
  /move_track_ids contains a track that is not part of the assignment set/,
);

console.log("Release-side primary track assignment contract tests passed.");
