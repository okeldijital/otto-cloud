import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const RELEASE_FIELDS = [
  { field_key: "release_date", label: "Release Date", field_type: "date", section_slug: "metadata", is_required: true, sort_order: 0 },
  { field_key: "upc_code", label: "UPC Code", field_type: "string", section_slug: "metadata", placeholder: "Enter 12-digit UPC", sort_order: 1 },
  { field_key: "isrc_code", label: "ISRC Code", field_type: "string", section_slug: "metadata", placeholder: "e.g. US-SM1-24-00001", sort_order: 2 },
  { field_key: "catalog_number", label: "Catalog Number", field_type: "string", section_slug: "metadata", placeholder: "e.g. OTO-001", sort_order: 3 },
  { field_key: "label_name", label: "Label Name", field_type: "string", section_slug: "metadata", sort_order: 4 },
  { field_key: "primary_genre", label: "Primary Genre", field_type: "select", section_slug: "metadata", options: JSON.stringify(["Pop", "Hip Hop", "R&B", "Electronic", "Rock", "Jazz", "Classical", "Afrobeats", "Amapiano", "Dancehall", "Reggae", "Soul", "Country", "Latin", "Other"]), sort_order: 5 },
  { field_key: "secondary_genre", label: "Secondary Genre", field_type: "select", section_slug: "metadata", options: JSON.stringify(["Pop", "Hip Hop", "R&B", "Electronic", "Rock", "Jazz", "Classical", "Afrobeats", "Amapiano", "Dancehall", "Reggae", "Soul", "Country", "Latin", "Other"]), sort_order: 6 },
  { field_key: "language", label: "Language", field_type: "string", section_slug: "metadata", placeholder: "e.g. English", sort_order: 7 },
  { field_key: "explicit_content", label: "Explicit Content", field_type: "boolean", section_slug: "metadata", sort_order: 8 },
  { field_key: "copyright", label: "Copyright", field_type: "string", section_slug: "metadata", placeholder: "e.g. © 2025 Label Name", sort_order: 9 },
  { field_key: "p_line", label: "Phonographic Copyright (P Line)", field_type: "string", section_slug: "metadata", placeholder: "e.g. ℗ 2025 Label Name", sort_order: 10 },
  { field_key: "release_notes", label: "Release Notes", field_type: "text", section_slug: "metadata", placeholder: "Internal notes about this release", sort_order: 11 },
];

const ARTIST_FIELDS = [
  { field_key: "stage_name", label: "Stage Name", field_type: "string", section_slug: "overview", is_required: true, sort_order: 0 },
  { field_key: "legal_name", label: "Legal Name", field_type: "string", section_slug: "overview", sort_order: 1 },
  { field_key: "biography", label: "Biography", field_type: "text", section_slug: "overview", placeholder: "Artist biography", sort_order: 2 },
  { field_key: "instagram", label: "Instagram", field_type: "string", section_slug: "overview", placeholder: "@handle", sort_order: 3 },
  { field_key: "tiktok", label: "TikTok", field_type: "string", section_slug: "overview", placeholder: "@handle", sort_order: 4 },
  { field_key: "twitter", label: "X (Twitter)", field_type: "string", section_slug: "overview", placeholder: "@handle", sort_order: 5 },
  { field_key: "youtube", label: "YouTube Channel", field_type: "string", section_slug: "overview", placeholder: "Channel URL", sort_order: 6 },
  { field_key: "website", label: "Website", field_type: "string", section_slug: "overview", placeholder: "https://", sort_order: 7 },
  { field_key: "genre", label: "Genre", field_type: "select", section_slug: "overview", options: JSON.stringify(["Pop", "Hip Hop", "R&B", "Electronic", "Rock", "Jazz", "Classical", "Afrobeats", "Amapiano", "Dancehall", "Reggae", "Soul", "Country", "Latin", "Other"]), sort_order: 8 },
  { field_key: "label", label: "Label", field_type: "string", section_slug: "overview", sort_order: 9 },
  { field_key: "country", label: "Country", field_type: "string", section_slug: "overview", sort_order: 10 },
  { field_key: "birth_date", label: "Birth Date", field_type: "date", section_slug: "overview", sort_order: 11 },
];

async function main() {
  const releaseTemplate = await prisma.workspace_templates.findUnique({ where: { slug: "release" } });
  if (releaseTemplate) {
    for (let i = 0; i < RELEASE_FIELDS.length; i++) {
      const f = RELEASE_FIELDS[i];
      await prisma.workspace_template_fields.upsert({
        where: { template_id_field_key: { template_id: releaseTemplate.id, field_key: f.field_key } },
        update: { label: f.label, field_type: f.field_type, options: f.options, is_required: f.is_required || false, placeholder: f.placeholder || null, sort_order: f.sort_order, section_slug: f.section_slug },
        create: { template_id: releaseTemplate.id, field_key: f.field_key, label: f.label, field_type: f.field_type, options: f.options, is_required: f.is_required || false, placeholder: f.placeholder || null, sort_order: f.sort_order, section_slug: f.section_slug },
      });
    }
    console.log(`Seeded ${RELEASE_FIELDS.length} fields for "release" template`);
  } else {
    console.warn('Template "release" not found — run release workspace migrations first');
  }

  const artistTemplate = await prisma.workspace_templates.findUnique({ where: { slug: "artist" } });
  if (artistTemplate) {
    for (let i = 0; i < ARTIST_FIELDS.length; i++) {
      const f = ARTIST_FIELDS[i];
      await prisma.workspace_template_fields.upsert({
        where: { template_id_field_key: { template_id: artistTemplate.id, field_key: f.field_key } },
        update: { label: f.label, field_type: f.field_type, options: f.options, is_required: f.is_required || false, placeholder: f.placeholder || null, sort_order: f.sort_order, section_slug: f.section_slug },
        create: { template_id: artistTemplate.id, field_key: f.field_key, label: f.label, field_type: f.field_type, options: f.options, is_required: f.is_required || false, placeholder: f.placeholder || null, sort_order: f.sort_order, section_slug: f.section_slug },
      });
    }
    console.log(`Seeded ${ARTIST_FIELDS.length} fields for "artist" template`);
  } else {
    console.warn('Template "artist" not found');
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => { console.error(e); prisma.$disconnect(); process.exit(1); });
