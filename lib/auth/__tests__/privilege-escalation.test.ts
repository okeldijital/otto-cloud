/**
 * A.8 Step 3 Group B — Privilege escalation tests.
 * Run: npx tsx lib/auth/__tests__/privilege-escalation.test.ts
 */

import assert from "node:assert/strict";
import {
  ROLE_RANK,
  ORG_ASSIGNABLE_ROLE_KEYS,
  assertCanGrantOrgRole,
  assertCanSetSuperuser,
  assertOrganizationTarget,
  isPlatformAuthority,
  normalizeLegacyInviteRole,
} from "../privilege-authorization";
import { SYSTEM_ROLE_TEMPLATES } from "@/lib/platform/identity/permissions/catalog";
import { IdentityError } from "@/lib/platform/identity/domain/types";
import type { CurrentIdentityContext } from "@/lib/platform/identity/authentication/current-identity-service";

const ORG_A = "org-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const ORG_B = "org-bbbb-bbbb-bbbb-bbbbbbbbbbbb";

function ctx(partial: Partial<CurrentIdentityContext>): CurrentIdentityContext {
  return {
    identityId: "id-1",
    email: "a@example.com",
    displayName: "A",
    emailVerified: true,
    emailVerifiedAt: new Date(),
    status: "active",
    sessionId: "s1",
    sessionExpiresAt: new Date(Date.now() + 3600_000),
    sessionVersion: 0,
    mustChangePassword: false,
    organizationId: ORG_A,
    organization: {
      id: ORG_A,
      name: "Org A",
      slug: "org-a",
      status: "active",
    },
    roles: ["member"],
    permissions: [],
    permissionSet: { hasAny: () => false, has: () => false } as any,
    isSuperAdmin: false,
    legacyUserId: 1,
    ...partial,
  };
}

let passed = 0;
let failed = 0;

async function test(name: string, fn: () => void | Promise<void>) {
  try {
    await fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e: any) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
  }
}

function expectDenied(fn: () => void, code?: string) {
  try {
    fn();
    throw new Error("expected IdentityError");
  } catch (e: any) {
    if (e.message === "expected IdentityError") throw e;
    assert.equal(e instanceof IdentityError, true, e.message);
    if (code) assert.equal(e.code, code, `code ${e.code} vs ${code}`);
    assert.ok(e.status === 403 || e.status === 400, `status ${e.status}`);
  }
}

