/**
 * A.6 IAM Productization / v1.0 freeze tests
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import {
  IAM_PLATFORM_VERSION,
  IAM_CONTRACT_VERSION,
  IAM_PLATFORM_NAME,
  authorizationService,
  authenticationService,
  organizationService,
  membershipService,
  sessionService,
  mfaService,
  identityService,
  IDENTITY_EVENTS,
  PERMISSION_CATALOG,
  PERMISSION_CATALOG_VERSION,
  PermissionSet,
  iamMetrics,
  requirePermission,
  requireAuthentication,
  IdentityError,
} from "@/lib/platform/sdk";

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed++;
      console.log(`  ✓ ${name}`);
    })
    .catch((e: any) => {
      failed++;
      console.error(`  ✗ ${name}: ${e.message}`);
    });
}

const root = process.cwd();

async function main() {
  console.log("\nIAM Platform Productization (A.6 / v1.0)\n");

  await test("platform version is 1.0.0", () => {
    assert.equal(IAM_PLATFORM_VERSION, "1.0.0");
    assert.equal(IAM_CONTRACT_VERSION, "1.0.0");
    assert.ok(IAM_PLATFORM_NAME.includes("IAM"));
  });

  await test("SDK exports core services", () => {
    assert.ok(authenticationService);
    assert.ok(authorizationService);
    assert.ok(organizationService);
    assert.ok(membershipService);
    assert.ok(sessionService);
    assert.ok(mfaService);
    assert.ok(identityService);
    assert.equal(typeof requirePermission, "function");
    assert.equal(typeof requireAuthentication, "function");
  });

  await test("SDK permission catalog stable", () => {
    assert.ok(PERMISSION_CATALOG.length >= 30);
    assert.ok(PERMISSION_CATALOG_VERSION >= 5);
    assert.ok(PermissionSet.from(["contracts.view"]).has("contracts.view"));
  });

  await test("SDK identity events catalog non-empty", () => {
    assert.ok(Object.keys(IDENTITY_EVENTS).length >= 20);
    assert.equal(IDENTITY_EVENTS.LoginSuccess, "identity.login.success");
  });

  await test("metrics snapshot shape", () => {
    iamMetrics.reset();
    iamMetrics.loginSuccess();
    iamMetrics.permissionResolve(2, true);
    const snap = iamMetrics.snapshot();
    assert.equal(snap.counters["auth.login.success"], 1);
    assert.equal(snap.authzCacheHitRatio, 1);
    assert.ok(snap.collectedAt);
  });

  await test("IdentityError exported for handlers", () => {
    const e = new IdentityError("x", 400, "X");
    assert.equal(e.status, 400);
  });

  await test("productization documentation present", () => {
    const base = join(root, "docs/platform/identity");
    for (const f of [
      "overview.md",
      "architecture.md",
      "api-reference.md",
      "permission-reference.md",
      "event-reference.md",
      "operations.md",
      "deployment.md",
      "index.md",
      "release-validation.md",
    ]) {
      assert.ok(existsSync(join(base, f)), `missing ${f}`);
    }
    assert.ok(
      existsSync(
        join(root, "docs/product/platform/milestone-iam-a6-complete.md")
      )
    );
  });

  await test("SDK index documents no-repository rule", () => {
    const src = readFileSync(
      join(root, "lib/platform/sdk/index.ts"),
      "utf8"
    );
    assert.ok(src.includes("Do NOT import"));
    assert.ok(src.includes("repositories"));
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main();
