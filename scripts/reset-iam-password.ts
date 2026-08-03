/**
 * Set/replace an IAM identity password (Argon2id).
 *
 * Usage:
 *   npx tsx scripts/reset-iam-password.ts --email you@example.com --password 'YourNewStr0ng!Pass'
 *
 * Requires DATABASE_URL (Neon/Postgres). Loads .env if present via process env.
 *
 * Also clears lockout / mustChangePassword and bumps sessionVersion
 * so old sessions stop working.
 */

import { PrismaClient } from "@prisma/client";
import { hash } from "@node-rs/argon2";
import { createHash } from "crypto";

const prisma = new PrismaClient();

const ARGON2_OPTIONS = {
  algorithm: 2 as const,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
  outputLen: 32,
};

function parseArgs() {
  const args = process.argv.slice(2);
  let email = "";
  let password = "";
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--email" && args[i + 1]) email = args[++i];
    else if (args[i] === "--password" && args[i + 1]) password = args[++i];
  }
  if (!email || !password) {
    console.error(
      "Usage: npx tsx scripts/reset-iam-password.ts --email <email> --password <password>"
    );
    process.exit(1);
  }
  if (password.length < 12) {
    console.error("Password must be at least 12 characters.");
    process.exit(1);
  }
  return { email: email.trim(), password };
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function main() {
  const { email, password } = parseArgs();
  const emailNormalized = normalizeEmail(email);

  if (!process.env.DATABASE_URL) {
    console.error(
      "DATABASE_URL is not set. Export it or put it in the environment (e.g. from Neon / Vercel)."
    );
    process.exit(1);
  }

  const identity = await prisma.iamIdentity.findUnique({
    where: { emailNormalized },
    include: { passwordCreds: true },
  });

  if (!identity) {
    console.error(
      `No IAM identity found for "${email}".\n` +
        "Check the email, or create an account / run migrate-legacy-auth first."
    );
    process.exit(1);
  }

  const passwordHash = await hash(password, ARGON2_OPTIONS);
  const cred = identity.passwordCreds[0];

  if (cred) {
    // Keep previous hash in history (best-effort)
    try {
      await prisma.iamPasswordHistory.create({
        data: {
          identityId: identity.id,
          credentialId: cred.id,
          passwordHash: cred.passwordHash,
        },
      });
    } catch {
      /* ignore */
    }
    await prisma.iamPasswordCredential.update({
      where: { id: cred.id },
      data: {
        passwordHash,
        algorithm: "argon2id",
        passwordChangedAt: new Date(),
      },
    });
  } else {
    await prisma.iamPasswordCredential.create({
      data: {
        identityId: identity.id,
        passwordHash,
        algorithm: "argon2id",
        passwordChangedAt: new Date(),
      },
    });
  }

  await prisma.iamIdentity.update({
    where: { id: identity.id },
    data: {
      status: identity.status === "locked" ? "active" : identity.status,
      failedLoginCount: 0,
      lockedUntil: null,
      mustChangePassword: false,
      mustChangePasswordReason: null,
      sessionVersion: { increment: 1 },
    },
  });

  // Revoke all sessions so old cookies die
  await prisma.iamSession.updateMany({
    where: { identityId: identity.id, revokedAt: null },
    data: { revokedAt: new Date(), revokeReason: "password_reset_script" },
  });
  await prisma.iamRefreshToken.updateMany({
    where: { identityId: identity.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  console.log("IAM password updated successfully.");
  console.log(`  email: ${identity.email}`);
  console.log(`  identityId: ${identity.id}`);
  console.log("  sessions: revoked");
  console.log("\nSign in at /auth/login with the new password.");
  console.log(
    "(Hash fingerprint for ops only:",
    createHash("sha256").update(passwordHash).digest("hex").slice(0, 12) + "…)"
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
