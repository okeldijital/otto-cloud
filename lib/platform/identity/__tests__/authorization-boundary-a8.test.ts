/**
 * A.8 authorization-boundary acceptance tests.
 *
 * These tests exercise the pure authorization boundary without touching a
 * database or production IAM state.
 */
import assert from "node:assert/strict";
import { authorizationService } from "../authorization/AuthorizationService";

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error: any) {
    failed++;
    console.error(`  ✗ ${name}: ${error?.message ?? error}`);
  }
}

async function main() {
  console.log("\nIAM Authorization Boundary (A.8)\n");

  await test("authorized organization-scoped operation succeeds", () => {
    authorizationService.authorizeForOrganization(
      {
        identityId: "identity-a",
        organizationId: "org-a",
        permissions: ["contracts.view"],
      },
      "org-a",
      "contracts.view"
    );
  });

  await test("cross-organization access is denied", () => {
    assert.throws(
      () =>
        authorizationService.authorizeForOrganization(
          {
            identityId: "identity-a",
            organizationId: "org-a",
            permissions: ["contracts.view"],
          },
          "org-b",
          "contracts.view"
        ),
      (error: any) => error.code === "PERMISSION_DENIED" && error.status === 403
    );
  });

  await test("missing organization context is denied", () => {
    assert.throws(
      () =>
        authorizationService.authorizeForOrganization(
          {
            identityId: "identity-a",
            organizationId: null,
            permissions: ["contracts.view"],
          },
          "org-a",
          "contracts.view"
        ),
      (error: any) => error.code === "MEMBERSHIP_REQUIRED" && error.status === 403
    );
  });

  await test("missing organization identifier is denied", () => {
    assert.throws(
      () =>
        authorizationService.authorizeForOrganization(
          {
            identityId: "identity-a",
            organizationId: "org-a",
            permissions: ["contracts.view"],
          },
          "",
          "contracts.view"
        ),
      (error: any) => error.code === "ORGANIZATION_REQUIRED" && error.status === 403
    );
  });

  await test("permission denial remains fail-closed", () => {
    assert.throws(
      () =>
        authorizationService.authorizeForOrganization(
          {
            identityId: "identity-a",
            organizationId: "org-a",
            permissions: [],
          },
          "org-a",
          "contracts.delete"
        ),
      (error: any) => error.code === "PERMISSION_DENIED" && error.status === 403
    );
  });

  await test("platform super-admin may explicitly span organizations", () => {
    authorizationService.authorizeForOrganization(
      {
        identityId: "platform-identity",
        organizationId: "org-a",
        permissions: [],
        isSuperAdmin: true,
      },
      "org-b",
      "platform.admin"
    );
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main();
