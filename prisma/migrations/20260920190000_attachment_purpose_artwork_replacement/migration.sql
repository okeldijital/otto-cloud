ALTER TABLE "attachments"
  ADD COLUMN "purpose" TEXT NOT NULL DEFAULT 'attachment';

CREATE INDEX "ix_attachments_entity_purpose"
  ON "attachments"("entityType", "entityId", "purpose");
