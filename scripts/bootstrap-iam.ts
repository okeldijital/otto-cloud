/**
 * OTTO IAM Bootstrap — production-safe, idempotent platform initialization.
 *
 * Creates ONLY:
 *   - permission catalog (iam_permissions)
 *   - default organization + system roles
 *   - administrator identity + password credential
 *   - administrator membership (owner role)
 *
 * Does NOT create demo data, sample contracts, artists, or releases.
 *
 * Usage:
 *   npx tsx scripts/bootstrap-iam.ts
 *   npm run bootstrap:iam
 *
 * Required env:
 *   DATABASE_URL
 *   DIRECT_URL              (for Prisma; can equal DATABASE_URL if no pooler)
 *   INITIAL_ADMIN_EMAIL
 *   INITIAL_ADMIN_PASSWORD
 *   INITIAL_ADMIN_NAME      (optional, default "Administrator")
 *   INITIAL_ORG_NAME        (optional, default "Otto")
 *   INITIAL_ORG_SLUG        (optional, derived from name)
 *
 * Safety:
 *   - Detects production-classified targets; requires --allow-production
 *   - Never runs migrate reset
 *   - Never overwrites existing admin password unless --reset-admin-password
 *   - Safe to re-run: exits 0 when already initialized
 *
 * Work only against iam-lab during hardening. Set NEON_BRANCH=iam-lab.
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";
import {
  assertBootstrapAllowed,
  assertDestructiveAllowed,
  logTargetBanner,
} from "../lib/platform/identity/bootstrap/safety";
import { BOOTSTRAP_POLICY_MARKER } from "../lib/platform/identity/bootstrap/constants";
import { seedIamPermissions, seedOrgSystemRoles } from "../lib/platform/identity/services/permission-seed";
import { hashPassword } from "../lib/platform/identity/authentication/crypto/password";
import { normalizeEmail } from "../lib/platform/identity/authentication/crypto/tokens";
import { assertPasswordStrength } from "../lib/platform/identity/authentication/passwords/password-policy";

/** Load .env then .env.local (does not override existing process.env). */
function loadEnvFiles(): void {
  for (const name of [".env", ".env.local"]) {
    const path = resolve(process.cwd(), name);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, "utf8");
    for (const line of text.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq <= 0) continue;
      const key = trimmed.slice(0, eq).trim();
      let val = trimmed.slice(eq + 1).trim();
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }
      if (process.env[key] === undefined) {
        process.env[key] = val;
      }
    }
  }
}

loadEnvFiles();

// Use a dedicated client for the script (avoid Next.js global caching edge cases)
const prisma = new PrismaClient({
  log: process.env.LOG_LEVEL === "debug" ? ["query", "warn", "error"] : ["warn", "error"],
});

type BootstrapConfig = {
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  orgName: string;
  orgSlug: string;
  resetAdminPassword: boolean;
  dryRun: boolean;
};

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 120) || "org";
}

function loadConfig(): BootstrapConfig {
  const adminEmail = (process.env.INITIAL_ADMIN_EMAIL || "").trim();
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || "";
  const adminName =
    (process.env.INITIAL_ADMIN_NAME || "Administrator").trim() || "Administrator";
  const orgName =
    (process.env.INITIAL_ORG_NAME || "Otto").trim() || "Otto";
  const orgSlug =
    (process.env.INITIAL_ORG_SLUG || "").trim() || slugify(orgName);

  const resetAdminPassword =
    process.argv.includes("--reset-admin-password") ||
    process.env.BOOTSTRAP_RESET_ADMIN_PASSWORD === "1";
  const dryRun = process.argv.includes("--dry-run");

  const missing: string[] = [];
  if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");
  if (!adminEmail) missing.push("INITIAL_ADMIN_EMAIL");
  if (!adminPassword) missing.push("INITIAL_ADMIN_PASSWORD");

  if (missing.length > 0) {
    console.error("Missing required environment variables:");
    for (const m of missing) console.error(`  - ${m}`);
    console.error("\nSee .env.example for documentation.");
    process.exit(1);
  }

  // Prisma schema requires DIRECT_URL — fall back for scripts if unset
  if (!process.env.DIRECT_URL) {
    process.env.DIRECT_URL = process.env.DATABASE_URL;
    console.warn(
      "DIRECT_URL unset — using DATABASE_URL (prefer non-pooler endpoint for migrations)."
    );
  }

  return {
    adminName,
    adminEmail,
    adminPassword,
    orgName,
    orgSlug,
    resetAdminPassword,
    dryRun,
  };
}

