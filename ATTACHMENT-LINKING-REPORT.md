# Attachment Linking Report

**Generated:** 2026-07-20T09:49:39.926Z
**Mode:** APPLIED
**Catalog organizationId normalized to:** `00000000-0000-0000-0000-000000000001`

## Summary

| Metric | Count |
|--------|------:|
| Total attachments | 1120 |
| Linked before | 0 |
| Orphans before | 1120 |
| Links applied (this run) | 166 |
| Linked after | 166 |
| Remaining orphans | 954 |
| Distinct content duplicates (checksum groups) | 284 |

## Entity coverage

| Entity | With legacy URL/FK | Linked this run | Remaining orphans (global) |
|--------|-------------------:|----------------:|---------------------------:|
| Releases | 80 | 80 | see below |
| Artists | 0 | 0 | see below |
| Contracts | 4 | 4 | see below |
| Works | 0 (no FK evidence) | 0 | see below |
| Labels | 1 | 1 | see below |
| Publishers | 0 (no logo column) | 0 | see below |
| Users | 0 | 0 | see below |
| **All remaining orphans** | | | **954** |

### Links by entityType

| entityType | Attachments linked |
|------------|-------------------:|
| contract | 4 |
| label | 2 |
| release | 160 |

## Matching rules used

1. Exact basename from `releases.cover_art_url` → `originalName` / `fileName` / `storageKey`
2. Exact basename from `artists.profile_image_url`
3. Exact basename from `labels.logo_url`
4. Exact basename from `users.avatar_url`
5. `contract_documents` path/name/checksum + existing `contract_id`
6. Inventory `contracts/{folder}/…` only when decoded folder id exists in cloud `contracts`

No fuzzy title matching. No re-upload. No R2 renames. Orphans not deleted.

## Logical roles

Schema has no `role` column. Logical roles assigned in metadata only:

| Role | When |
|------|------|
| cover | release + image from cover_art_url |
| profile | artist + image from profile_image_url |
| logo | label logo_url |
| document | contract path/FK |
| avatar | user avatar_url |

## Sample links

- `cmrp53rcb001ny1a25qbv269b` → **release:1** (cover) — releases.cover_art_url basename exact match: 44d8b4c4-8ff8-4839-97bd-3bc22bbeb7e2.jpg
- `cmrp5ixh8001pgft40svo5nbj` → **release:1** (cover) — releases.cover_art_url basename exact match: 44d8b4c4-8ff8-4839-97bd-3bc22bbeb7e2.jpg
- `cmrp544dy0030y1a272wi0a0k` → **release:3** (cover) — releases.cover_art_url basename exact match: 762c42e1-3b66-4d9a-b4cf-a8f28ba33ff8.jpeg
- `cmrp5ja870030gft4oiy8p9wb` → **release:3** (cover) — releases.cover_art_url basename exact match: 762c42e1-3b66-4d9a-b4cf-a8f28ba33ff8.jpeg
- `cmrp53psf001gy1a28k8x89j7` → **release:4** (cover) — releases.cover_art_url basename exact match: 3e9a4bbe-e9dc-4cf9-9c90-5ae494a13e55.jpg
- `cmrp5ivel001ggft471bt7wsb` → **release:4** (cover) — releases.cover_art_url basename exact match: 3e9a4bbe-e9dc-4cf9-9c90-5ae494a13e55.jpg
- `cmrp55ttq00chy1a2u7na9c0e` → **release:5** (cover) — releases.cover_art_url basename exact match: e32e8061-c455-4020-a215-505acc3bc5ab.jpg
- `cmrp5kwdz00chgft4db8srztf` → **release:5** (cover) — releases.cover_art_url basename exact match: e32e8061-c455-4020-a215-505acc3bc5ab.jpg
- `cmrp53mff0017y1a26urym98v` → **release:6** (cover) — releases.cover_art_url basename exact match: 3116d0f9-ce7e-400a-927d-22c5ff6b1e77.jpg
- `cmrp5isv00017gft4sedgbed8` → **release:6** (cover) — releases.cover_art_url basename exact match: 3116d0f9-ce7e-400a-927d-22c5ff6b1e77.jpg
- `cmrp53ewm000iy1a2ggr86o8d` → **release:7** (cover) — releases.cover_art_url basename exact match: 0d579a25-50eb-4211-90be-d621823d0062.jpg
- `cmrp5ikgw000egft411qjb3gj` → **release:7** (cover) — releases.cover_art_url basename exact match: 0d579a25-50eb-4211-90be-d621823d0062.jpg
- `cmrp53rtv001py1a2wmt3dcba` → **release:8** (cover) — releases.cover_art_url basename exact match: 3feee91e-2b1b-4570-a84f-43a750ed6f1a.jpg
- `cmrp5ix7w001mgft4gvn6teld` → **release:8** (cover) — releases.cover_art_url basename exact match: 3feee91e-2b1b-4570-a84f-43a750ed6f1a.jpg
- `cmrp53fpf000jy1a2jx866m1v` → **release:9** (cover) — releases.cover_art_url basename exact match: 177f67d6-c5d3-4720-8100-a3b4e3f74d67.jpg
- `cmrp5imsi000ngft4ihqpaske` → **release:9** (cover) — releases.cover_art_url basename exact match: 177f67d6-c5d3-4720-8100-a3b4e3f74d67.jpg
- `cmrp53zkt002ny1a2zpjaxyjc` → **release:10** (cover) — releases.cover_art_url basename exact match: 65032bd9-b09b-4ca6-aa37-38efb61647f7.jpg
- `cmrp5j5i4002ngft4ugwtkqvt` → **release:10** (cover) — releases.cover_art_url basename exact match: 65032bd9-b09b-4ca6-aa37-38efb61647f7.jpg
- `cmrp539lo0002y1a2au4ufido` → **release:11** (cover) — releases.cover_art_url basename exact match: 01cb695d-8723-4558-821c-ad243b139700.jpg
- `cmrp5ifqz0002gft4gk2kr7sa` → **release:11** (cover) — releases.cover_art_url basename exact match: 01cb695d-8723-4558-821c-ad243b139700.jpg
- `cmrp54d4i003wy1a2sx4ms3r2` → **release:12** (cover) — releases.cover_art_url basename exact match: 9f7d222d-dcdc-4f6c-8da2-bc755b53c918.jpg
- `cmrp5jgwh003xgft42ba53vs5` → **release:12** (cover) — releases.cover_art_url basename exact match: 9f7d222d-dcdc-4f6c-8da2-bc755b53c918.jpg
- `cmrp54i73004ey1a2qt1s1yb7` → **release:13** (cover) — releases.cover_art_url basename exact match: ac9118b6-e946-4865-90f0-12635b732bb0.jpg
- `cmrp5jk3i0049gft44nt8kmgx` → **release:13** (cover) — releases.cover_art_url basename exact match: ac9118b6-e946-4865-90f0-12635b732bb0.jpg
- `cmrp53zdq002my1a2n98ukcq0` → **release:14** (cover) — releases.cover_art_url basename exact match: 63ba5839-267c-4131-8e3d-dd18fc52eec2.jpg
- … and 141 more

