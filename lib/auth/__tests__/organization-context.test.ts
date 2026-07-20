/**
 * Organization Context automated tests.
 * Run: npx tsx lib/auth/__tests__/organization-context.test.ts
 */
import assert from "node:assert/strict";
import { PrismaClient } from "@prisma/client";
import {
  getLegacyCatalogScopeId,
  getUnassignedUserOrganizationId,
  isUnassignedUserOrganizationId,
  resolveCatalogOrganizationId,
  orgOwnsLegacyCatalog,
  allowLegacyUserScope,
  getLegacyIntOrgId,
} from "../migration-compat";
import {
  OrganizationContextError,
  getOrganizationContext,
  validateMembership,
} from "../organization-context";

const prisma = new PrismaClient();
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void | Promise<void>) {
  return (async () => {
    try {
      await fn();
      passed++;
      console.log(`  ✓ ${name}`);
    } catch (e: any) {
      failed++;
      console.error(`  ✗ ${name}`);
      console.error(`    ${e.message}`);
    }
  })();
}

async function main() {
  console.log("\n=== migration-compat ===\n");

  await test("legacy catalog scope is a valid UUID", () => {
    const id = getLegacyCatalogScopeId();
    assert.match(id, /^[0-9a-f-]{36}$/i);
  });

  await test("unassigned user org is not legacy catalog", () => {
    assert.notEqual(getUnassignedUserOrganizationId(), getLegacyCatalogScopeId());
    assert.equal(isUnassignedUserOrganizationId(getUnassignedUserOrganizationId()), true);
    assert.equal(isUnassignedUserOrganizationId(getLegacyCatalogScopeId()), false);
  });

  await test("resolveCatalogOrganizationId returns identity for unknown org", () => {
    const id = "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
    assert.equal(resolveCatalogOrganizationId(id), id);
  });

  await test("resolveCatalogOrganizationId maps legacy id to itself", () => {
    const legacy = getLegacyCatalogScopeId();
    assert.equal(resolveCatalogOrganizationId(legacy), legacy);
  });

  await test("resolveCatalogOrganizationId throws on empty", () => {
    assert.throws(() => resolveCatalogOrganizationId(""));
  });

  await test("allowLegacyUserScope only for legacy UUID", () => {
    assert.equal(
      allowLegacyUserScope({
        userOrganizationId: getLegacyCatalogScopeId(),
        isSuperAdmin: false,
      }),
      true
    );
    assert.equal(
      allowLegacyUserScope({
        userOrganizationId: getUnassignedUserOrganizationId(),
        isSuperAdmin: true,
      }),
      false
    );
  });

  await test("legacy int org is positive", () => {
    assert.ok(getLegacyIntOrgId() > 0);
  });

  console.log("\n=== organization-context (live DB) ===\n");

  await test("unauthenticated session throws 401", async () => {
    await assert.rejects(
      () => getOrganizationContext(null),
      (e: any) => e instanceof OrganizationContextError && e.status === 401
    );
  });

  await test("user without membership and unassigned org throws 403", async () => {
    await assert.rejects(
      () =>
        getOrganizationContext({
          user: {
            id: "999999",
            email: "nobody@example.com",
            organization_id: getUnassignedUserOrganizationId(),
            tenant_id: null,
            role: "user",
            is_superuser: false,
          },
        }),
      (e: any) => e instanceof OrganizationContextError && e.code === "NO_ORGANIZATION"
    );
  });

  // Use real admin if present
  const admin = await prisma.user.findFirst({
    where: { email: "admin@otto.com" },
  });

  if (admin) {
    await test("legacy admin resolves catalog scope to imported data", async () => {
      const ctx = await getOrganizationContext({
        user: {
          id: String(admin.id),
          email: admin.email,
          organization_id: admin.organization_id,
          tenant_id: admin.tenant_id,
          role: admin.role,
          is_superuser: admin.is_superuser,
        },
      });
      assert.equal(ctx.organizationId, getLegacyCatalogScopeId());
      assert.ok(
        ctx.dataScopeSource === "legacy-compat" ||
          ctx.dataScopeSource === "superadmin" ||
          ctx.dataScopeSource === "membership"
      );

      const artistCount = await prisma.artists.count({
        where: { organization_id: ctx.organizationId },
      });
      assert.ok(artistCount > 0, `expected artists > 0, got ${artistCount}`);

      const releaseCount = await prisma.releases.count({
        where: { organization_id: ctx.organizationId, is_deleted: false },
      });
      assert.ok(releaseCount > 0, `expected releases > 0, got ${releaseCount}`);
    });

    await test("validateMembership denies non-member org", async () => {
      const ok = await validateMembership(admin.id, "ffffffff-ffff-ffff-ffff-ffffffffffff");
      if (admin.is_superuser) {
        assert.equal(ok, true); // superuser bypass
      } else {
        assert.equal(ok, false);
      }
    });
  } else {
    console.log("  (skipped live admin tests — admin@otto.com not found)");
  }

  // Multi-membership user
  const multi = await prisma.user.findFirst({
    where: { email: "orga_admin@otto.com" },
    include: { tenant_users: true },
  });

  if (multi && multi.tenant_users.length > 0) {
    await test("multi-org user with legacy organization_id sees catalog", async () => {
      const ctx = await getOrganizationContext({
        user: {
          id: String(multi.id),
          email: multi.email,
          organization_id: multi.organization_id,
          tenant_id: multi.tenant_id,
          role: multi.role,
          is_superuser: multi.is_superuser,
        },
      });
      const artists = await prisma.artists.count({
        where: { organization_id: ctx.organizationId },
      });
      assert.ok(artists > 0, `multi-org user should see catalog, got ${artists}`);
    });
  }

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
  await prisma.$disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
