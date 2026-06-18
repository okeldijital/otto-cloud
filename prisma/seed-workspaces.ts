import { PrismaClient } from "@prisma/client";
import { WORKSPACE_TEMPLATES } from "../lib/workspace-templates";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding workspace templates...");

  for (const tpl of WORKSPACE_TEMPLATES) {
    const existing = await prisma.workspace_templates.findUnique({
      where: { slug: tpl.slug },
    });

    if (existing) {
      console.log(`  Template "${tpl.name}" already exists, skipping.`);
      continue;
    }

    const template = await prisma.workspace_templates.create({
      data: {
        name: tpl.name,
        slug: tpl.slug,
        description: tpl.description,
        icon: tpl.icon,
        color: tpl.color,
        sections: {
          create: tpl.sections.map((s) => ({
            name: s.name,
            slug: s.slug,
            description: s.description,
            icon: s.icon,
            sort_order: s.sort_order,
          })),
        },
        statuses: {
          create: tpl.statuses.map((s) => ({
            name: s.name,
            slug: s.slug,
            sort_order: s.sort_order,
            color: s.color,
          })),
        },
      },
    });

    console.log(`  Created template "${template.name}" with ${tpl.sections.length} sections and ${tpl.statuses.length} statuses.`);
  }

  console.log("Done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
