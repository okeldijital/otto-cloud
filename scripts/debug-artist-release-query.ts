/**
 * Debug script: progressive filter removal for Artists & Releases APIs
 * Run: npx tsx scripts/debug-artist-release-query.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({ log: ["warn", "error"] });
const DEFAULT_ORG = "00000000-0000-0000-0000-000000000001";

const includeMemberships = {
  artist_memberships_artist_memberships_group_idToartists: {
    include: {
      artists_artist_memberships_member_idToartists: true,
    },
  },
};

function serializeArtist(artist: any) {
  if (!artist) return null;
  const data: any = {
    id: artist.id,
    artist_id: artist.artist_id,
    name: artist.name,
    aka: artist.aka,
    artist_kind: artist.artist_kind || "solo",
    display_name: artist.display_name,
    nationality: artist.nationality,
    id_number: artist.id_number,
    ipi_number: artist.ipi_number,
    contact_email: artist.contact_email,
    contact_phone: artist.contact_phone,
    physical_address: artist.physical_address,
    banking_details: artist.banking_details,
    profile_image_url: artist.profile_image_url,
    streaming_links: artist.streaming_links,
    social_media: artist.social_media,
    label_id: artist.label_id,
    publisher_id: artist.publisher_id,
    pro_id: artist.pro_id,
    legal_name: artist.legal_name,
    created_at: artist.created_at,
    updated_at: artist.updated_at,
  };
  const memberships =
    artist.artist_memberships_artist_memberships_group_idToartists || [];
  if ((artist.artist_kind || "solo") === "group") {
    const members = memberships
      .filter((m: any) => m.artists_artist_memberships_member_idToartists)
      .map((m: any) => ({
        id: m.artists_artist_memberships_member_idToartists.id,
        name: m.artists_artist_memberships_member_idToartists.name,
        role: m.role,
      }));
    data.members = members;
    data.member_count = members.length;
  } else {
    data.members = null;
    data.member_count = 0;
  }
  return data;
}

async function main() {
  console.log("========== PHASE 1: QUERY COMPARISON (static) ==========");
  console.log(`
Tracks list:   findMany({ skip, take, include: { track_releases } })  // NO org, NO soft-delete
Labels list:   findMany({ skip, take, orderBy: name })                // NO org
Publishers:    findMany({ skip, take, orderBy: name })                // NO org
Artists list:  findMany({ where: { organization_id: orgId }, include: memberships })
Releases list: findMany({ where: { organization_id: orgId, is_deleted: false }, orderBy: created_at desc })
`);

  console.log("========== PHASE 2: ARTIST PROGRESSIVE FILTERS ==========");
  const artistSteps: Array<{ label: string; where: any; include?: any }> = [
    { label: "Original (org filter)", where: { organization_id: DEFAULT_ORG }, include: includeMemberships },
    { label: "Without organization filter", where: {}, include: includeMemberships },
    { label: "With is_deleted:false", where: { organization_id: DEFAULT_ORG, is_deleted: false } },
    { label: "Without any filters", where: {} },
    { label: "Wrong org UUID", where: { organization_id: "00000000-0000-0000-0000-000000000099" } },
    { label: "Empty string org", where: { organization_id: "" } },
  ];

  for (const step of artistSteps) {
    try {
      const total = await prisma.artists.count({ where: step.where });
      const items = await prisma.artists.findMany({
        where: step.where,
        take: 5,
        ...(step.include ? { include: step.include } : {}),
      });
      console.log(`  ${step.label}: total=${total}, sample=${items.length}`);
    } catch (e: any) {
      console.log(`  ${step.label}: ERROR — ${e.message?.split("\n")[0]}`);
    }
  }

  // Full list path as API does
  try {
    const where = { organization_id: DEFAULT_ORG };
    const artists = await prisma.artists.findMany({
      where,
      skip: 0,
      take: 100,
      include: includeMemberships,
    });
    const serialized = artists.map(serializeArtist);
    JSON.stringify({ total: artists.length, items: serialized }); // ensure serializable
    console.log(`  Full API path (serialize 100): OK, items=${serialized.length}`);
  } catch (e: any) {
    console.log(`  Full API path FAILED: ${e.message}`);
  }

  console.log("\n========== PHASE 3: RELEASE PROGRESSIVE FILTERS ==========");
  const releaseSteps: Array<{ label: string; where: any }> = [
    { label: "Original (org + is_deleted:false)", where: { organization_id: DEFAULT_ORG, is_deleted: false } },
    { label: "Without organization filter", where: { is_deleted: false } },
    { label: "Without is_deleted", where: { organization_id: DEFAULT_ORG } },
    { label: "Without any filters", where: {} },
    { label: "is_deleted:true only", where: { is_deleted: true } },
    { label: "Wrong org UUID", where: { organization_id: "00000000-0000-0000-0000-000000000099", is_deleted: false } },
    { label: "Empty string org", where: { organization_id: "", is_deleted: false } },
    { label: "artist_id not null", where: { artist_id: { not: null }, is_deleted: false } },
    { label: "artist_id null", where: { artist_id: null, is_deleted: false } },
  ];

  for (const step of releaseSteps) {
    try {
      const total = await prisma.releases.count({ where: step.where });
      console.log(`  ${step.label}: total=${total}`);
    } catch (e: any) {
      console.log(`  ${step.label}: ERROR — ${e.message?.split("\n")[0]}`);
    }
  }

  // Simulate enrichment for first 3 releases (API N+1 path)
  try {
    const releases = await prisma.releases.findMany({
      where: { organization_id: DEFAULT_ORG, is_deleted: false },
      take: 3,
      orderBy: { created_at: "desc" },
    });
    const enriched = await Promise.all(
      releases.map(async (r) => {
        const tracks = await prisma.tracks.findMany({ where: { release_id: r.id } });
        const trackIds = tracks.map((t) => t.id);
        let hasContract = !!(await prisma.contract_assets.findFirst({
          where: { asset_type: "Release", asset_id: r.id },
        }));
        if (!hasContract && trackIds.length) {
          hasContract = !!(await prisma.contract_assets.findFirst({
            where: { asset_type: "Track", asset_id: { in: trackIds } },
          }));
        }
        const artistIdList: number[] = [];
        if (r.artist_id) artistIdList.push(r.artist_id);
        if (Array.isArray(r.artist_ids)) artistIdList.push(...(r.artist_ids as number[]));
        const hasArtistContract =
          artistIdList.length > 0
            ? !!(await prisma.contract_parties.findFirst({
                where: { entity_type: "Artist", entity_id: { in: artistIdList } },
              }))
            : false;
        return { ...r, _tracks: tracks, _hasContract: hasContract, _hasArtistContract: hasArtistContract };
      })
    );
    JSON.stringify({ total: enriched.length, items: enriched });
    console.log(`  Enrichment path (sample 3): OK, items=${enriched.length}`);
  } catch (e: any) {
    console.log(`  Enrichment path FAILED: ${e.message}`);
    console.log(e.stack?.split("\n").slice(0, 6).join("\n"));
  }

  // Full enrichment of all matching releases (what list page does)
  try {
    const t0 = Date.now();
    const releases = await prisma.releases.findMany({
      where: { organization_id: DEFAULT_ORG, is_deleted: false },
      skip: 0,
      take: 100,
      orderBy: { created_at: "desc" },
    });
    const enriched = await Promise.all(
      releases.map(async (r) => {
        const tracks = await prisma.tracks.findMany({ where: { release_id: r.id } });
        return { id: r.id, title: r.title, trackCount: tracks.length };
      })
    );
    console.log(
      `  Full list + tracks N+1 (100 max): items=${enriched.length}, ms=${Date.now() - t0}`
    );
  } catch (e: any) {
    console.log(`  Full list N+1 FAILED: ${e.message}`);
  }

  console.log("\n========== PHASE 4: SAMPLE ROWS ==========");
  const sampleArtists = await prisma.$queryRawUnsafe<any[]>(`
    SELECT id, name, organization_id::text AS organization_id, is_deleted,
           artist_kind, tenant_id::text AS tenant_id, label_id, publisher_id
    FROM artists ORDER BY id LIMIT 5
  `);
  console.log("Artists sample:", JSON.stringify(sampleArtists, null, 2));

  const sampleReleases = await prisma.$queryRawUnsafe<any[]>(`
    SELECT id, title, organization_id::text AS organization_id, is_deleted,
           artist_id, release_type, tenant_id::text AS tenant_id, label_id,
           artist_ids
    FROM releases ORDER BY id LIMIT 5
  `);
  console.log("Releases sample:", JSON.stringify(sampleReleases, null, 2));

  // Tenant IDs used as org filter?
  const tenants = await prisma.$queryRawUnsafe<any[]>(
    `SELECT id::text AS id, name FROM tenants`
  );
  console.log("\nTenants (if used as organization_id → always 0):");
  for (const t of tenants) {
    const a = await prisma.artists.count({ where: { organization_id: t.id } });
    const r = await prisma.releases.count({
      where: { organization_id: t.id, is_deleted: false },
    });
    console.log(`  ${t.name} ${t.id}: artists=${a}, releases=${r}`);
  }

  // Users
  const users = await prisma.$queryRawUnsafe<any[]>(`
    SELECT id, email, organization_id::text AS organization_id,
           tenant_id::text AS tenant_id, role
    FROM users
  `);
  console.log("\nUsers (session org source):", JSON.stringify(users, null, 2));

  console.log("\n========== ROOT CAUSE SUMMARY ==========");
  console.log(`
With correct org UUID (${DEFAULT_ORG}):
  - Artists API filter returns 141 rows
  - Releases API filter returns 99 rows

With WRONG org UUID or tenant UUID as organization_id:
  - Artists → 0
  - Releases → 0

is_deleted is NOT the primary killer (99/111 releases pass is_deleted:false).
artist_id is NOT filtered by the list query (95 of 111 have null artist_id).

Tracks/Labels/Publishers work because they apply NO organization_id filter.
Artists/Releases fail when session.user.organization_id does not equal row.organization_id.
`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
