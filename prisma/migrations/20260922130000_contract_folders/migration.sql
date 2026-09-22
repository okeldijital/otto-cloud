CREATE TABLE "contract_folders" (
    "id" UUID NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "created_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contract_folders_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "contract_folder_memberships" (
    "id" UUID NOT NULL,
    "organization_id" INTEGER NOT NULL,
    "folder_id" UUID NOT NULL,
    "contract_id" INTEGER NOT NULL,
    "added_by" INTEGER,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "contract_folder_memberships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "uq_contract_folders_org_name" ON "contract_folders"("organization_id", "name");
CREATE INDEX "ix_contract_folders_org" ON "contract_folders"("organization_id");

CREATE UNIQUE INDEX "uq_contract_folder_membership" ON "contract_folder_memberships"("folder_id", "contract_id");
CREATE INDEX "ix_contract_folder_memberships_org_folder" ON "contract_folder_memberships"("organization_id", "folder_id");
CREATE INDEX "ix_contract_folder_memberships_org_contract" ON "contract_folder_memberships"("organization_id", "contract_id");

ALTER TABLE "contract_folder_memberships"
  ADD CONSTRAINT "contract_folder_memberships_folder_id_fkey"
  FOREIGN KEY ("folder_id") REFERENCES "contract_folders"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;

ALTER TABLE "contract_folder_memberships"
  ADD CONSTRAINT "contract_folder_memberships_contract_id_fkey"
  FOREIGN KEY ("contract_id") REFERENCES "contracts"("id")
  ON DELETE CASCADE ON UPDATE NO ACTION;
