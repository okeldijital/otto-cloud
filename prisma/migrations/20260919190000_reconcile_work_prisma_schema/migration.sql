-- Reconcile the repository Prisma contract with the already-applied Work contributor extension.
-- The canonical Work aggregate tables were introduced by 20260909172000_canonical_work_aggregate.
-- These contributor metadata columns were applied to Neon separately and are made
-- idempotent here so repository migration history can safely represent the live schema.

ALTER TABLE public.work_contributors
  ADD COLUMN IF NOT EXISTS contact_email varchar(255),
  ADD COLUMN IF NOT EXISTS contact_phone varchar(50),
  ADD COLUMN IF NOT EXISTS ipi_number varchar(100),
  ADD COLUMN IF NOT EXISTS pro_id integer,
  ADD COLUMN IF NOT EXISTS publisher_id integer;

CREATE INDEX IF NOT EXISTS ix_work_contributors_pro_id
  ON public.work_contributors(pro_id);

CREATE INDEX IF NOT EXISTS ix_work_contributors_publisher_id
  ON public.work_contributors(publisher_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'work_contributors_pro_id_fkey'
  ) THEN
    ALTER TABLE public.work_contributors
      ADD CONSTRAINT work_contributors_pro_id_fkey
      FOREIGN KEY (pro_id) REFERENCES public.pros(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'work_contributors_publisher_id_fkey'
  ) THEN
    ALTER TABLE public.work_contributors
      ADD CONSTRAINT work_contributors_publisher_id_fkey
      FOREIGN KEY (publisher_id) REFERENCES public.publishers(id) ON DELETE RESTRICT;
  END IF;
END $$;
