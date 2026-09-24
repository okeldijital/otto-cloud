import assert from "node:assert/strict";
import { orderReleaseTracks } from "@/lib/releases/track-order";

const tracks = [{ id: 10 }, { id: 20 }, { id: 30 }, { id: 40 }];
const positions = new Map<number, number | null>([[10, 2], [20, 0], [30, 3], [40, 1]]);
assert.deepEqual(orderReleaseTracks(tracks, positions).map((track) => track.id), [20, 40, 10, 30]);

const missingPosition = new Map<number, number | null>([[10, 1], [20, null], [30, 0], [40, undefined]]);
assert.deepEqual(orderReleaseTracks(tracks, missingPosition).map((track) => track.id), [30, 10, 20, 40]);

console.log("Release track ordering tests passed.");
