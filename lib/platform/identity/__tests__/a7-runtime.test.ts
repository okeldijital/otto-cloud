/**
 * A.7 Cloud Runtime Stabilization — repository-level acceptance checks.
 * These checks are deterministic and do not connect to or modify a database.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error) {
    failed++;
    console.error(`  ✗ ${name}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const root = process.cwd();

async function main() {
  console.log("\nIAM A.7 Cloud Runtime Stabilization\n");

  await test("read-only cloud diagnostic exists", () => {
    assert.ok(existsSync(join(root, "scripts/cloud-runtime-diagnostics.ts")));
  });

  await test("diagnostic is exposed as an npm script", () => {
    const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
    assert.equal(pkg.scripts?.["diagnose:cloud"], "tsx scripts/cloud-runtime-diagnostics.ts");
  });

  await test("diagnostic contains no destructive SQL", () => {
    const source = readFileSync(join(root, "scripts/cloud-runtime-diagnostics.ts"), "utf8");
    for (const token of ["INSERT ", "UPDATE ", "DELETE ", "TRUNCATE ", "DROP TABLE", "ALTER TABLE"]) {
      assert.equal(source.toUpperCase().includes(token), false, `found ${token}`);
    }
  });

  await test("IAM login route uses native IAM authentication", () => {
    const source = readFileSync(join(root, "app/api/auth/login/route.ts"), "utf8");
    assert.ok(source.includes("authenticationService.login"));
    assert.equal(source.includes("next-auth"), false);
  });

  await test("session endpoint remains the frontend auth source of truth", () => {
    const source = readFileSync(join(root, "app/api/auth/session/route.ts"), "utf8");
    assert.ok(source.includes("authenticationService.getPublicSession"));
  });

  await test("production migration datasource requires DIRECT_URL", () => {
    const schema = readFileSync(join(root, "prisma/schema.prisma"), "utf8");
    assert.ok(schema.includes('directUrl = env("DIRECT_URL")'));
  });

  await test("IAM platform SDK remains versioned", () => {
    const source = readFileSync(join(root, "lib/platform/identity/index.ts"), "utf8");
    assert.ok(source.includes("IAM_PLATFORM_VERSION"));
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main();
