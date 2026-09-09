-- Applied to Neon parent branch on 2026-09-09.
-- Enforce that Artist and Release label relationships cannot cross organization boundaries.

CREATE UNIQUE INDEX IF NOT EXISTS labels_id_organization_unique
  ON public.labels(id, organization_id);

ALTER TABLE public.artists
  DROP CONSTRAINT IF EXISTS artists_label_id_fkey;

ALTER TABLE public.artists
  ADD CONSTRAINT artists_label_org_fkey
  FOREIGN KEY (label_id, organization_id)
  REFERENCES public.labels(id, organization_id);

ALTER TABLE public.releases
  DROP CONSTRAINT IF EXISTS releases_label_id_fkey;

ALTER TABLE public.releases
  ADD CONSTRAINT releases_label_org_fkey
  FOREIGN KEY (label_id, organization_id)
  REFERENCES public.labels(id, organization_id);
