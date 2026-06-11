const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const PLANS = [
  {
    name: "Trial",
    description: "Free 14-day trial with limited features.",
    price: 0,
    job_limit: 10,
    max_team_members: 1,
    max_storage_mb: 100,
    ai_enabled: false,
    reports_enabled: false,
    advanced_contracts: false,
    stripe_price_id: null,
  },
  {
    name: "Solo",
    description: "For independent artists and sole operators.",
    price: 19,
    job_limit: 100,
    max_team_members: 1,
    max_storage_mb: 500,
    ai_enabled: true,
    reports_enabled: false,
    advanced_contracts: false,
    stripe_price_id: null,
  },
  {
    name: "Professional",
    description: "For growing labels and teams.",
    price: 49,
    job_limit: 500,
    max_team_members: 5,
    max_storage_mb: 2000,
    ai_enabled: true,
    reports_enabled: true,
    advanced_contracts: true,
    stripe_price_id: null,
  },
  {
    name: "Enterprise",
    description: "Unlimited everything for established organizations.",
    price: 199,
    job_limit: 99999,
    max_team_members: 999,
    max_storage_mb: 50000,
    ai_enabled: true,
    reports_enabled: true,
    advanced_contracts: true,
    stripe_price_id: null,
  },
];

async function main() {
  for (const plan of PLANS) {
    const existing = await prisma.plans.findUnique({ where: { name: plan.name } });
    if (existing) {
      await prisma.plans.update({ where: { name: plan.name }, data: plan });
      console.log(`Updated plan: ${plan.name}`);
    } else {
      await prisma.plans.create({ data: plan });
      console.log(`Created plan: ${plan.name}`);
    }
  }
  console.log("Plan seeding complete.");
}

main().finally(() => prisma.$disconnect());
