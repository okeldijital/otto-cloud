import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const BUILTIN_PLAYBOOKS = [
  {
    name: "Single Release",
    slug: "single-release",
    description: "Standard workflow for a single track release",
    release_type: "Single",
    icon: "Music",
    color: "#10b981",
    tasks: [
      { title: "Confirm final mix", section: "Production", department: "Production", priority: "high", sort_order: 0, days_before_release: 21 },
      { title: "Master track", section: "Production", department: "Production", priority: "high", sort_order: 1, days_before_release: 18 },
      { title: "Design cover artwork", section: "Artwork", department: "Artwork", priority: "high", sort_order: 2, days_before_release: 18 },
      { title: "Create Spotify Canvas", section: "Artwork", department: "Artwork", priority: "medium", sort_order: 3, days_before_release: 14 },
      { title: "Write press release", section: "Marketing", department: "Marketing", priority: "medium", sort_order: 4, days_before_release: 14 },
      { title: "Create social media countdown", section: "Marketing", department: "Marketing", priority: "medium", sort_order: 5, days_before_release: 10 },
      { title: "Submit to DSPs", section: "Distribution", department: "Distribution", priority: "high", sort_order: 6, days_before_release: 14 },
      { title: "Verify DSP metadata", section: "Distribution", department: "Distribution", priority: "high", sort_order: 7, days_before_release: 7 },
      { title: "Submit ISRC codes", section: "Metadata", department: "Production", priority: "high", sort_order: 8, days_before_release: 21 },
      { title: "Submit UPC code", section: "Metadata", department: "Production", priority: "high", sort_order: 9, days_before_release: 21 },
    ],
    milestones: [
      { name: "Master Delivered", section: "Production", sort_order: 0, days_before_release: 18 },
      { name: "Artwork Finalized", section: "Artwork", sort_order: 1, days_before_release: 14 },
      { name: "Marketing Campaign Launched", section: "Marketing", sort_order: 2, days_before_release: 10 },
      { name: "Distribution Submitted", section: "Distribution", sort_order: 3, days_before_release: 14 },
      { name: "Release Day", section: "Launch", sort_order: 4, days_before_release: 0 },
    ],
    deliverables: [
      { name: "Master WAV", deliverable_type: "audio", sort_order: 0, days_before_release: 18 },
      { name: "Cover Artwork (3000x3000)", deliverable_type: "image", sort_order: 1, days_before_release: 14 },
      { name: "Spotify Canvas", deliverable_type: "video", sort_order: 2, days_before_release: 10 },
      { name: "Press Kit (EPK)", deliverable_type: "document", sort_order: 3, days_before_release: 10 },
      { name: "Lyrics Sheet", deliverable_type: "document", sort_order: 4, days_before_release: 7 },
      { name: "ISRC Certificate", deliverable_type: "document", sort_order: 5, days_before_release: 21 },
    ],
    approvals: [
      { name: "Master Approval", item_type: "audio", sort_order: 0, days_before_release: 17 },
      { name: "Artwork Approval", item_type: "image", sort_order: 1, days_before_release: 13 },
      { name: "Marketing Materials Approval", item_type: "document", sort_order: 2, days_before_release: 10 },
      { name: "Final Metadata Review", item_type: "metadata", sort_order: 3, days_before_release: 5 },
    ],
  },
  {
    name: "EP Release",
    slug: "ep-release",
    description: "Workflow for an extended play release",
    release_type: "EP",
    icon: "Disc",
    color: "#f59e0b",
    tasks: [
      { title: "Final mix all tracks", section: "Production", department: "Production", priority: "high", sort_order: 0, days_before_release: 30 },
      { title: "Master all tracks", section: "Production", department: "Production", priority: "high", sort_order: 1, days_before_release: 25 },
      { title: "Design EP artwork & booklet", section: "Artwork", department: "Artwork", priority: "high", sort_order: 2, days_before_release: 25 },
      { title: "Create track visualizers", section: "Videos", department: "Marketing", priority: "medium", sort_order: 3, days_before_release: 14 },
      { title: "Write EP press release", section: "Marketing", department: "Marketing", priority: "medium", sort_order: 4, days_before_release: 21 },
      { title: "Submit to DSPs", section: "Distribution", department: "Distribution", priority: "high", sort_order: 5, days_before_release: 21 },
      { title: "Verify track metadata & credits", section: "Metadata", department: "Production", priority: "high", sort_order: 6, days_before_release: 14 },
    ],
    milestones: [
      { name: "All Tracks Mastered", section: "Production", sort_order: 0, days_before_release: 25 },
      { name: "Artwork & Booklet Finalized", section: "Artwork", sort_order: 1, days_before_release: 21 },
      { name: "Marketing Campaign Launched", section: "Marketing", sort_order: 2, days_before_release: 14 },
      { name: "Release Day", section: "Launch", sort_order: 3, days_before_release: 0 },
    ],
    deliverables: [
      { name: "All Master WAVs", deliverable_type: "audio", sort_order: 0, days_before_release: 25 },
      { name: "EP Cover Artwork", deliverable_type: "image", sort_order: 1, days_before_release: 21 },
      { name: "Track listing & Credits", deliverable_type: "document", sort_order: 2, days_before_release: 14 },
      { name: "Lyrics for all tracks", deliverable_type: "document", sort_order: 3, days_before_release: 10 },
    ],
    approvals: [
      { name: "All Masters Approved", item_type: "audio", sort_order: 0, days_before_release: 24 },
      { name: "Artwork & Design Approved", item_type: "image", sort_order: 1, days_before_release: 20 },
      { name: "Metadata & Credits Approved", item_type: "metadata", sort_order: 2, days_before_release: 10 },
    ],
  },
  {
    name: "Album Release",
    slug: "album-release",
    description: "Complete album release workflow",
    release_type: "Album",
    icon: "Disc3",
    color: "#3b82f6",
    tasks: [
      { title: "Final mix all tracks", section: "Production", department: "Production", priority: "high", sort_order: 0, days_before_release: 60 },
      { title: "Master all tracks", section: "Production", department: "Production", priority: "high", sort_order: 1, days_before_release: 45 },
      { title: "Design album artwork & booklet", section: "Artwork", department: "Artwork", priority: "high", sort_order: 2, days_before_release: 45 },
      { title: "Create album trailer", section: "Videos", department: "Marketing", priority: "medium", sort_order: 3, days_before_release: 30 },
      { title: "Create lyric videos for singles", section: "Videos", department: "Marketing", priority: "medium", sort_order: 4, days_before_release: 21 },
      { title: "Album press campaign", section: "Marketing", department: "Marketing", priority: "high", sort_order: 5, days_before_release: 30 },
      { title: "Pre-save campaign setup", section: "Marketing", department: "Marketing", priority: "high", sort_order: 6, days_before_release: 28 },
      { title: "Submit to DSPs (album)", section: "Distribution", department: "Distribution", priority: "high", sort_order: 7, days_before_release: 30 },
      { title: "Track-by-track metadata", section: "Metadata", department: "Production", priority: "high", sort_order: 8, days_before_release: 21 },
      { title: "Copyright & publishing registration", section: "Metadata", department: "Legal", priority: "high", sort_order: 9, days_before_release: 45 },
    ],
    milestones: [
      { name: "All Tracks Mastered", section: "Production", sort_order: 0, days_before_release: 45 },
      { name: "Album Artwork Finalized", section: "Artwork", sort_order: 1, days_before_release: 35 },
      { name: "Lead Single Released", section: "Marketing", sort_order: 2, days_before_release: 21 },
      { name: "Album Distributed to DSPs", section: "Distribution", sort_order: 3, days_before_release: 21 },
      { name: "Album Release Day", section: "Launch", sort_order: 4, days_before_release: 0 },
    ],
    deliverables: [
      { name: "All Master WAVs", deliverable_type: "audio", sort_order: 0, days_before_release: 45 },
      { name: "Album Cover Artwork (3000x3000)", deliverable_type: "image", sort_order: 1, days_before_release: 35 },
      { name: "Album Booklet / Liner Notes", deliverable_type: "document", sort_order: 2, days_before_release: 28 },
      { name: "Complete Lyric Sheets", deliverable_type: "document", sort_order: 3, days_before_release: 21 },
      { name: "Press Kit & Bio", deliverable_type: "document", sort_order: 4, days_before_release: 28 },
      { name: "Album Trailer", deliverable_type: "video", sort_order: 5, days_before_release: 14 },
      { name: "Copyright Registrations", deliverable_type: "document", sort_order: 6, days_before_release: 45 },
    ],
    approvals: [
      { name: "All Tracks Master Approval", item_type: "audio", sort_order: 0, days_before_release: 44 },
      { name: "Album Artwork Approval", item_type: "image", sort_order: 1, days_before_release: 34 },
      { name: "Marketing Campaign Approval", item_type: "campaign", sort_order: 2, days_before_release: 21 },
      { name: "Full Album Metadata Review", item_type: "metadata", sort_order: 3, days_before_release: 14 },
    ],
  },
];

