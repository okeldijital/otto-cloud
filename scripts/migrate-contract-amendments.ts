import { Client } from "pg";

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL or DIRECT_URL is required for contract amendment schema bootstrap");
}

const client = new Client({ connectionString });

async function main() {
  await client.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      CREATE TABLE IF NOT EXISTS "contract_amendment_drafts" (
        "id" UUID NOT NULL,
        "organizationId" UUID NOT NULL,
        "contractId" INTEGER NOT NULL,
        "amendmentId" UUID NOT NULL,
        "sourceVerifiedContractId" UUID,
        "status" VARCHAR(32) NOT NULL DEFAULT 'draft',
        "content" JSONB NOT NULL DEFAULT '{}'::jsonb,
        "createdBy" INTEGER,
        "updatedBy" INTEGER,
        "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "contract_amendment_drafts_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "contract_amendment_drafts_amendment_fkey"
          FOREIGN KEY ("amendmentId") REFERENCES "contract_amendments"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_contract_amendment_draft_amendment" ON "contract_amendment_drafts"("amendmentId")`);
    await client.query(`CREATE INDEX IF NOT EXISTS "ix_contract_amendment_drafts_org" ON "contract_amendment_drafts"("organizationId")`);
    await client.query(`CREATE INDEX IF NOT EXISTS "ix_contract_amendment_drafts_contract" ON "contract_amendment_drafts"("contractId")`);
    await client.query(`CREATE INDEX IF NOT EXISTS "ix_contract_amendment_drafts_status" ON "contract_amendment_drafts"("status")`);
    await client.query(`ALTER TABLE "contract_amendment_drafts" ADD COLUMN IF NOT EXISTS "sourceDocumentId" UUID`);
    await client.query(`CREATE INDEX IF NOT EXISTS "ix_contract_amendment_drafts_source_document" ON "contract_amendment_drafts"("sourceDocumentId")`);

    await client.query("COMMIT");
    console.log("Contract amendment schema verified.");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
