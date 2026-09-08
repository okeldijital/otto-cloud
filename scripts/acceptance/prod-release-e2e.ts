import assert from "node:assert/strict";

const baseUrl = process.env.OTTO_BASE_URL || "https://otto.okeldijital.africa";
const sessionCookie = process.env.OTTO_RELEASE_SESSION_COOKIE;
const trackId = Number(process.env.OTTO_RELEASE_TRACK_ID);
const contractId = Number(process.env.OTTO_RELEASE_CONTRACT_ID || "21");

if (!sessionCookie) throw new Error("OTTO_RELEASE_SESSION_COOKIE is required");
if (!Number.isInteger(trackId) || trackId <= 0) throw new Error("OTTO_RELEASE_TRACK_ID must be a positive integer");
if (!Number.isInteger(contractId) || contractId <= 0) throw new Error("OTTO_RELEASE_CONTRACT_ID must be a positive integer");

const headers = {
  Cookie: sessionCookie,
  Accept: "application/json",
  "Content-Type": "application/json",
};

async function request(path: string, init: RequestInit = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { ...headers, ...(init.headers || {}) },
  });
  const text = await response.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { response, body };
}

function expectStatus(actual: number, expected: number, label: string, body: unknown) {
  assert.equal(actual, expected, `${label}: expected HTTP ${expected}, received ${actual}: ${JSON.stringify(body)}`);
}

async function uploadArtwork(releaseId: number) {
  // Minimal valid PNG; the production upload endpoint creates the real attachment.
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64"
  );
  const form = new FormData();
  form.append("file", new Blob([png], { type: "image/png" }), "otto-e2e-artwork.png");
  form.append("entityType", "release");
  form.append("entityId", String(releaseId));
  form.append("folder", "releases");

  const response = await fetch(`${baseUrl}/api/storage/upload`, {
    method: "POST",
    headers: { Cookie: sessionCookie!, Accept: "application/json" },
    body: form,
  });
  const text = await response.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  expectStatus(response.status, 201, "release artwork upload", body);
  assert.equal(body?.attachment?.entityId, String(releaseId));
}

async function main() {
  // Confirm the controlled track is visible to the authenticated organization and is not already assigned.
  const trackRead = await request(`/api/tracks?id=${trackId}`);
  expectStatus(trackRead.response.status, 200, "controlled track lookup", trackRead.body);
  assert.equal(trackRead.body?.release_id ?? null, null, "controlled track must not already belong to a primary release");

  const unique = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const payload = {
    title: `OTTO E2E — Release ${unique}`,
    release_type: "Single",
    release_date: "2026-09-30",
    catalog_number: `E2E-${unique}`,
  };

  // 1. Create the release in Draft.
  const created = await request("/api/releases", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  expectStatus(created.response.status, 201, "release creation", created.body);
  const releaseId = Number(created.body?.id);
  assert.ok(Number.isInteger(releaseId) && releaseId > 0, "release creation must return an id");
  assert.equal(created.body?.status, "draft");

  // 2. Persist track assignment through the real release mutation boundary.
  const assigned = await request(`/api/releases?id=${releaseId}`, {
    method: "PUT",
    body: JSON.stringify({ track_ids: [trackId] }),
  });
  expectStatus(assigned.response.status, 200, "track assignment", assigned.body);

  // 3. Persist artwork through the same Storage Service used by the release UI.
  await uploadArtwork(releaseId);

  // 4. Link the already verified contract to the release through the governed release-contract endpoint.
  const linked = await request(`/api/releases/${releaseId}/contracts`, {
    method: "POST",
    body: JSON.stringify({
      contractId,
      relationshipType: "applies_to",
      reason: "Controlled RRM production E2E release acceptance",
    }),
  });
  expectStatus(linked.response.status, 201, "release contract linkage", linked.body);

  // 5. Readiness must now recognize metadata, track, Storage Service artwork and verified rights evidence.
  const readiness = await request(`/api/releases/readiness?id=${releaseId}`);
  expectStatus(readiness.response.status, 200, "release readiness", readiness.body);
  assert.equal(readiness.body?.ready, true, `release should be ready: ${JSON.stringify(readiness.body)}`);
  assert.deepEqual(readiness.body?.checks, {
    metadata: true,
    trackList: true,
    artwork: true,
    releaseDate: true,
    rights: true,
  });

  // 6. Lifecycle: draft -> ready -> scheduled -> released.
  for (const status of ["ready", "scheduled", "released"] as const) {
    const transitioned = await request(`/api/releases?id=${releaseId}`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
    expectStatus(transitioned.response.status, 200, `release transition to ${status}`, transitioned.body);
    assert.equal(transitioned.body?.status, status);
  }

  // 7. Invalid transition must be rejected after the release is released.
  const invalid = await request(`/api/releases?id=${releaseId}`, {
    method: "PUT",
    body: JSON.stringify({ status: "draft" }),
  });
  expectStatus(invalid.response.status, 400, "invalid released -> draft transition", invalid.body);

  // 8. Reload from the authoritative release API and confirm persistence.
  const reloaded = await request(`/api/releases?id=${releaseId}`);
  expectStatus(reloaded.response.status, 200, "release reload", reloaded.body);
  assert.equal(reloaded.body?.id, releaseId);
  assert.equal(reloaded.body?.status, "released");
  assert.ok(Array.isArray(reloaded.body?._tracks));
  assert.equal(reloaded.body._tracks.some((track: any) => track.id === trackId), true);

  console.log(JSON.stringify({
    status: "PASS",
    releaseId,
    title: payload.title,
    trackId,
    contractId,
    lifecycle: ["draft", "ready", "scheduled", "released"],
    readiness: readiness.body,
    invalidTransitionRejected: true,
    persistedAfterReload: true,
  }, null, 2));
}

main().catch((error) => {
  console.error("RRM production release E2E FAILED");
  console.error(error);
  process.exit(1);
});