type BootstrapState = {
  permissionCount: number;
  organizationCount: number;
  identityCount: number;
  membershipCount: number;
  existingAdmin: { id: string; email: string } | null;
  existingOrg: { id: string; name: string; slug: string } | null;
  initialized: boolean;
};

async function detectState(adminEmail: string): Promise<BootstrapState> {
  const emailNormalized = normalizeEmail(adminEmail);
  const [permissionCount, organizationCount, identityCount, membershipCount, existingAdmin, existingOrg] =
    await Promise.all([
      prisma.iamPermission.count(),
      prisma.iamOrganization.count(),
      prisma.iamIdentity.count(),
      prisma.iamOrganizationMembership.count(),
      prisma.iamIdentity.findUnique({
        where: { emailNormalized },
        select: { id: true, email: true },
      }),
      prisma.iamOrganization.findFirst({
        orderBy: { createdAt: "asc" },
        select: { id: true, name: true, slug: true },
      }),
    ]);

  const initialized =
    permissionCount > 0 &&
    organizationCount > 0 &&
    existingAdmin != null &&
    membershipCount > 0;

  return {
    permissionCount,
    organizationCount,
    identityCount,
    membershipCount,
    existingAdmin,
    existingOrg,
    initialized,
  };
}

async function ensureAdminIdentity(config: BootstrapConfig): Promise<{
  id: string;
  email: string;
  created: boolean;
  passwordReset: boolean;
}> {
  const emailNormalized = normalizeEmail(config.adminEmail);
  const existing = await prisma.iamIdentity.findUnique({
    where: { emailNormalized },
    include: { passwordCreds: true, credentials: true },
  });

  if (existing) {
    let passwordReset = false;
    if (config.resetAdminPassword) {
      const destructive = assertDestructiveAllowed("reset-admin-password");
      if (!destructive.allowed) {
        throw new Error(destructive.message);
      }
      assertPasswordStrength(config.adminPassword);
      const passwordHash = await hashPassword(config.adminPassword);
      if (existing.passwordCreds[0]) {
        await prisma.iamPasswordCredential.update({
          where: { id: existing.passwordCreds[0].id },
          data: {
            passwordHash,
            algorithm: "argon2id",
            passwordChangedAt: new Date(),
          },
        });
      } else {
        await prisma.iamPasswordCredential.create({
          data: {
            identityId: existing.id,
            passwordHash,
            algorithm: "argon2id",
            passwordChangedAt: new Date(),
          },
        });
      }
      if (!existing.credentials.some((c) => c.type === "password")) {
        await prisma.iamCredential.create({
          data: {
            identityId: existing.id,
            type: "password",
            isPrimary: true,
          },
        });
      }
      await prisma.iamIdentity.update({
        where: { id: existing.id },
        data: {
          status: "active",
          failedLoginCount: 0,
          lockedUntil: null,
          mustChangePassword: false,
          emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
          sessionVersion: { increment: 1 },
        },
      });
      passwordReset = true;
    } else {
      // Ensure active + verified for bootstrap admin without touching password
      if (
        existing.status !== "active" ||
        !existing.emailVerifiedAt
      ) {
        await prisma.iamIdentity.update({
          where: { id: existing.id },
          data: {
            status: existing.status === "disabled" ? existing.status : "active",
            emailVerifiedAt: existing.emailVerifiedAt ?? new Date(),
            failedLoginCount: 0,
            lockedUntil: null,
          },
        });
      }
    }
    return {
      id: existing.id,
      email: existing.email,
      created: false,
      passwordReset,
    };
  }

  assertPasswordStrength(config.adminPassword);
  const passwordHash = await hashPassword(config.adminPassword);

  const identity = await prisma.iamIdentity.create({
    data: {
      email: config.adminEmail.trim(),
      emailNormalized,
      displayName: config.adminName,
      status: "active",
      emailVerifiedAt: new Date(),
      mustChangePassword: false,
      passwordCreds: {
        create: {
          passwordHash,
          algorithm: "argon2id",
          passwordChangedAt: new Date(),
        },
      },
      credentials: {
        create: {
          type: "password",
          isPrimary: true,
        },
      },
    },
  });

  return {
    id: identity.id,
    email: identity.email,
    created: true,
    passwordReset: false,
  };
}

