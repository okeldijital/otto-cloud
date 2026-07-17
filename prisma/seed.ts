import { PrismaClient } from "@prisma/client";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";
import { seedIAM } from "./seed-iam";

const prisma = new PrismaClient();

interface SeedConfig {
  adminName: string;
  adminEmail: string;
  adminPassword: string;
  organizationName: string;
}

function loadEnvConfig(): SeedConfig {
  const adminName = process.env.INITIAL_ADMIN_NAME || "";
  const adminEmail = process.env.INITIAL_ADMIN_EMAIL || "";
  const adminPassword = process.env.INITIAL_ADMIN_PASSWORD || "";
  const organizationName = process.env.INITIAL_ORG_NAME || "Otto Records";

  const missing: string[] = [];
  if (!adminName) missing.push("INITIAL_ADMIN_NAME");
  if (!adminEmail) missing.push("INITIAL_ADMIN_EMAIL");
  if (!adminPassword) missing.push("INITIAL_ADMIN_PASSWORD");

  if (missing.length > 0) {
    console.error(`Missing required environment variables: ${missing.join(", ")}`);
    console.error("\nPlease set the following environment variables:");
    console.error("  INITIAL_ADMIN_NAME=Admin Name");
    console.error("  INITIAL_ADMIN_EMAIL=admin@example.com");
    console.error("  INITIAL_ADMIN_PASSWORD=secure-password");
    console.error("\nOptional:");
    console.error("  INITIAL_ORG_NAME=My Organization");
    process.exit(1);
  }

  return { adminName, adminEmail, adminPassword, organizationName };
}

async function seedTenant(): Promise<string> {
  const tenantId = uuidv4();

  await prisma.tenants.upsert({
    where: { id: tenantId },
    update: {},
    create: {
      id: tenantId,
      name: "Otto",
      display_name: "Otto",
      org_type: "platform",
      is_active: true,
    },
  });
  console.log("  Tenant: Otto");
  return tenantId;
}

async function seedOrganization(): Promise<number> {
  const existing = await prisma.organizations.findFirst();
  if (existing) {
    console.log(`  Organization: ${existing.name} (existing)`);
    return existing.id;
  }

  const org = await prisma.organizations.create({
    data: {
      name: "Otto Records",
      org_type: "record_label",
      organization_id: 1,
    },
  });
  console.log("  Organization: Otto Records");
  return org.id;
}

async function seedAdminUser(config: SeedConfig, tenantId: string): Promise<{ user: any }> {
  const hashedPassword = await bcrypt.hash(config.adminPassword, 10);

  const user = await prisma.user.upsert({
    where: { email: config.adminEmail },
    update: {},
    create: {
      email: config.adminEmail,
      hashed_password: hashedPassword,
      name: config.adminName,
      organization_id: tenantId,
      tenant_id: tenantId,
      is_active: true,
      is_superuser: true,
      role: "Super Administrator",
    },
  });

  await prisma.tenant_users.upsert({
    where: {
      tenant_id_user_id: { tenant_id: tenantId, user_id: user.id },
    },
    update: { is_default: true, accepted_at: new Date() },
    create: {
      tenant_id: tenantId,
      user_id: user.id,
      is_default: true,
      invited_at: new Date(),
      accepted_at: new Date(),
    },
  });

  await prisma.tenants.update({
    where: { id: tenantId },
    data: { owner_id: user.id },
  });

  console.log(`  Administrator: ${user.email}`);
  return { user };
}

async function seedSuperAdminRole(userId: number, tenantId: string): Promise<void> {
  const role = await prisma.roles.findFirst({
    where: { name: "Super Administrator" },
  });

  if (!role) {
    console.warn("  Super Administrator role not found — run IAM seed first");
    return;
  }

  await prisma.user_roles.upsert({
    where: {
      user_id_role_id: { user_id: userId, role_id: role.id },
    },
    update: {},
    create: {
      user_id: userId,
      role_id: role.id,
    },
  });

  console.log("  Role: Super Administrator assigned");
}

export async function seedCloud(): Promise<void> {
  console.log("\nOtto Cloud — Environment Initialization");
  console.log("=".repeat(50));

  const config = loadEnvConfig();

  await prisma.$connect();
  console.log("Connected to database");

  await seedIAM();

  const tenantId = await seedTenant();
  const { user } = await seedAdminUser(config, tenantId);
  const orgId = await seedOrganization();
  await seedSuperAdminRole(user.id, tenantId);

  await prisma.$disconnect();

  console.log("\n" + "=".repeat(50));
  console.log("Seed Summary:");
  console.log(`  Tenant: Otto`);
  console.log(`  Organization: ${config.organizationName} (id=${orgId})`);
  console.log(`  Administrator: ${user.email}`);
  console.log(`  Role: Super Administrator`);
  console.log("\nStatus: Ready for asset migration");
  console.log("=".repeat(50) + "\n");
}

if (require.main === module) {
  seedCloud()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