## Orphan skip reasons (aggregated)

| Reason | Count |
|--------|------:|
| document not referenced by contract/office FK or mappable path | 659 |
| tiny PDF stub without entity FK | 197 |
| image not referenced by cover_art_url/profile_image_url/logo_url | 44 |
| smoke/stub document name without entity FK | 32 |
| no deterministic entity evidence | 20 |
| system file (.DS_Store) | 2 |

## Orphans not auto-linked (sample ≤ 200)

| Attachment ID | Name | Reason |
|---------------|------|--------|
| `cmrp327dp0000146aj75rxavj` | c4f7778e-6911-4ea9-96ec-6b1a0007a409.jpg | image not referenced by cover_art_url/profile_image_url/logo_url |
| `cmrp328m00001146a1iwu29ll` | a5201e5c-4e92-48bc-905e-5c21239b1099.jpg | image not referenced by cover_art_url/profile_image_url/logo_url |
| `cmrp328ti0002146ajg0z9y57` | 30fa8804-7594-4460-b750-e364bc1a9ada.jpg | image not referenced by cover_art_url/profile_image_url/logo_url |
| `cmrp328ts0003146a2f9xf90u` | aaf20d97-126c-4aa7-a352-004e780ad4cd.jpg | image not referenced by cover_art_url/profile_image_url/logo_url |
| `cmrp538t40000y1a27bnwyrfa` | .DS_Store | system file (.DS_Store) |
| `cmrp539bs0001y1a2xdhdguyh` | 05c2f70c-5a74-407d-998e-92a4f77aecfd.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53a6j0003y1a2o6ya5ykb` | 070533d1-ea4d-4e44-b1e1-99108a82ca45.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53ajv0004y1a28oog0t0e` | 00118cbf-401c-4205-8718-2f1f403ce657.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53awr0005y1a28ifmyq7z` | 023b5984-c711-4383-a84f-147cd20ec522.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53cll0008y1a2lyrptm5c` | 0b38afee-be5e-45b6-980f-4323f56edf95.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53cm60009y1a255e1br4k` | 071eacc7-0882-4016-9b0c-f530012c90b3.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53cux000ay1a2bn50q5nl` | 084cb5c4-4e00-4487-9650-d3fd3c8d9a30.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53d1e000by1a2j3trsngt` | 0881fea5-325a-4690-b938-26ae8518c9aa.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53div000dy1a2k5r1ft93` | 0dc233a5-bb1c-4835-a606-ddd1698baa5f.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53ef2000fy1a2vk9lw8el` | 0fc8954a-dbc1-4cc5-bb78-b5bf6da9924b.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53et1000hy1a29dfbopwg` | 0fc0b7c1-893c-4c6c-ab38-91dee340bf18.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53fs9000ky1a2oisubged` | 19e4dd0b-03a8-488a-952e-55d8e3462c7c.pdf | tiny PDF stub without entity FK |
| `cmrp53gvu000oy1a2idll8qyo` | 1998b35f-3398-4997-b2de-cc1e3ed0aefe.jpg | image not referenced by cover_art_url/profile_image_url/logo_url |
| `cmrp53hnj000qy1a2icdpxack` | 24208cac-57f4-49e3-a61a-f9e5f73bb6b9.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53iht000ty1a22febzqv4` | 2099bab2-e880-429c-ab95-88843f43a767.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53ikd000uy1a229rcql1b` | 204952ad-f219-4457-b355-9811f6259f7a.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53j6s000vy1a26v13j0uy` | 2661b6b7-580e-4e02-be8c-5903cff71a95.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53j8j000wy1a2706y5asv` | 271b0c83-5c77-4884-b4bc-a3b1aa9606bb.jpg | image not referenced by cover_art_url/profile_image_url/logo_url |
| `cmrp53je9000xy1a2o5eqvrd6` | 29849603-b52b-4bed-a77b-29ef2a96a70c.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53jld000yy1a2qjkg05tu` | 29115238-70fd-45cf-85cb-ed65ce8f1118.jpg | image not referenced by cover_art_url/profile_image_url/logo_url |
| `cmrp53kab0010y1a2p50wrkkh` | 2d8848e2-3c52-49f5-b914-2999ddddf519.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53kee0011y1a2dr4vu92l` | 2ff91604-2f46-4837-b66b-6c3f226b4dfc.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53keh0012y1a2v1dir4z4` | 307a64ca-5a3d-4974-98cc-03c6cee3f85a.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53le60015y1a2orf1cvda` | 2f12a2f1-afb5-4647-bf4e-eb7ecb5bc119.jpg | image not referenced by cover_art_url/profile_image_url/logo_url |
| `cmrp53n450018y1a2bw63l7eo` | 352094e9-c19d-42c2-bbff-fd3f59caaf02.jpg | image not referenced by cover_art_url/profile_image_url/logo_url |
| `cmrp53nil001ay1a2a794ep75` | 380c2f52-ef13-4405-a28f-88752161d463.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53o4o001cy1a2b57c3x6w` | 38b08dfd-e666-4671-9f00-e800d8904648.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53pif001fy1a2ib7tyedz` | 3ae36fbf-c90b-4c7a-9d65-d427712ee939.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53q8c001hy1a2ma6ys8ek` | 39f71054-4eda-45f6-b573-1d22f7985e10.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53qal001iy1a28gy4zgjt` | 39ccffe0-9434-407c-9df2-e16fd2a0cfba.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53qcz001jy1a27c5dntop` | 3b83233e-0cef-44d1-97e4-7cb76e20dbbf.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53qzw001ky1a2eexx6mel` | 3eab095c-6a8b-478d-9bfe-45c5ca6b5899.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53r45001ly1a21lakj38i` | 4483ad01-d5d7-49af-89a6-0329b478c019.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53so6001qy1a29vqfqziz` | 4cb404dc-b296-4c79-83a9-94cde9860017.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53sqz001ry1a24tlggt0q` | 4db47701-1218-416a-9bd2-57d7667e798d.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53sqz001sy1a2c3j1z38s` | 4dc41751-092a-494a-a10d-c879eb437143.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53szz001ty1a2yqjdplrc` | 475cac9e-71cd-466a-a013-453f6e8428d5.jpg | image not referenced by cover_art_url/profile_image_url/logo_url |
| `cmrp53ty6001wy1a21smvmlof` | 51b12d45-345c-47f5-97a7-92bfd0830f97.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53uc60020y1a2jnsyhehx` | 4dddae09-7aa7-4575-b9c9-8445728bd1c6.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53uil0021y1a2rpto6php` | 519b1a38-8d53-4d96-80c7-17382c1102e9.jpg | image not referenced by cover_art_url/profile_image_url/logo_url |
| `cmrp53v320022y1a2ixd34ims` | 53bcb50b-da70-4eb0-8443-efea8c494947.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53v620023y1a2su2vf1g1` | 53f36709-658c-457d-bdb3-ae1243f21fa6.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53v8a0024y1a2r4l2k0av` | 58d1ee28-6b1d-4f57-baf2-bad949ae55b7.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53vqo0025y1a2ymfiufq6` | 58dd7d73-c5df-408a-9140-c2841e9c3507.jpg | image not referenced by cover_art_url/profile_image_url/logo_url |
| `cmrp53vxj0026y1a2w0d7db55` | 5ceacb6a-44f4-4063-ba36-3851ff567bc9.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53wbf0027y1a277nsjnl7` | 57a0f47d-c7cf-4780-900c-6c10fb5ac639.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53wjv0028y1a2w9vbrt19` | 5cd04b6f-a9fb-4bf8-9dbb-cc31accf5492.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53wns0029y1a2l2bhohab` | 5ab8677d-e54c-473f-918f-ce9bd24c4107.jpg | image not referenced by cover_art_url/profile_image_url/logo_url |
| `cmrp53x32002by1a2yr1l5hud` | 5e99aa6b-818a-404a-8ac7-ad4c8cb1f515.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54d8f003xy1a2gydr7ref` | 9f66cbe1-7ea1-4937-97f3-fab8ec9866ba.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54d9j003yy1a2s4yv6mzt` | a05bb637-2f94-4531-b536-326a214b4759.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53x2z002ay1a269klqlz9` | 5e059890-93d0-4fbc-96e5-b7bbfa8a2a37.pdf | tiny PDF stub without entity FK |
| `cmrp53xuk002fy1a2tb1u7995` | 615c1e68-c53b-44f2-aa23-805957da96ec.pdf | tiny PDF stub without entity FK |
| `cmrp53xvb002gy1a2v0istl27` | 5fb003c5-f185-43b6-a2ee-82e39b23b40c.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp53ya0002hy1a2z1yhakt5` | 6184102b-4a21-40df-b8e2-bf2a0bc604e7.pdf | tiny PDF stub without entity FK |
| `cmrp53ydn002iy1a2pdnogmu8` | 62952197-f4c4-410e-b738-ae8a9d66df84.pdf | tiny PDF stub without entity FK |
| `cmrp53z0m002jy1a2kjfyrrb0` | 635feedf-6f34-4e54-b4e4-d560c87ed363.jpg | image not referenced by cover_art_url/profile_image_url/logo_url |
| `cmrp53z8f002ky1a2aakrqxyq` | 64271751-a80b-4519-879c-2ac87ae5db87.pdf | tiny PDF stub without entity FK |
| `cmrp5401i002oy1a20rf02ycm` | 63af663a-4525-452f-baf1-7b13d049f391.jpg | image not referenced by cover_art_url/profile_image_url/logo_url |
| `cmrp540l1002py1a2ecos8ejp` | 66dd1c49-e652-44c0-9d63-0245ec88045c.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp540r7002qy1a2lg96xtaj` | 66e9301a-fa7a-4548-ba3b-d1038248bfa8.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp541z6002ry1a2692m5rjc` | 68a5e183-be9a-43ad-9096-9241437e0d49.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp542to002sy1a2pkg0nyws` | 703f83eb-7dad-443a-81dc-762e0b68e9db.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp5430e002ty1a2w0yt12y0` | 69ddeb5e-27ca-4e74-9a0f-ba15963c4b74.jpg | image not referenced by cover_art_url/profile_image_url/logo_url |
| `cmrp54310002uy1a24qleofo3` | 6af46ce3-402a-4dcf-a9a6-293daf486a14.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp5432f002vy1a2m8reepr5` | 706c202c-43ac-424a-bc5e-2d70e6170f3d.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp543bo002wy1a2i7lv29lg` | 6cef8483-bdf1-409d-b5b9-483bdf03787a.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp543tl002yy1a2cx4nv255` | 71467010-018f-49b9-b466-e7cbf9287bd5.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp544gi0031y1a2n7suoxvv` | 789d1ba7-d112-4c2b-a9db-5fd84063999b.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp5451l0033y1a2oa0tahil` | 79775d8c-fd05-43a3-8b3b-fb2c1af03250.jpg | image not referenced by cover_art_url/profile_image_url/logo_url |
| `cmrp545lo0035y1a2i38hhkf0` | 7ee991de-bd2d-405d-82ee-7cbed02fd2b5.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp545qx0036y1a2a5cpt7ic` | 7fc4069a-b9aa-44d0-a972-d38619d10ae3.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp545rg0037y1a2slf0t8c2` | 7fbadb71-2d52-4ab2-b52d-1ebbc9fe9cec.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp545x10038y1a2ntapnffh` | 7b9652e6-fed0-40b3-a821-a13e94e83173.jpg | image not referenced by cover_art_url/profile_image_url/logo_url |
| `cmrp54723003ay1a2m0ffgsub` | 8a5f0c92-6b40-4bd2-9135-3249c3e9055f.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp5472h003cy1a2r52dyh4s` | 8b5346f8-ea0f-448a-babc-606fdf3111e6.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp547ao003dy1a2lm00j8xd` | 877f881d-7f24-4187-9470-6fa49bc8ae84.pdf | tiny PDF stub without entity FK |
| `cmrp547vx003ey1a2d6w72fos` | 8bc25c2d-e5f3-4ab1-824d-0c64f0607399.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp548pq003gy1a2jhxh0mkz` | 821bff90-95ff-47a9-86f5-89a1a20395ad.jpg | image not referenced by cover_art_url/profile_image_url/logo_url |
| `cmrp549oe003hy1a27xed9cz0` | 90e9b115-c856-4639-85cd-e5b74321103c.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp549oi003iy1a241jnxwm6` | 9168ccd3-be48-4447-bdc8-8ef4f3754422.pdf | tiny PDF stub without entity FK |
| `cmrp549py003jy1a2jd01tma5` | 8e28c16d-b158-4845-a44b-5b6b67f93091.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp549w8003ky1a24nq752cf` | 90a61a82-1db1-44b3-b8d4-c7524103f973.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54axu003my1a2kv6xhgam` | 8c38746e-c7a7-431a-86aa-6ffa921cd1bf.jpg | image not referenced by cover_art_url/profile_image_url/logo_url |
| `cmrp54bno003ny1a2e5yj32k0` | 9bdb7dfd-2213-4edb-a691-0d84c29851fc.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54bnu003oy1a2xtq9a2me` | 989eb930-e354-4e7b-a85c-1aaa2ec2975e.pdf | tiny PDF stub without entity FK |
| `cmrp54bo7003py1a2jsnphmd1` | 9b2ef926-d00c-460e-977a-bca808f0fffe.pdf | tiny PDF stub without entity FK |
| `cmrp54cux003ty1a221aw9ezs` | 9f438213-d952-4e56-a22b-c819fc0b741f.pdf | tiny PDF stub without entity FK |
| `cmrp54cvi003uy1a2jjx36hnw` | 9c971bd7-33c6-4d55-a7ec-118c97a403d0.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54e990041y1a2c462cih9` | a5b42f20-bb65-4592-a57a-e68a3a336c38.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54fo30045y1a2472dahi4` | a7160f74-6b02-4935-b907-47faebb09238.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54gja0046y1a2ldqx95yh` | aa285904-f3a5-4d07-8e70-d522c643ae43.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54gkj0047y1a2zxyesutn` | aff88041-89a7-4b2e-acb9-e27e8f358783.pdf | tiny PDF stub without entity FK |
| `cmrp54gkr0048y1a2ilbfr9x2` | ac0ab63d-c58a-4942-b36e-b94a149a539e.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54hhz004ay1a20u7l6rzv` | b7fb4742-0fde-4d19-8ada-2a347b93f071.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54izc004fy1a2ms0lf1rb` | bd8989fb-8745-415f-ba60-39b90d6bd042.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54j8g004iy1a2a9uy2oqp` | be4f06ea-7e2d-442b-8701-ef16f8b5d3e0.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54jcv004jy1a29xu37ucl` | bc4da938-859c-4ea5-a396-ea19cb7df082.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54jp0004ky1a2bjo61dhm` | bed2029c-4dd4-46ae-854b-29d5dc071a90.pdf | tiny PDF stub without entity FK |
| `cmrp54k0e004ly1a20aqlt9xw` | bd7345d1-b2f0-4089-86b4-b93fab11c020.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54k8i004my1a243bmpyjk` | c0d4d311-5622-4a67-8090-93ec4a415323.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54kzg004oy1a22qjc3pbl` | c8b5401f-87c1-4833-ac81-8b79dc817abf.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54l83004qy1a2a7y1zghs` | c323c759-cfab-43d3-b204-180f6b3d2155.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54lje004sy1a2ekeahozo` | cf6e078c-1fd8-46bb-a3aa-17f40a1ae010.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54m0w004uy1a2glwh3efw` | 09a0a44cc65513f1ec4cb9286a4c3988771f682b8a7ad9123fa93e0d71a376f4.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54m0y004xy1a2itigbc26` | 178fc78fd4b91b07dcb9d968edd12719ebde5f9403d20eb59ee9e6e7004f2a05.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54m0x004wy1a2rc9a2nyt` | 0bb15171744ad05ee54f18190aca03ce139fa8f007741d1df30c321de7ca9e26.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54m0x004vy1a267v81orh` | cfe49a36-6be5-4c0d-8233-e61c9f44189c.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54mfg004yy1a2546pf3og` | 22f3e73aa8ab01e95acaca023e5025f13e53150566d20cf4e20955a6023414b4.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54mfu004zy1a2n3kg413n` | 1e6dc5c22fc1fec338b58aa951cbf907604c9f855c9a583b600dd34fbc264b85.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54mq80050y1a249glldqv` | 57e42ba2a74d33494214057b04d127e877be2c83c9058439193e6d3f8919831c.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54mq90051y1a2lbh3ca3z` | 22ffe292b69d7960e1c9e0bd4e3ef71f8771d0ef1ed058953fb9851a693fc2a9.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54mqm0052y1a2p93sgr7r` | 32ae11777258f726f0bcae554f7f2665591b4d57bdd75f67b59ff877121b8278.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54mr10053y1a2ufkmw5c4` | 3b810c179aed2d352d814cd571df5b1303038ca9e8fb670156a94e3cbc6eec96.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54n5i0054y1a2kph2o4zu` | 61a50ba992b843790ef57a03ee3bd5663a5444650d337026bf9087cd0edb9b3d.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp555a2008jy1a267s3qit8` | test.pdf | tiny PDF stub without entity FK |
| `cmrp54n8k0055y1a27oiulp29` | 7a09323da8d13200792fd013289954bbb4feda13a56ec6c666c36a335742a822.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54nf80056y1a258kvwrzc` | 7ad419752317071e125e97d44113b9c4f7dd4753fbe1e43a770238ce1ead0267.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54nfh0057y1a2cb55zhx8` | 7a829738f8e113d31240292c5d66392abbc3b76d26f0a7cede4c6b37c4831c0b.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54ng40058y1a215vgzewz` | 85f2e97aa6374d10ceb08c74d7ce0cf325d0001502e5eacc9e676952685f33b2.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54nh00059y1a20v7nofjd` | 8909320e60e40e01e3a986461c58544717fddeabf7d1cf11fca91383cc7f12b2.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54nxi005ay1a2jlds8t7r` | 9478118cff2ca97b5bd222cdca5d764e70abd124f8b4d5557da306339311ae0e.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54o2d005by1a2b6jsfvq3` | 8cea5bb9419806ec9f315a846c62f847770e394a38549b8b93036ca5c64882bf.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54o50005cy1a26afms578` | ab663bc562b184753a987a3838e13b7c683811833d96f614f754100829d90503.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54o54005dy1a21wv176xa` | a5a539f976c8dbb88fa2ca34dc0734e590cfe341709362480151a31e4ace7580.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54o5w005ey1a2jje4mgil` | b70e10f8fc78948860c84623a8fe9d299b1c99db6801ef5166f0541c19010668.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54og8005fy1a2u2mta5v7` | c663487fd60c39b171c2c003b7db01d917e72c9b9cf63729cd03155967db03bc.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54orz005hy1a2k0e5i8py` | c7e268110c3826567f1334f7118bda99bd3ea6bec07ce25cbfcf6b33465c2d9d.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54orv005gy1a23qu917ff` | c77ad866a92fc2c384822f2e08ce2f33a50254f47d3f9e443098afe42d77ce61.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54out005iy1a2r7mkjo49` | d6785bc1036f64e741746ca1125fb5a6069ef0d729f1fd9a2b8f09f1a4337ff1.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54out005jy1a2jqfa9ruz` | d21b019ffa5a66eb8d1e62b0a0e91b23556006a2895543532ccbe734d45c9323.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54po1005ky1a2w9axzdh5` | ef5d73ffce1757e9aeeb27bb9fe343798f4229caedb62b4e49dc8c630d54ebed.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54po3005ny1a2eshskjnu` | e9834d02c3abeec68609c81a45f584f5146c229aa4304154806768c775fc3465.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54po2005my1a2e9odwuwg` | d8e0b04ef97b2dfd2ec31282a7d8ecfcfc2e032d74aa5a1df6cdbe3b81bce9ca.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54uiu006ey1a22o491pxd` | 362de1e44a346bd3afc09d3f0593870a965c25354915fd7003d779dbdd730aa7.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54um8006fy1a2pls9ci0c` | 441b8bca58770fe91fabd447a59e739f554d119ebddcafbafd8a02726d7db236.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54ux9006gy1a2a07s8i8p` | 46d905bfcaef47de22132174441e45a037545739cda40e900df9fb5cd488a424.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54v01006hy1a2bfl02hpw` | 49365f14743b4c8b463412b8c1ab0f7c731fe548aae6535da79acf610844736e.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54v0t006iy1a2ro205fay` | 495e517bab71a2994fdf004e7dc13dbce587cbafa22921cfefbfeba19683945f.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54v7w006jy1a2xpxtot4u` | 50d40652efe7a100943dd42740568d9853bb77f976f82ce440feac5927c20265.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54v99006ky1a2v3a3roab` | 4ffac1f9c18bf7ae6084308a0005a2dceb52ebf7256183f5d21dac9ff62ee764.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54vbs006ly1a2zaqe943k` | 533ea83f6ac22b41030613e510b27de624fa60608a651c263e8c29a937502c78.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54vly006my1a2m3iafpsz` | 5393f5fbc244949978bcdc3d603ee59592f90adebf2d9ab6800f0c5cf649c678.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54vqd006ny1a25nz7l7s6` | 53cb818481c2d5b94dca49705d723028443125232dc2487955f3a608704c3547.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54vqe006oy1a2kxx5eqd6` | 560e62b7197a2b304f33185f8cfba0ada41a4205877ec8ae7e2997072ead13ce.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54vy8006py1a2w3c7j6pi` | 58e3e10603c343ea3634383da7a60c45b65c62b33c8100d8ea4673796f3edb32.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54w0s006qy1a2ohtwb353` | 5cf3ecc8d6f3816fca261b41e1a9294ade77f430a8a142886ae9476acabc2be7.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54w1w006ry1a249oprs7q` | 5b244beb6766b10293ed64422e7b8bde7774627b9232308982aebbebc34d391f.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54po2005ly1a2cj4nig1l` | f646f4a97b121aa4935fbfbb35c1d3334bdbd92920abd8918a91a7d2935bb47f.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54po4005oy1a2iyf3frjm` | dba24a92cc5725363c0c0cb5e585d0ebd6df8d1a9543a54d0bf9ba456a2f9af2.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54qd9005py1a2mni3otkh` | f9c5e97f4dd76f3cd801bbd498af6dd9de87a8d71c320d169058d15b6ecfc3ef.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54qdj005qy1a2fzp2zfqy` | 5b9181deb0636328170e60fa6edd62dffc0653db80b22badb8bf129b61eb040a.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54r78005ry1a2x89qqq5i` | e362d2538547d76fcd4ebc5a5eb2b2af31eb51cf8ecec468a45d6f913bd3ceb4.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54s3a005sy1a2az1lrh8g` | 132f1c53dadb273696080f1b0f47b0e01fdaac4af6ba33f2bbf4abbf02ff507d.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54s3p005ty1a2h3cnfhss` | 04d67c92a31234c9c334835a1d98791cff0199226e833721d5cb58caf54348c9.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54s3s005vy1a27ahduwnb` | 833b0b79910517ea5e56d887c5f01dec3c568bf6c48b615a9334719085574a49.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54s3s005uy1a2j9lhngkj` | 05580e56c91a6f7d0fea3e2736bf28e0d137f8d5403ff63745a820ed06fb75bc.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54s4b005wy1a26opskxjk` | 003d3e0fc9da0bfa1cb7e010d8ed049c5a72c1af6ebfd45441e059c0af72e0d7.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54s5t005xy1a2xxhi7pgz` | 12e342a19a5b72e6f827fc642951c68e00c66b95a3c41c94d1418eacf1b64ab7.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54ssv005yy1a2xjth78x3` | 198c65c8933b5d24875894a8266d0622af16e6985e63e5531de7449d8b6d38b5.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54ssz005zy1a2h48j0pfm` | 15ea3ac7efd504b66f020d217f8f5a8b7c1aa34c67061db58eefd3fffc876981.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54stf0060y1a27i6l58at` | 1b433973f341a87b7b6766bf1438726028c5511e27a09ae81a306e360b4b89fc.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54swg0061y1a2dc84k5hy` | 180cd3f6a83feaa544150595f6661902a9a4ec52a3effb5ab4b4158438247546.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54swh0062y1a2xip4srfg` | 1cb9a3dbf0a354a7eddb1cac80a8598ad367784a1178975036ba85d05c2542ea.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54t4p0063y1a2zjlxy6ja` | 1c693262b4ede662e05311c0ec023f9eb3e108e2948614ae2005a62e26b2d0f5.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54tib0064y1a22txos9hb` | 1cd98ef056da9e2c511e48f453cdfc926ff027ba79263d9e18b789a8caed4f2c.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54tkx0065y1a2vo3wgb01` | 1e92dbc6040a11642b27624f7e6dcf90871effc76376947784df254500250446.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54tl40066y1a2vs68q84p` | 1e508af554f786660d67e2e8e24fca619604ba6c6bb55abe810bdce558385d59.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54tm40067y1a263f2a10y` | 1ec4e4e29f9f7010bf002829693cea4e868303c443279c987b05dc3d360186e0.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54ttr0068y1a2ojkwr77a` | 20d76b588a3deeafca186cc91cba7097e71134722096b8f23229648a485220a7.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54tu40069y1a2tc7m1u78` | 242621915c6ef8389b87d360e5ae6a64cafc4dec2573c19a50f7630fd08b6b2e.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54u8f006ay1a2za421p99` | 2821eec0c576f26772c28e39bc4657af56d13efcb45fab6239b12972f3d744ac.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54uac006by1a2yv6jlha5` | 2d82a3bd196e65a30b0a93250c0574d1ce55766e5f1c2355378b578dbec99137.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54uas006cy1a2xm3wx6d0` | 331e283ad25c58c10e929fd3716711d07381c7bf6d5c48f801b75d6a5b688599.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54uir006dy1a2697uzy0l` | 3e004480cfc6b8c2d80ce631717865b89a8e17586d6da3fafa062067fdd84e02.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54zdg007ey1a2k57c16qu` | 99cabb297db11e61347bcd28052c561ae0fc19ad8dc1b5c295654a52d0b1e466.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54zrz007gy1a22pyahi1s` | 9ce310c84c1247907df582b2e9ad0f7dc6c63f88db09a3954212b66fb14de3f8.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54zt9007hy1a2fttp7vzy` | a53e88377e77d188753596f96e8a216dccffd8090e9596c15d6db3c0d9c1e890.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54zzh007iy1a2ont2zlbz` | 9f63e06a802cb27893d9eb8ea688aba2d3fe296120dfdf54b9305db449d45be7.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp5503n007jy1a2r9yu7u8q` | b02b071aae32cc2aa68145b727964811c31209fafa36a233a103c54d4cdfeeb7.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54wba006sy1a2vyj3gox6` | 5e0304bb6ae74366f8ce30f86bd399a06eae661a440f0748dfbb8f7ef8707455.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54wff006ty1a28ngmvlc1` | 62760712393fa3c2931e04b20f19f2dc936b2457a70b6c6f75d9cd10dc0d73fd.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54wfh006uy1a24z065800` | 6300cfbafb4a8a9cad2516364001e1b5bf8e5d6932df56ebcab5a83f1fa69f62.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54wna006vy1a2zfknlmff` | 65b5669b69d6224bc4c5be09835d5b93e53ce8ecb97c891e738219cccf9bf6b7.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54wqt006wy1a22xy6rxwi` | 6612d8d974408ae0e8965ab02a803682d3c83806ec78b664a0126f81155b9988.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54wrd006xy1a22duiktce` | 66ab6abd24b25deabb3b28686dc90ed5ec4ccfb4a8172dcc5d0f901e9d1d48c7.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54xgq006yy1a2bz9g0q78` | 680e87b09f8946e7cc2f34565e317299a2073170f95741839a92fadce3b27413.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54xgx006zy1a204dyef90` | 717cc36151afb40a4354acde2afc21ccdd5cb44a0523864dadce423e28594741.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54xh10070y1a2mgviwaxi` | 69923b08f63a934e95f75000f4eaec5f2dd56a1703d1c31e5d743c103ee9edd7.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54xm70071y1a2ehm6qks7` | 6a8e5c4532482880c498e2615e81d024f37730cd7de61cf7637f12cfe8841e91.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54xri0072y1a25cn34pli` | 6b1715784056d49baa9b408a8060f4fe0992e36597cbbbaf0efe0aa53ac8ede4.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54xri0073y1a216yno3sd` | 72354654f86bae15c1e120ce53e0f9e0c3ee128777fd302b364fef850a1464df.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54ybv0074y1a2tlkczd1n` | 780a8e67a9495f884a45f2859979d7a7676fbfc712d4601cbe681934c43445bb.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54ydb0075y1a2chpb0fgi` | 76f597212950501b8a8e427f57fd37e295cd0a7f7b34ebba93cff1b412b4aa02.pdf | document not referenced by contract/office FK or mappable path |
| `cmrp54ye50076y1a2nqqlf29s` | 78e6b49ecee606aeca32e64a6252eb5e9dec6dcf0f87b277ed5dca34f351b20e.pdf | document not referenced by contract/office FK or mappable path |

## Content duplicates (not deleted)

Top checksum groups (same bytes, multiple Attachment rows from re-migration):

| Checksum (prefix) | Count | Sample name | Size |
|-------------------|------:|-------------|-----:|
| `4f1949e95440…` | 216 | 044de6b5-2523-4737-a691-00ff3efbc5b6_doc.pdf | 14 |
| `8388e590d9cf…` | 44 | 023b5984-c711-4383-a84f-147cd20ec522.pdf | 688566 |
| `d236f61ca9e5…` | 32 | 0fc0b7c1-893c-4c6c-ab38-91dee340bf18.pdf | 533012 |
| `2b784dafd7f0…` | 24 | 4db47701-1218-416a-9bd2-57d7667e798d.pdf | 1841481 |
| `74dbfa2b2ff6…` | 24 | 0b38afee-be5e-45b6-980f-4323f56edf95.pdf | 378943 |
| `f231ee9f2de2…` | 24 | 00118cbf-401c-4205-8718-2f1f403ce657.pdf | 311921 |
| `56fa5a1e77c6…` | 22 | 070533d1-ea4d-4e44-b1e1-99108a82ca45.pdf | 281 |
| `a84da4fad266…` | 20 | 1f76cb04-83c3-427c-96f9-163306c3c6dd.csv | 27384 |
| `c6f43ec5494c…` | 18 | 1998b35f-3398-4997-b2de-cc1e3ed0aefe.jpg | 1708764 |
| `f7ef2244751e…` | 16 | 271b0c83-5c77-4884-b4bc-a3b1aa9606bb.jpg | 3546930 |
| `783849851a90…` | 14 | 10f034ab-712c-4348-a092-73c0153193dc.json | 42551 |
| `83d40e60c499…` | 14 | 64271751-a80b-4519-879c-2ac87ae5db87.pdf | 17 |
| `e3b0c44298fc…` | 12 | 4bd346fb-4b5e-497e-97e5-a42572bb2224.csv | 0 |
| `c700e751fadb…` | 12 | 0fa7d721-ec9b-49ed-b044-8cedb6c723cb.jpg | 2613141 |
| `62e881fca6d2…` | 10 | 05c2f70c-5a74-407d-998e-92a4f77aecfd.pdf | 452916 |
| `55ee6c3eb3ae…` | 8 | DARREN_BENJAMIN_DAZ-I-KUE_REMIX_AGREEMENT_copy.pdf | 126173 |
| `6ad305773484…` | 8 | 1f46c939-cbc9-4e70-b760-1533ad9913d8.jpg | 2287262 |
| `1240b9c3b7bf…` | 8 | 1c933bc9-c5b2-424b-a3b2-2701f38d256c.jpg | 3585743 |
| `cddb1a8d53f6…` | 8 | 63af663a-4525-452f-baf1-7b13d049f391.jpg | 2680116 |
| `e3a1060e06aa…` | 6 | 08d4941d-70b4-4f01-acaa-8168621d30e3.jpg | 4493846 |

## Validation checklist

| Check | Status |
|-------|--------|
| Releases with cover_art_url linked | 80/80 |
| Artists with profile_image_url linked | 0/0 |
| Labels with logo_url linked | 1/1 |
| Contracts linked | 4 (cloud contracts with path evidence only) |
| Remaining orphans documented | yes (954) |

### R2 object existence (post-link sample)

Checked 8 linked attachments via Storage Service (`getFileMetadata` + `getSignedDownloadUrl`):

| Sample | Result |
|--------|--------|
| release:1 cover (×2 dups) | OK — ~2.5 MB JPEG, signed URL issued |
| label:2 logo (×2 dups) | OK — ~202 KB PNG, signed URL issued |
| contract:1 documents (×4) | OK — PDFs present in R2, signed URLs issued |
| **Total** | **8/8 OK, 0 missing** |

### UI note

Release/artist pages currently render `cover_art_url` / `profile_image_url` as raw `/uploads/…` paths. Those paths are not served by cloud static hosting. Attachments are correctly linked for the Storage Service (`/api/storage/download/[id]`). A follow-up UI change should resolve cover/profile via attachment lookup or rewrite URL columns to the download API — **out of scope for this linking-only milestone**.

## Related docs

- `docs/migration/attachment-mapping.md`
- `scripts/migrate-assets/migration-report.md`
- `LOCAL_STORAGE_ARCHITECTURE.md`

## How to re-run

```bash
npm run link:attachments:dry-run   # plan only
npm run link:attachments           # apply
npx tsx scripts/migrate-data/link-attachments/engine.ts --check-r2
```