async function ensureOrganization(params: {
  name: string;
  slug: string;
  ownerIdentityId: string;
}): Promise<{ id: string; name: string; slug: string; created: boolean }> {
  // Prefer existing org owned by admin, else first org, else create
  const owned = await prisma.iamOrganization.findFirst({
    where: { ownerIdentityId: params.ownerIdentityId },
    orderBy: { createdAt: "asc" },
  });
  if (owned) {
    return {
      id: owned.id,
      name: owned.name,
      slug: owned.slug,
      created: false,
    };
  }

  const any = await prisma.iamOrganization.findFirst({
    orderBy: { createdAt: "asc" },
  });
  if (any) {
    // Attach ownership if missing
    if (!any.ownerIdentityId) {
      await prisma.iamOrganization.update({
        where: { id: any.id },
        data: { ownerIdentityId: params.ownerIdentityId },
      });
    }
    return {
      id: any.id,
      name: any.name,
      slug: any.slug,
      created: false,
    };
  }

  let slug = params.slug;
  const slugTaken = await prisma.iamOrganization.findUnique({
    where: { slug },
  });
  if (slugTaken) {
    slug = `${slug}-${Date.now().toString(36)}`;
  }

  const org = await prisma.iamOrganization.create({
    data: {
      name: params.name,
      slug,
      status: "active",
      ownerIdentityId: params.ownerIdentityId,
      mfaPolicy: "optional",
      policies: {
        ...BOOTSTRAP_POLICY_MARKER,
      },
    },
  });

  return {
    id: org.id,
    name: org.name,
    slug: org.slug,
    created: true,
  };
}

async function ensureOwnerMembership(params: {
  organizationId: string;
  identityId: string;
}): Promise<{ created: boolean }> {
  const ownerRole = await prisma.iamRole.findUnique({
    where: {
      organizationId_key: {
        organizationId: params.organizationId,
        key: "owner",
      },
    },
  });

  const existing = await prisma.iamOrganizationMembership.findUnique({
    where: {
      identityId_organizationId: {
        identityId: params.identityId,
        organizationId: params.organizationId,
      },
    },
  });

  if (existing) {
    await prisma.iamOrganizationMembership.update({
      where: { id: existing.id },
      data: {
        status: "active",
        isOwner: true,
        isDefault: true,
        roleId: ownerRole?.id ?? existing.roleId,
        suspendedAt: null,
        removedAt: null,
      },
    });
    return { created: false };
  }

  await prisma.iamOrganizationMembership.create({
    data: {
      identityId: params.identityId,
      organizationId: params.organizationId,
      roleId: ownerRole?.id ?? null,
      status: "active",
      isOwner: true,
      isDefault: true,
      joinedAt: new Date(),
    },
  });

  return { created: true };
}

