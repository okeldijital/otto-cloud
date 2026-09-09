-- Applied to Neon parent branch on 2026-09-09.
-- This migration is recorded here to keep repository migration history aligned
-- with the live database schema.

ALTER TABLE public.works
  ADD COLUMN IF NOT EXISTS work_type varchar(50),
  ADD COLUMN IF NOT EXISTS status varchar(50),
  ADD COLUMN IF NOT EXISTS original_work_title varchar(255),
  ADD COLUMN IF NOT EXISTS first_release_date date,
  ADD COLUMN IF NOT EXISTS notes text;

CREATE TABLE IF NOT EXISTS public.work_contributors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id integer NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL,
  tenant_id uuid,
  party_type varchar(50) NOT NULL,
  party_entity_id varchar(255),
  name text NOT NULL,
  role varchar(50) NOT NULL,
  share_percent double precision,
  controlled_share_percent double precision,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT work_contributors_share_check CHECK (share_percent IS NULL OR (share_percent >= 0 AND share_percent <= 100)),
  CONSTRAINT work_contributors_controlled_share_check CHECK (controlled_share_percent IS NULL OR (controlled_share_percent >= 0 AND controlled_share_percent <= 100))
);

CREATE INDEX IF NOT EXISTS ix_work_contributors_work_id ON public.work_contributors(work_id);
CREATE INDEX IF NOT EXISTS ix_work_contributors_organization_id ON public.work_contributors(organization_id);
CREATE INDEX IF NOT EXISTS ix_work_contributors_party ON public.work_contributors(party_type, party_entity_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_work_contributors_participant_role
  ON public.work_contributors(work_id, party_type, party_entity_id, role)
  WHERE party_entity_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.work_publishers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id integer NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  publisher_id integer NOT NULL REFERENCES public.publishers(id) ON DELETE RESTRICT,
  organization_id uuid NOT NULL,
  tenant_id uuid,
  share_percent double precision,
  controlled_share_percent double precision,
  is_administrator boolean NOT NULL DEFAULT false,
  administration_notes text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT work_publishers_share_check CHECK (share_percent IS NULL OR (share_percent >= 0 AND share_percent <= 100)),
  CONSTRAINT work_publishers_controlled_share_check CHECK (controlled_share_percent IS NULL OR (controlled_share_percent >= 0 AND controlled_share_percent <= 100)),
  CONSTRAINT uq_work_publishers_work_publisher UNIQUE (work_id, publisher_id)
);

CREATE INDEX IF NOT EXISTS ix_work_publishers_work_id ON public.work_publishers(work_id);
CREATE INDEX IF NOT EXISTS ix_work_publishers_publisher_id ON public.work_publishers(publisher_id);
CREATE INDEX IF NOT EXISTS ix_work_publishers_organization_id ON public.work_publishers(organization_id);

CREATE TABLE IF NOT EXISTS public.work_pro_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_id integer NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  pro_id integer NOT NULL REFERENCES public.pros(id) ON DELETE RESTRICT,
  organization_id uuid NOT NULL,
  tenant_id uuid,
  pro_work_number varchar(255),
  registration_status varchar(50) NOT NULL DEFAULT 'pending',
  registration_date date,
  registration_reference varchar(255),
  notes text,
  created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_work_pro_registrations_work_pro UNIQUE (work_id, pro_id)
);

CREATE INDEX IF NOT EXISTS ix_work_pro_registrations_work_id ON public.work_pro_registrations(work_id);
CREATE INDEX IF NOT EXISTS ix_work_pro_registrations_pro_id ON public.work_pro_registrations(pro_id);
CREATE INDEX IF NOT EXISTS ix_work_pro_registrations_organization_id ON public.work_pro_registrations(organization_id);
CREATE INDEX IF NOT EXISTS ix_tracks_work_id ON public.tracks(work_id);
