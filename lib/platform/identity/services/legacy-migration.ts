/**
 * Legacy user → IAM identity migration (cutover helper).
 *
 * Migrates password (re-hash to Argon2id when bcrypt present), links legacyUserId,
 * and optionally creates org membership from tenant_users.
 */

import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { hashPassword } from "../authentication/crypto/password";
import { normalizeEmail } from "../authentication/crypto/tokens";
import { seedOrgSystemRoles } from "./permission-seed";

export type MigrateUserResult = {
  legacyUserId: number;
  identityId: string;
  email: string;
  created: boolean;
  orgLinked: number;
};

/**
 * Ensure an IAM identity has a legacy users.id compatibility actor.
 *
 * This actor is NOT an authentication authority. It exists only because a
 * number of legacy domain tables still require users.id as their actor key.
 * The mapping is persisted on iamIdentity.legacyUserId so callers never need
 * to resolve the actor by email at request time.
 */
export async function ensureLegacyActorForIdentity(identityId: string): Promise<number> {
  const identity = await prisma.iamIdentity.findUnique({
    where: { id: identityId },
    select: {
      id: true,
      email: true,
      displayName: true,
      legacyUserId: true,
    },
  });

  if (!identity) {
    throw new Error(`IAM identity ${identityId} not found`);
  }

  if (identity.legacyUserId !== null) {
    return identity.legacyUserId;
  }

  const passwordHash = await hashPassword(
    `compatibility-${identity.id}-${Date.now()}-${Math.random()}`
  );

  return prisma.$transaction(async (tx) => {
    // Re-check inside the transaction to make concurrent requests converge.
    const current = await tx.iamIdentity.findUnique({
      where: { id: identity.id },
      select: { legacyUserId: true },
    });

    if (current?.legacyUserId !== null && current?.legacyUserId !== undefined) {
      return current.legacyUserId;
    }

    const actor = await tx.user.create({
      data: {
        email: identity.email,
        hashed_password: passwordHash,
        name: identity.displayName,
        is_active: true,
        is_superuser: false,
      },
      select: { id: true },
    });

    await tx.iamIdentity.update({
      where: { id: identity.id },
      data: { legacyUserId: actor.id },
    });

    return actor.id;
  });
}

export async function migrateLegacyUser(
  legacyUserId: number,
  options?: { plainPassword?: string }
): Promise<MigrateUserResult> {
  const user = await prisma.user.findUnique({ where: { id: legacyUserId } });
  if (!user) {
    throw new Error(`Legacy user ${legacyUserId} not found`);
  }

  const existing = await prisma.iamIdentity.findUnique({
    where: { legacyUserId },
  });
  if (existing) {
    return {
      legacyUserId,
      identityId: existing.id,
      email: existing.email,
      created: false,
      orgLinked: 0,
    };
  }

  const byEmail = await prisma.iamIdentity.findUnique({
    where: { emailNormalized: normalizeEmail(user.email) },
  });
  if (byEmail) {
    await prisma.iamIdentity.update({
      where: { id: byEmail.id },
      data: { legacyUserId },
    });
    const orgLinked = await linkTenantMemberships(byEmail.id, legacyUserId);
    return {
      legacyUserId,
      identityId: byEmail.id,
      email: byEmail.email,
      created: false,
      orgLinked,
    };
  }

  // Password: if plain provided, hash Argon2id; else set random unusable until reset
  let passwordHash: string;
  if (options?.plainPassword) {
    passwordHash = await hashPassword(options.plainPassword);
  } else {
    // Force reset: random password so login requires password-reset flow
    passwordHash = await hashPassword(
      `migrated-${legacyUserId}-${Date.now()}-${Math.random()}`
    );
  }

  const identity = await prisma.iamIdentity.create({
    data: {
      email: user.email,
      emailNormalized: normalizeEmail(user.email),
      displayName: user.name,
      emailVerifiedAt: user.is_active ? new Date() : null,
      status: user.is_active ? "active" : "disabled",
      legacyUserId: user.id,
      lastLoginAt: user.last_login,
      passwordCreds: {
        create: {
          passwordHash,
          algorithm: "argon2id",
          passwordChangedAt: new Date(),
        },
      },
      credentials: {
        create: { type: "password", isPrimary: true },
      },
    },
  });

  const orgLinked = await linkTenantMemberships(identity.id, legacyUserId);

  return {
    legacyUserId,
    identityId: identity.id,
    email: identity.email,
    created: true,
    orgLinked,
  };
}

async function linkTenantMemberships(
  identityId: string,
  legacyUserId: number
): Promise<number> {
  const rows = await prisma.tenant_users.findMany({
    where: { user_id: legacyUserId },
    include: { tenants: true },
  });
  let linked = 0;
  for (const row of rows) {
    let org = await prisma.iamOrganization.findFirst({
      where: { legacyTenantId: row.tenant_id },
    });
    if (!org) {
      const slugBase =
        row.tenants.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .slice(0, 80) || `tenant-${row.tenant_id.slice(0, 8)}`;
      org = await prisma.iamOrganization.create({
        data: {
          name: row.tenants.display_name || row.tenants.name,
          slug: `${slugBase}-${Date.now().toString(36)}`,
          status: row.tenants.is_active ? "active" : "suspended",
          legacyTenantId: row.tenant_id,
        },
      });
      await seedOrgSystemRoles(org.id);
    }

    const roleKey = row.is_default ? "org_admin" : "member";
    const role = await prisma.iamRole.findFirst({
      where: { organizationId: org.id, key: roleKey },
    });

    await prisma.iamOrganizationMembership.upsert({
      where: {
        identityId_organizationId: {
          identityId,
          organizationId: org.id,
        },
      },
      create: {
        identityId,
        organizationId: org.id,
        roleId: role?.id ?? null,
        status: "active",
        isDefault: row.is_default,
        joinedAt: new Date(),
      },
      update: {
        status: "active",
        isDefault: row.is_default,
        roleId: role?.id ?? undefined,
      },
    });
    linked += 1;
  }
  return linked;
}

/**
 * Batch migrate all active legacy users.
 * Passwords are randomized — users must use forgot-password unless plain map provided.
 */
export async function migrateAllLegacyUsers(options?: {
  limit?: number;
}): Promise<{ migrated: number; results: MigrateUserResult[] }> {
  const users = await prisma.user.findMany({
    where: { is_active: true },
    take: options?.limit,
    orderBy: { id: "asc" },
  });
  const results: MigrateUserResult[] = [];
  for (const u of users) {
    const r = await migrateLegacyUser(u.id);
    results.push(r);
  }
  return { migrated: results.length, results };
}

/** Verify a bcrypt password still works (for optional live re-hash on first login) */
export async function verifyLegacyBcrypt(
  plain: string,
  hashed: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hashed);
  } catch {
    return false;
  }
}