async function main() {
  console.log("\n=== A.8 Group B privilege-escalation tests ===\n");

  console.log("-- platform vs organization authority --");
  await test("org owner is not platform authority", () => {
    assert.equal(
      isPlatformAuthority({
        isSuperAdmin: false,
        roles: ["owner"],
        permissions: Object.keys(SYSTEM_ROLE_TEMPLATES.owner.permissions),
      }),
      false
    );
  });
  await test("owner template does not include platform.admin", () => {
    assert.ok(
      !SYSTEM_ROLE_TEMPLATES.owner.permissions.includes("platform.admin" as any)
    );
  });
  await test("super_admin is platform authority", () => {
    assert.equal(
      isPlatformAuthority({ isSuperAdmin: true, roles: [], permissions: [] }),
      true
    );
  });
  await test("bare platform.admin permission is NOT platform authority (seed-drift safe)", () => {
    // A.8 Step 5: stale owner→platform.admin must not elevate
    assert.equal(
      isPlatformAuthority({
        isSuperAdmin: false,
        roles: ["owner"],
        permissions: ["platform.admin"],
      }),
      false
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

  console.log("\n-- organization target binding --");
  await test("member cannot target another organization", () => {
    expectDenied(
      () =>
        assertOrganizationTarget(ctx({ roles: ["administrator"] }), ORG_B),
      "ORG_SCOPE_DENIED"
    );
  });
  await test("member can target own organization", () => {
    assertOrganizationTarget(ctx({ roles: ["administrator"] }), ORG_A);
  });
  await test("platform authority may cross organizations", () => {
    assertOrganizationTarget(
      ctx({ isSuperAdmin: true, organizationId: ORG_A }),
      ORG_B
    );
  });

  console.log("\n-- role grant boundary --");
  await test("member cannot grant owner", () => {
    expectDenied(
      () => assertCanGrantOrgRole(ctx({ roles: ["member"] }), "owner"),
      "ROLE_GRANT_DENIED"
    );
  });
  await test("member cannot grant administrator", () => {
    expectDenied(
      () => assertCanGrantOrgRole(ctx({ roles: ["member"] }), "administrator"),
      "ROLE_GRANT_DENIED"
    );
  });
  await test("administrator can grant member/editor", () => {
    assertCanGrantOrgRole(ctx({ roles: ["administrator"] }), "member");
    assertCanGrantOrgRole(ctx({ roles: ["administrator"] }), "editor");
  });
  await test("administrator cannot grant owner", () => {
    expectDenied(
      () => assertCanGrantOrgRole(ctx({ roles: ["administrator"] }), "owner"),
      "ROLE_GRANT_DENIED"
    );
  });
  await test("administrator cannot grant equal rank org_admin", () => {
    expectDenied(
      () => assertCanGrantOrgRole(ctx({ roles: ["administrator"] }), "org_admin"),
      "ROLE_GRANT_DENIED"
    );
  });
  await test("owner can grant administrator but not owner via set_role", () => {
    assertCanGrantOrgRole(ctx({ roles: ["owner"] }), "administrator");
    expectDenied(
      () => assertCanGrantOrgRole(ctx({ roles: ["owner"] }), "owner"),
      "ROLE_GRANT_DENIED"
    );
  });
  await test("cannot assign super_admin / platform_admin", () => {
    expectDenied(
      () => assertCanGrantOrgRole(ctx({ roles: ["owner"] }), "super_admin"),
      "ROLE_GRANT_DENIED"
    );
    expectDenied(
      () => assertCanGrantOrgRole(ctx({ roles: ["owner"] }), "platform_admin"),
      "ROLE_GRANT_DENIED"
    );
  });
  await test("unknown role rejected", () => {
    expectDenied(
      () => assertCanGrantOrgRole(ctx({ roles: ["owner"] }), "god_mode"),
      "UNKNOWN_ROLE"
    );
  });
  await test("platform authority may grant org roles", () => {
    assertCanGrantOrgRole(
      ctx({ isSuperAdmin: true, roles: ["super_admin"] }),
      "administrator"
    );
  });

  console.log("\n-- superuser flag --");
  await test("org admin cannot set is_superuser", () => {
    expectDenied(
      () =>
        assertCanSetSuperuser(
          { isSuperAdmin: false, roles: ["owner"], permissions: ["users.manage"] },
          true
        ),
      "PLATFORM_AUTHORITY_REQUIRED"
    );
  });
  await test("platform authority can set is_superuser", () => {
    assert.equal(
      assertCanSetSuperuser({ isSuperAdmin: true, roles: [], permissions: [] }, true),
      true
    );
  });
  await test("non-boolean is_superuser rejected", () => {
    expectDenied(
      () =>
        assertCanSetSuperuser({ isSuperAdmin: true, roles: [], permissions: [] }, "yes"),
      "VALIDATION_ERROR"
    );
  });

  console.log("\n-- invite role normalization --");
  await test("invite rejects owner role string", () => {
    expectDenied(
      () =>
        normalizeLegacyInviteRole(
          "owner",
          ctx({ roles: ["owner"], permissions: ["users.invite"] })
        ),
      "ROLE_GRANT_DENIED"
    );
  });
  await test("invite rejects superuser role string", () => {
    expectDenied(
      () =>
        normalizeLegacyInviteRole(
          "superuser",
          ctx({ roles: ["owner"], permissions: ["users.invite"] })
        ),
      "ROLE_GRANT_DENIED"
    );
  });
  await test("invite allows member for admin actor", () => {
    const r = normalizeLegacyInviteRole(
      "member",
      ctx({ roles: ["administrator"], permissions: ["users.invite"] })
    );
    assert.equal(r, "member");
  });
  await test("invite defaults empty role to member", () => {
    const r = normalizeLegacyInviteRole(
      undefined,
      ctx({ roles: ["owner"], permissions: ["users.invite"] })
    );
    assert.equal(r, "member");
  });
  await test("member actor cannot invite admin", () => {
    expectDenied(
      () =>
        normalizeLegacyInviteRole(
          "admin",
          ctx({ roles: ["member"], permissions: ["users.invite"] })
        ),
      "ROLE_GRANT_DENIED"
    );
  });

  console.log("\n-- catalog invariants --");
  await test("org assignable roles exclude platform keys", () => {
    assert.ok(!ORG_ASSIGNABLE_ROLE_KEYS.has("super_admin"));
    assert.ok(ORG_ASSIGNABLE_ROLE_KEYS.has("owner"));
    assert.ok(ORG_ASSIGNABLE_ROLE_KEYS.has("member"));
  });
  await test("role ranks ordered correctly", () => {
    assert.ok(ROLE_RANK.member < ROLE_RANK.administrator);
    assert.ok(ROLE_RANK.administrator < ROLE_RANK.owner);
    assert.ok(ROLE_RANK.owner < ROLE_RANK.super_admin);
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