async function main() {
  console.log("Seeding built-in release playbooks...");

  const orgId = "00000000-0000-0000-0000-000000000001";

  for (const pb of BUILTIN_PLAYBOOKS) {
    const existing = await prisma.release_playbooks.findFirst({
      where: { organization_id: orgId, slug: pb.slug },
    });

    if (existing) {
      console.log(`  Playbook "${pb.name}" already exists, skipping.`);
      continue;
    }

    const playbook = await prisma.release_playbooks.create({
      data: {
        name: pb.name,
        slug: pb.slug,
        description: pb.description,
        release_type: pb.release_type,
        icon: pb.icon,
        color: pb.color,
        is_built_in: true,
        organization_id: orgId,
        playbook_tasks: { create: pb.tasks.map((t) => ({ ...t, organization_id: orgId })) },
        playbook_milestones: { create: pb.milestones.map((m) => ({ ...m, organization_id: orgId })) },
        playbook_deliverables: { create: pb.deliverables.map((d) => ({ ...d, organization_id: orgId })) },
        playbook_approvals: { create: pb.approvals.map((a) => ({ ...a, organization_id: orgId })) },
      },
    });

    console.log(`  Created playbook "${playbook.name}" with ${pb.tasks.length} tasks, ${pb.milestones.length} milestones, ${pb.deliverables.length} deliverables, ${pb.approvals.length} approvals.`);
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
