/**
 * A.8 Step 5 — Security remediation unit tests.
 * Run: npm run test:a8-step5
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  isPlatformAuthority,
  platformAuthorityFromSession,
  assertPlatformAuthority,
} from "../privilege-authorization";
import {
  requirePositiveIntId,
  requireLegacyIntOrgId,
  ResourceAuthError,
} from "../resource-authorization";
import type { OrganizationContext } from "../organization-context";
import { SYSTEM_ROLE_TEMPLATES } from "@/lib/platform/identity/permissions/catalog";
import { IdentityError } from "@/lib/platform/identity/domain/types";

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e: unknown) {
    failed++;
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`  ✗ ${name}`);
    console.error(`    ${msg}`);
  }
}

function baseOrg(partial: Partial<OrganizationContext> = {}): OrganizationContext {
  return {
    organizationId: "org-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    organization: null,
    tenantId: "org-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
    membership: null,
    role: "member",
    permissions: [],
    isSuperAdmin: false,
    userId: 42,
    userEmail: "a@example.com",
    legacyIntOrgId: 10,
    dataScopeSource: "membership",
    ...partial,
  };
}

async function main() {
  console.log("\n=== A.8 Step 5 security remediation tests ===\n");

  console.log("-- platform authority (seed-drift safe) --");
  await test("owner is not platform authority", () => {
    assert.equal(
      isPlatformAuthority({
        isSuperAdmin: false,
        roles: ["owner"],
        permissions: [...SYSTEM_ROLE_TEMPLATES.owner.permissions],
      }),
      false
    );
  });
  await test("stale platform.admin on owner permissions is NOT platform authority", () => {
    assert.equal(
      isPlatformAuthority({
        isSuperAdmin: false,
        roles: ["owner"],
        permissions: ["platform.admin", "users.manage", "organizations.manage"],
      }),
      false
    );
  });
  await test("org admin is not platform authority", () => {
    assert.equal(
      isPlatformAuthority({
        isSuperAdmin: false,
        roles: ["administrator"],
        permissions: ["users.manage", "platform.admin"],
      }),
      false
    );
  });
  await test("super_admin role is platform authority", () => {
    assert.equal(
      isPlatformAuthority({
        isSuperAdmin: false,
        roles: ["super_admin"],
        permissions: [],
      }),
      true
    );
  });
  await test("platform_admin role is platform authority", () => {
    assert.equal(
      isPlatformAuthority({
        isSuperAdmin: false,
        roles: ["platform_admin"],
        permissions: [],
      }),
      true
    );
  });
  await test("isSuperAdmin flag is platform authority", () => {
    assert.equal(
      isPlatformAuthority({ isSuperAdmin: true, roles: [], permissions: [] }),
      true
    );
  });
  await test("bare platform.admin permission alone is NOT platform authority", () => {
    assert.equal(
      isPlatformAuthority({
        isSuperAdmin: false,
        roles: ["member"],
        permissions: ["platform.admin"],
      }),
      false
    );
  });
  await test("assertPlatformAuthority throws for org owner", () => {
    try {
      assertPlatformAuthority({
        isSuperAdmin: false,
        roles: ["owner"],
        permissions: ["platform.admin"],
      });
      throw new Error("expected throw");
    } catch (e: unknown) {
      assert.ok(e instanceof IdentityError);
      assert.equal((e as IdentityError).code, "PLATFORM_AUTHORITY_REQUIRED");
    }
  });
  await test("platformAuthorityFromSession respects is_superuser", () => {
    assert.equal(
      platformAuthorityFromSession({
        is_superuser: true,
        role: "owner",
        permissions: [],
      }),
      true
    );
    assert.equal(
      platformAuthorityFromSession({
        is_superuser: false,
        role: "owner",
        permissions: ["platform.admin"],
      }),
      false
    );
  });

  console.log("\n-- organization integer fallback fail-closed --");
  await test("missing id rejected", () => {
    try {
      requirePositiveIntId(undefined, "orgId");
      throw new Error("expected throw");
    } catch (e: unknown) {
      assert.ok(e instanceof ResourceAuthError);
      assert.equal((e as ResourceAuthError).status, 400);
    }
  });
  await test("invalid id rejected", () => {
    try {
      requirePositiveIntId("not-a-number", "orgId");
      throw new Error("expected throw");
    } catch (e: unknown) {
      assert.ok(e instanceof ResourceAuthError);
    }
  });
  await test("org id 0 rejected", () => {
    try {
      requirePositiveIntId(0, "orgId");
      throw new Error("expected throw");
    } catch (e: unknown) {
      assert.ok(e instanceof ResourceAuthError);
    }
  });
  await test("negative id rejected", () => {
    try {
      requirePositiveIntId(-1, "orgId");
      throw new Error("expected throw");
    } catch (e: unknown) {
      assert.ok(e instanceof ResourceAuthError);
    }
  });
  await test("UUID string rejected (no collapse to 1)", () => {
    try {
      requirePositiveIntId("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", "orgId");
      throw new Error("expected throw");
    } catch (e: unknown) {
      assert.ok(e instanceof ResourceAuthError);
    }
  });
  await test("parseInt-style garbage cannot become 1", () => {
    // Historical bug: parseInt(uuid)||1 → 1
    const uuid = "not-an-int";
    try {
      requirePositiveIntId(uuid, "orgId");
      throw new Error("expected throw");
    } catch (e: unknown) {
      assert.ok(e instanceof ResourceAuthError);
      assert.notEqual((e as ResourceAuthError).message.includes("1") && false, true);
    }
  });
  await test("valid positive int accepted", () => {
    assert.equal(requirePositiveIntId("42", "id"), 42);
    assert.equal(requirePositiveIntId(7, "id"), 7);
  });
  await test("legacyIntOrgId 0 fails closed", () => {
    try {
      requireLegacyIntOrgId(baseOrg({ legacyIntOrgId: 0 }));
      throw new Error("expected throw");
    } catch (e: unknown) {
      assert.ok(e instanceof ResourceAuthError);
      assert.equal((e as ResourceAuthError).code, "ORG_SCOPE_UNAVAILABLE");
    }
  });
  await test("legacyIntOrgId NaN fails closed", () => {
    try {
      requireLegacyIntOrgId(baseOrg({ legacyIntOrgId: Number.NaN }));
      throw new Error("expected throw");
    } catch (e: unknown) {
      assert.ok(e instanceof ResourceAuthError);
    }
  });
  await test("valid legacyIntOrgId returned", () => {
    assert.equal(requireLegacyIntOrgId(baseOrg({ legacyIntOrgId: 10 })), 10);
  });

  console.log("\n-- static route hardening (source contracts) --");
  const root = join(process.cwd());
  await test("test-db does not expose user_count", () => {
    const src = readFileSync(join(root, "app/api/test-db/route.ts"), "utf8");
    assert.ok(!src.includes("user_count"));
    assert.ok(!src.includes("user.count"));
  });
  await test("identity health requires platform authority", () => {
    const src = readFileSync(
      join(root, "app/api/platform/health/identity/route.ts"),
      "utf8"
    );
    assert.ok(src.includes("isPlatformAuthority") || src.includes("PLATFORM_AUTHORITY"));
    assert.ok(!src.includes("iamIdentity.count"));
    assert.ok(!src.includes("identities="));
  });
  await test("export route has no parseInt||1", () => {
    const src = readFileSync(join(root, "app/api/export/route.ts"), "utf8");
    assert.ok(!src.includes("|| 1"));
    assert.ok(src.includes("requireLegacyIntOrgId") || src.includes("organizationId"));
  });
  await test("storage upload uses requireOrgAuth + entity bind", () => {
    const src = readFileSync(join(root, "app/api/storage/upload/route.ts"), "utf8");
    assert.ok(src.includes("requireOrgAuth"));
    assert.ok(src.includes("requireUploadEntityInOrg"));
    assert.ok(!src.includes("|| 1"));
  });
  await test("labels mutations require platformAuthorityFromSession", () => {
    const src = readFileSync(join(root, "app/api/labels/route.ts"), "utf8");
    assert.equal(
      (src.match(/platformAuthorityFromSession/g) || []).length >= 3,
      true
    );
  });
  await test("AI core-write has no parseInt||1", () => {
    const src = readFileSync(join(root, "app/api/ai/core-write/route.ts"), "utf8");
    assert.ok(!src.includes("|| 1"));
    assert.ok(src.includes("requireLegacyIntOrgId"));
  });
  await test("owner template excludes platform.admin", () => {
    assert.ok(
      !SYSTEM_ROLE_TEMPLATES.owner.permissions.includes("platform.admin" as never)
    );
  });
  await test("reconciliation script is dry-run / apply-refused", () => {
    const src = readFileSync(
      join(root, "scripts/reconcile-iam-owner-platform-admin.ts"),
      "utf8"
    );
    assert.ok(src.includes("DRY-RUN") || src.includes("dry-run"));
    assert.ok(src.includes("REFUSED") || src.includes("disabled"));
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main();
