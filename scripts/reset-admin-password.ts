import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

interface ResetOptions {
  email: string;
  password: string;
}

function parseArgs(): ResetOptions {
  const args = process.argv.slice(2);
  const options: Partial<ResetOptions> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--email" && args[i + 1]) {
      options.email = args[++i];
    } else if (arg === "--password" && args[i + 1]) {
      options.password = args[++i];
    }
  }

  if (!options.email) {
    console.error("Error: --email is required");
    console.error("Usage: tsx scripts/reset-admin-password.ts --email <email> --password <password>");
    process.exit(1);
  }

  if (!options.password) {
    console.error("Error: --password is required");
    console.error("Usage: tsx scripts/reset-admin-password.ts --email <email> --password <password>");
    process.exit(1);
  }

  return options as ResetOptions;
}

async function resetAdminPassword() {
  const { email, password } = parseArgs();

  try {
    await prisma.$connect();
    console.log("Connected to database\n");

    const user = await prisma.user.findFirst({
      where: { email },
      select: {
        id: true,
        email: true,
        is_active: true,
        role: true,
        hashed_password: true,
        organization_id: true,
        tenant_id: true,
      },
    });

    if (!user) {
      console.error(`Error: User with email "${email}" not found.`);
      await prisma.$disconnect();
      process.exit(1);
    }

    console.log(`Found user: ${user.email}`);
    console.log(`  id: ${user.id}`);
    console.log(`  role: ${user.role}`);
    console.log(`  active: ${user.is_active}`);
    console.log("");

    const previousHash = user.hashed_password;

    const newHash = await bcrypt.hash(password, 10);

    const verifyResult = await bcrypt.compare(password, newHash);
    if (!verifyResult) {
      console.error("Error: Internal verification failed. The generated hash does not match the supplied password.");
      await prisma.$disconnect();
      process.exit(1);
    }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        hashed_password: newHash,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        email: true,
        hashed_password: true,
        updatedAt: true,
      },
    });

    const postUpdateVerify = await bcrypt.compare(password, updatedUser.hashed_password);
    if (!postUpdateVerify) {
      console.error("Error: Post-update verification failed. Rolling back...");
      try {
        await prisma.user.update({
          where: { id: user.id },
          data: { hashed_password: previousHash },
        });
        console.log("Rollback successful. Original hash restored.");
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError);
      }
      await prisma.$disconnect();
      process.exit(1);
    }

    console.log("Password reset successful.\n");
    console.log("Email:");
    console.log(`${updatedUser.email}`);
    console.log("");
    console.log("Verification:");
    console.log("PASS");

    await prisma.$disconnect();
  } catch (error: any) {
    console.error("Error:", error.message);
    await prisma.$disconnect();
    process.exit(1);
  }
}

resetAdminPassword();
