# Media Rendering Inventory

**Date:** 2026-07-20  
**Milestone:** Media Rendering Migration  

## Phase 1 — Search hits

| Pattern | Locations (app/components) | Action |
|---------|---------------------------|--------|
| `cover_art_url` | `app/(dashboard)/catalog/releases/[id]/page.tsx`, `components/workspace-sections/release/MetadataSection.tsx` | → EntityArtwork |
| `profile_image_url` | `app/(dashboard)/catalog/artists/[id]/page.tsx` | → EntityArtwork |
| `logo_url` | `settings/organization` (tenant branding URL field — not Attachment) | Keep form field; preview only if `http(s)` |
| `avatar_url` | `components/layout/TopBar.jsx` | Placeholder via EntityArtwork (no linked avatars yet) |
| `/uploads/` | legacy columns only; UI was consuming them as `src` | Never use as img src |
| static uploads | none in Next public | — |

## Phase 2 — Screens

| Screen | Before | After |
|--------|--------|-------|
| Release detail | `<img src={cover_art_url}>` | `EntityArtwork entityType=release` |
| Release list | no art | thumb column via batch map |
| Artist detail | `<img src={profile_image_url}>` | `EntityArtwork entityType=artist` |
| Artist list | no art | thumb column |
| Label detail | no art | logo via EntityArtwork |
| Label list | no art | optional thumb |
| Workspace MetadataSection | cover_art_url | EntityArtwork |
| TopBar avatar | avatar_url / API_URL concat | EntityArtwork user / placeholder |
| Dashboard | stats only | unchanged (no media grid) |
| Search (TopBar) | text only | release/artist icons via EntityArtwork |

## Implementation

- Server: `lib/media/entity-artwork.ts`
- API: `GET /api/storage/entity`
- Client: `hooks/useAttachment.ts`, `components/media/EntityArtwork.tsx`
