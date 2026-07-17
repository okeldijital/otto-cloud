import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const password = process.argv[2];

  if (!password) {
    console.error("Usage: tsx scripts/debug-auth.ts <plaintext-password>");
    process.exit(1);
  }

  const user = await prisma.user.findFirst({
    where: { email: "admin@otto.com" },
    select: {
      id: true,
      email: true,
      is_active: true,
      organization_id: true,
      tenant_id: true,
      role: true,
      hashed_password: true,
    },
  });

  if (!user) {
    console.log("User found: NO");
    await prisma.$disconnect();
    process.exit(1);
  }

  console.log("User found: YES");
  console.log(`  id: ${user.id}`);
  console.log(`  email: ${user.email}`);
  console.log(`  active: ${user.is_active}`);
  console.log(`  organization: ${user.organization_id}`);
  console.log(`  tenant: ${user.tenant_id}`);
  console.log(`  role: ${user.role}`);

  const hashedPassword = user.hashed_password;
  const isPasswordValid = await bcrypt.compare(password, hashedPassword);

  if (isPasswordValid) {
    console.log("Password matches: YES");
  } else {
    console.log("Password matches: NO");
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