async function main(): Promise<void> {
  console.log("\nOTTO IAM Bootstrap");
  console.log("=".repeat(56));

  const config = loadConfig();
  const safety = assertBootstrapAllowed();
  logTargetBanner(safety.target);

  if (!safety.allowed) {
    console.error(`\nBLOCKED: ${safety.message}`);
    process.exit(1);
  }
  console.log(`  ${safety.message}`);

  if (config.dryRun) {
    console.log("\n--dry-run: no writes will be performed\n");
  }

  await prisma.$connect();
  console.log("Connected to database");

  const before = await detectState(config.adminEmail);
  console.log("\nCurrent state");
  console.log(`  permissions:  ${before.permissionCount}`);
  console.log(`  organizations:${before.organizationCount}`);
  console.log(`  identities:   ${before.identityCount}`);
  console.log(`  memberships:  ${before.membershipCount}`);
  console.log(
    `  admin:        ${before.existingAdmin ? before.existingAdmin.email : "(none)"}`
  );
  console.log(
    `  org:          ${before.existingOrg ? `${before.existingOrg.name} (${before.existingOrg.slug})` : "(none)"}`
  );

  if (
    before.initialized &&
    !config.resetAdminPassword &&
    !process.argv.includes("--force")
  ) {
    console.log("\nBootstrap already complete — nothing to do (idempotent exit).");
    console.log("  Use --force to re-run seed steps (still non-destructive).");
    console.log("  Use --reset-admin-password to rotate admin password (destructive flag).");
    console.log("=".repeat(56) + "\n");
    return;
  }

  if (config.dryRun) {
    console.log("Dry-run summary: would seed permissions, ensure admin, org, roles, membership.");
    return;
  }

  // 1. Permission catalog (global)
  console.log("\n[1/5] Seeding permission catalog...");
  const t0 = Date.now();
  const { upserted } = await seedIamPermissions();
  console.log(`  ${upserted} permissions upserted (${Date.now() - t0}ms)`);

  // 2. Administrator identity + credential
  console.log("\n[2/5] Ensuring administrator identity...");
  const admin = await ensureAdminIdentity(config);
  console.log(
    `  ${admin.created ? "Created" : "Existing"} admin: ${admin.email} (${admin.id})` +
      (admin.passwordReset ? " [password reset]" : "")
  );

  // 3. Default organization
  console.log("\n[3/5] Ensuring default organization...");
  const org = await ensureOrganization({
    name: config.orgName,
    slug: config.orgSlug,
    ownerIdentityId: admin.id,
  });
  console.log(
    `  ${org.created ? "Created" : "Existing"} org: ${org.name} (${org.slug}) id=${org.id}`
  );

  // 4. System roles for org (batched — hang fix)
  console.log("\n[4/5] Seeding system roles for organization...");
  const t1 = Date.now();
  await seedOrgSystemRoles(org.id);
  console.log(`  System roles ready (${Date.now() - t1}ms)`);

  // 5. Owner membership
  console.log("\n[5/5] Ensuring administrator membership (owner)...");
  const membership = await ensureOwnerMembership({
    organizationId: org.id,
    identityId: admin.id,
  });
  console.log(
    `  Membership ${membership.created ? "created" : "updated"} (owner, default)`
  );

  const after = await detectState(config.adminEmail);

  console.log("\n" + "=".repeat(56));
  console.log("Bootstrap complete");
  console.log(`  permissions:  ${after.permissionCount}`);
  console.log(`  organization: ${org.name} (${org.id})`);
  console.log(`  admin:        ${admin.email}`);
  console.log(`  role:         owner`);
  console.log(`  login:        /auth/login`);
  console.log("=".repeat(56) + "\n");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("\nBootstrap failed:");
    console.error(e instanceof Error ? e.message : e);
    if (e instanceof Error && e.stack) {
      console.error(e.stack.split("\n").slice(0, 8).join("\n"));
    }
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
