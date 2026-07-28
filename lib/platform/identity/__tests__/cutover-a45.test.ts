/**
 * A.4.5 Cutover verification tests
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import {
  getPlatformConfig,
  resetPlatformConfig,
  PERMISSION_CATALOG,
  isKnownPermission,
  IDENTITY_EVENTS,
} from "../index";

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
  console.log("\nIAM Cutover A.4.5\n");

  await test("next-auth not in package.json", () => {
    const pkg = JSON.parse(
      readFileSync(join(root, "package.json"), "utf8")
    );
    assert.equal(pkg.dependencies?.["next-auth"], undefined);
    assert.equal(pkg.devDependencies?.["next-auth"], undefined);
  });

  await test("nextauth catch-all route removed", () => {
    assert.equal(
      existsSync(join(root, "app/api/auth/[...nextauth]/route.ts")),
      false
    );
  });

  await test("legacyNextAuth feature flag always false", () => {
    resetPlatformConfig();
    assert.equal(getPlatformConfig().features.legacyNextAuth, false);
    assert.equal(getPlatformConfig().features.iamNativeAuth, true);
  });

  await test("authOptions stub removed from lib/auth.ts", () => {
    const src = readFileSync(join(root, "lib/auth.ts"), "utf8");
    assert.equal(src.includes("export const authOptions"), false);
    assert.ok(src.includes("getServerSession"));
  });

  await test("permission catalog covers domain modules", () => {
    assert.ok(isKnownPermission("contracts.view"));
    assert.ok(isKnownPermission("rights.manage"));
    assert.ok(isKnownPermission("royalties.view"));
    assert.ok(isKnownPermission("workspace.view"));
    assert.ok(isKnownPermission("workspace.manage"));
    assert.ok(isKnownPermission("notifications.manage"));
    assert.ok(isKnownPermission("security.manage"));
    assert.ok(PERMISSION_CATALOG.length >= 15);
  });

  await test("identity event catalog includes auth lifecycle", () => {
    assert.ok(IDENTITY_EVENTS.LoginSuccess);
    assert.ok(IDENTITY_EVENTS.SessionCreated);
    assert.ok(IDENTITY_EVENTS.PasswordChanged);
    assert.ok(IDENTITY_EVENTS.MfaEnabled);
    assert.ok(IDENTITY_EVENTS.MfaChallengeCreated);
  });

  await test("cutover documentation present", () => {
    assert.ok(
      existsSync(
        join(root, "docs/platform/identity/legacy-auth-inventory.md")
      )
    );
    assert.ok(
      existsSync(
        join(root, "docs/product/platform/adr-032-iam-cutover.md")
      )
    );
    assert.ok(
      existsSync(
        join(root, "docs/product/platform/milestone-iam-cutover.md")
      )
    );
  });

  await test("migration script present", () => {
    assert.ok(existsSync(join(root, "scripts/migrate-legacy-auth.ts")));
    assert.ok(
      existsSync(join(root, "scripts/migrate-legacy-auth-report.ts"))
    );
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main();
