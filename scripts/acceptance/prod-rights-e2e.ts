/**
 * Authenticated HTTP Rights Registry acceptance harness.
 *
 * This test deliberately requires an externally supplied, short-lived
 * Better Auth session cookie and pre-seeded, controlled test candidates.
 * No credentials are committed and this script does not create fixtures.
 *
 * Required environment:
 *   OTTO_BASE_URL
 *   OTTO_RIGHTS_SESSION_COOKIE
 *   OTTO_RIGHT_APPROVE_CANDIDATE_ID
 *   OTTO_RIGHT_REJECT_CANDIDATE_ID
 *
 * The approve candidate must be pending and suitable for controlled production
 * acceptance. The reject candidate must also be pending. Both must belong to
 * the organization represented by the supplied session.
 *
 * Run:
 *   npx tsx scripts/acceptance/prod-rights-e2e.ts
 */

import assert from "node:assert/strict";

const required = [
  "OTTO_BASE_URL",
  "OTTO_RIGHTS_SESSION_COOKIE",
  "OTTO_RIGHT_APPROVE_CANDIDATE_ID",
  "OTTO_RIGHT_REJECT_CANDIDATE_ID",
] as const;

for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
}

const baseUrl = process.env.OTTO_BASE_URL!.replace(/\/$/, "");
const cookie = process.env.OTTO_RIGHTS_SESSION_COOKIE!;
const approveCandidateId = process.env.OTTO_RIGHT_APPROVE_CANDIDATE_ID!;
const rejectCandidateId = process.env.OTTO_RIGHT_REJECT_CANDIDATE_ID!;

async function request(path: string, init?: RequestInit) {
  return fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      Cookie: cookie,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });
}

async function json(response: Response) {
  const text = await response.text();
  let body: any = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    // Preserve the raw response for assertion diagnostics.
  }
  return { body, text };
}

async function expectStatus(name: string, response: Response, expected: number[]) {
  const { text } = await json(response);
  assert.ok(
    expected.includes(response.status),
    `${name}: expected ${expected.join("/")}, got ${response.status}: ${text}`
  );
  console.log(`  ✓ ${name} (${response.status})`);
}

async function expectJson(name: string, response: Response, expected: number[]) {
  const { body, text } = await json(response);
  assert.ok(
    expected.includes(response.status),
    `${name}: expected ${expected.join("/")}, got ${response.status}: ${text}`
  );
  assert.equal(body?.success, true, `${name}: expected success=true: ${text}`);
  return body;
}

async function main() {
  console.log(`\n=== OTTO authenticated Rights Registry E2E ===\n${baseUrl}\n`);

  const registry = await expectJson(
    "authenticated Rights Registry list",
    await request("/api/rights"),
    [200]
  );
  assert.equal(typeof registry.data?.permissions?.canReview, "boolean");
  console.log("  ✓ registry permissions returned");

  const review = await expectJson(
    "authenticated Rights review queue",
    await request("/api/rights/review?status=pending"),
    [200]
  );
  const candidates = Array.isArray(review.data?.candidates) ? review.data.candidates : [];
  assert.ok(
    candidates.some((candidate: any) => candidate.id === approveCandidateId),
    "approve candidate is not present in the pending review queue"
  );
  assert.ok(
    candidates.some((candidate: any) => candidate.id === rejectCandidateId),
    "reject candidate is not present in the pending review queue"
  );
  console.log("  ✓ controlled approve/reject candidates are visible");

  const reject = await expectJson(
    "reject controlled candidate",
    await request("/api/rights/review", {
      method: "POST",
      body: JSON.stringify({
        candidateId: rejectCandidateId,
        decision: "reject",
        notes: "Controlled production acceptance rejection.",
      }),
    }),
    [200]
  );
  assert.equal(reject.data?.candidate?.status, "rejected");
  assert.equal(reject.data?.right, null);
  console.log("  ✓ rejection persisted without creating a registry right");

  const approve = await expectJson(
    "approve controlled candidate",
    await request("/api/rights/review", {
      method: "POST",
      body: JSON.stringify({
        candidateId: approveCandidateId,
        decision: "approve",
        notes: "Controlled production acceptance approval.",
      }),
    }),
    [200]
  );

  const rightId = approve.data?.right?.id;
  assert.equal(typeof rightId, "string", "approval did not return a right id");
  console.log(`  ✓ approval created right ${rightId}`);

  const detail = await expectJson(
    "approved right detail",
    await request(`/api/rights/${encodeURIComponent(rightId)}`),
    [200]
  );
  assert.equal(detail.data?.right?.id, rightId);
  assert.equal(detail.data?.right?.candidateId, approveCandidateId);
  console.log("  ✓ approved right is readable and linked to its candidate");

  const reloaded = await expectJson(
    "approved right persistence after reload",
    await request(`/api/rights/${encodeURIComponent(rightId)}`),
    [200]
  );
  assert.equal(reloaded.data?.right?.id, rightId);
  assert.equal(reloaded.data?.right?.status, "approved");
  console.log("  ✓ approved state persists after a fresh request");

  const timeline = await expectJson(
    "approved right timeline",
    await request(`/api/rights/${encodeURIComponent(rightId)}/timeline`),
    [200]
  );
  const entries = Array.isArray(timeline.data?.timeline) ? timeline.data.timeline : [];
  assert.ok(
    entries.some((entry: any) => entry.entryType === "approval"),
    "approved right timeline has no approval entry"
  );
  console.log("  ✓ approval timeline evidence present");

  const reviewAfter = await expectJson(
    "review queue after decisions",
    await request("/api/rights/review?status=pending"),
    [200]
  );
  const remaining = Array.isArray(reviewAfter.data?.candidates)
    ? reviewAfter.data.candidates
    : [];
  assert.ok(
    !remaining.some((candidate: any) => candidate.id === approveCandidateId),
    "approved candidate remains pending"
  );
  assert.ok(
    !remaining.some((candidate: any) => candidate.id === rejectCandidateId),
    "rejected candidate remains pending"
  );
  console.log("  ✓ review queue no longer exposes decided candidates as pending");

  console.log("\n=== Result: authenticated Rights Registry E2E PASSED ===\n");
}

main().catch((error) => {
  console.error("\n✗ Authenticated Rights Registry E2E FAILED");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
