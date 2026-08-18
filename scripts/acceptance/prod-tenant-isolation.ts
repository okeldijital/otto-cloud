/**
 * Authenticated HTTP tenant-isolation acceptance harness.
 *
 * This test deliberately requires externally supplied, short-lived test-session
 * cookies. No credentials are committed to the repository and no production
 * fixtures are created by this script.
 *
 * Required environment:
 *   OTTO_BASE_URL
 *   OTTO_TENANT_A_COOKIE
 *   OTTO_TENANT_B_COOKIE
 *   OTTO_TENANT_A_RELEASE_ID
 *   OTTO_TENANT_B_RELEASE_ID
 *
 * Optional:
 *   OTTO_TENANT_A_TRACK_ID
 *   OTTO_TENANT_B_TRACK_ID
 *
 * Run:
 *   npx tsx scripts/acceptance/prod-tenant-isolation.ts
 */

import assert from "node:assert/strict";

const required = [
  "OTTO_BASE_URL",
  "OTTO_TENANT_A_COOKIE",
  "OTTO_TENANT_B_COOKIE",
  "OTTO_TENANT_A_RELEASE_ID",
  "OTTO_TENANT_B_RELEASE_ID",
] as const;

for (const name of required) {
  if (!process.env[name]) throw new Error(`Missing required environment variable: ${name}`);
}

const baseUrl = process.env.OTTO_BASE_URL!.replace(/\/$/, "");
const tenantA = {
  cookie: process.env.OTTO_TENANT_A_COOKIE!,
  ownRelease: process.env.OTTO_TENANT_A_RELEASE_ID!,
};
const tenantB = {
  cookie: process.env.OTTO_TENANT_B_COOKIE!,
  ownRelease: process.env.OTTO_TENANT_B_RELEASE_ID!,
};

async function request(cookie: string, path: string, init?: RequestInit) {
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

async function expectStatus(name: string, response: Response, expected: number[]) {
  const body = await response.text();
  assert.ok(expected.includes(response.status), `${name}: expected ${expected.join("/")}, got ${response.status}: ${body}`);
  console.log(`  ✓ ${name} (${response.status})`);
}

async function main() {
  console.log(`\n=== OTTO authenticated tenant isolation ===\n${baseUrl}\n`);

  await expectStatus(
    "Tenant A can read its own release",
    await request(tenantA.cookie, `/api/releases?id=${tenantA.ownRelease}`),
    [200]
  );

  await expectStatus(
    "Tenant B can read its own release",
    await request(tenantB.cookie, `/api/releases?id=${tenantB.ownRelease}`),
    [200]
  );

  await expectStatus(
    "Tenant A cannot read Tenant B release",
    await request(tenantA.cookie, `/api/releases?id=${tenantB.ownRelease}`),
    [404]
  );

  await expectStatus(
    "Tenant B cannot read Tenant A release",
    await request(tenantB.cookie, `/api/releases?id=${tenantA.ownRelease}`),
    [404]
  );

  const updateBody = JSON.stringify({ title: `ISOLATION-ATTACK-${Date.now()}` });

  await expectStatus(
    "Tenant A cannot mutate Tenant B release",
    await request(tenantA.cookie, `/api/releases?id=${tenantB.ownRelease}`, {
      method: "PUT",
      body: updateBody,
    }),
    [403, 404]
  );

  await expectStatus(
    "Tenant B cannot mutate Tenant A release",
    await request(tenantB.cookie, `/api/releases?id=${tenantA.ownRelease}`, {
      method: "PUT",
      body: updateBody,
    }),
    [403, 404]
  );

  const tenantATrack = process.env.OTTO_TENANT_A_TRACK_ID;
  const tenantBTrack = process.env.OTTO_TENANT_B_TRACK_ID;
  if (tenantATrack && tenantBTrack) {
    await expectStatus(
      "Tenant A cannot assign Tenant B track to its release",
      await request(tenantA.cookie, `/api/releases?id=${tenantA.ownRelease}`, {
        method: "PUT",
        body: JSON.stringify({ track_ids: [Number(tenantBTrack)] }),
      }),
      [403, 404]
    );
    await expectStatus(
      "Tenant B cannot assign Tenant A track to its release",
      await request(tenantB.cookie, `/api/releases?id=${tenantB.ownRelease}`, {
        method: "PUT",
        body: JSON.stringify({ track_ids: [Number(tenantATrack)] }),
      }),
      [403, 404]
    );
  } else {
    console.log("  - track assignment cross-tenant assertions skipped (track IDs not supplied)");
  }

  console.log("\n=== Result: authenticated tenant isolation PASSED ===\n");
}

main().catch((error) => {
  console.error("\n✗ Authenticated tenant isolation FAILED");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
