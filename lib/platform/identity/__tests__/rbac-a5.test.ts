/**
 * A.5 Organization membership & RBAC unit tests
 */
import assert from "node:assert/strict";
import {
  PERMISSION_CATALOG,
  SYSTEM_ROLE_TEMPLATES,
  PERMISSION_CATALOG_VERSION,
  isKnownPermission,
  PermissionSet,
  authorizationService,
  effectivePermissionCache,
  buildPermissionCacheKey,
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

async function main() {
  console.log("\nIAM Organization Membership & RBAC (A.5)\n");

  await test("permission catalog expanded for domain modules", () => {
    assert.ok(isKnownPermission("contracts.create"));
    assert.ok(isKnownPermission("rights.promote"));
    assert.ok(isKnownPermission("royalties.export"));
    assert.ok(isKnownPermission("workspace.approve"));
    assert.ok(isKnownPermission("documents.upload"));
    assert.ok(isKnownPermission("ai.chat"));
    assert.ok(isKnownPermission("roles.manage"));
    assert.ok(isKnownPermission("audit.view"));
    assert.ok(PERMISSION_CATALOG.length >= 30);
    assert.ok(PERMISSION_CATALOG_VERSION >= 5);
  });

  await test("system roles include owner through viewer", () => {
    assert.ok(SYSTEM_ROLE_TEMPLATES.owner);
    assert.ok(SYSTEM_ROLE_TEMPLATES.administrator);
    assert.ok(SYSTEM_ROLE_TEMPLATES.manager);
    assert.ok(SYSTEM_ROLE_TEMPLATES.editor);
    assert.ok(SYSTEM_ROLE_TEMPLATES.reviewer);
    assert.ok(SYSTEM_ROLE_TEMPLATES.contributor);
    assert.ok(SYSTEM_ROLE_TEMPLATES.viewer);
    assert.ok(SYSTEM_ROLE_TEMPLATES.org_admin);
    assert.ok(
      SYSTEM_ROLE_TEMPLATES.owner.permissions.length >=
        SYSTEM_ROLE_TEMPLATES.viewer.permissions.length
    );
  });

  await test("AuthorizationService allows permission", () => {
    authorizationService.authorize(
      {
        identityId: "i",
        organizationId: "o",
        permissions: ["contracts.view"],
      },
      "contracts.view"
    );
  });

  await test("AuthorizationService denies missing permission", () => {
    assert.throws(
      () =>
        authorizationService.authorize(
          {
            identityId: "i",
            organizationId: "o",
            permissions: ["contracts.view"],
          },
          "contracts.delete"
        ),
      (e: any) => e.code === "PERMISSION_DENIED"
    );
  });

  await test("AuthorizationService superadmin bypass", () => {
    authorizationService.authorize(
      {
        identityId: "i",
        organizationId: "o",
        permissions: [],
        isSuperAdmin: true,
      },
      "platform.admin"
    );
  });

  await test("PermissionSet multi-role style merge", () => {
    const p = PermissionSet.from([
      ...SYSTEM_ROLE_TEMPLATES.viewer.permissions,
      ...SYSTEM_ROLE_TEMPLATES.reviewer.permissions,
    ]);
    assert.ok(p.has("contracts.view"));
    assert.ok(p.has("contracts.review"));
  });

  await test("permission cache key includes versions", () => {
    const k = buildPermissionCacheKey({
      identityId: "id",
      organizationId: "org",
      membershipVersion: 2,
      roleVersion: 3,
    });
    assert.ok(k.includes("id"));
    assert.ok(k.includes("org"));
    assert.ok(k.includes("2"));
    assert.ok(k.includes("3"));
    assert.ok(k.includes(String(PERMISSION_CATALOG_VERSION)));
  });

  await test("effective permission cache set/get/invalidate", () => {
    effectivePermissionCache.clear();
    const key = "test:cache:1:1:5";
    effectivePermissionCache.set(key, {
      permissions: ["contracts.view"],
      roles: ["viewer"],
    });
    const hit = effectivePermissionCache.get(key);
    assert.ok(hit);
    assert.equal(hit!.roles[0], "viewer");
    effectivePermissionCache.invalidatePrefix("test");
    assert.equal(effectivePermissionCache.get(key), null);
  });

  await test("organization & membership events registered", () => {
    assert.equal(
      IDENTITY_EVENTS.OrganizationCreated,
      "identity.organization.created"
    );
    assert.equal(
      IDENTITY_EVENTS.OrganizationSwitched,
      "identity.organization.switched"
    );
    assert.equal(
      IDENTITY_EVENTS.MembershipCreated,
      "identity.membership.created"
    );
    assert.equal(
      IDENTITY_EVENTS.MembershipSuspended,
      "identity.membership.suspended"
    );
    assert.equal(IDENTITY_EVENTS.RoleAssigned, "identity.role.assigned");
    assert.equal(
      IDENTITY_EVENTS.InvitationCreated,
      "identity.invitation.created"
    );
  });

  console.log(`\n${passed} passed, ${failed} failed\n`);
  if (failed > 0) process.exit(1);
}

main();
