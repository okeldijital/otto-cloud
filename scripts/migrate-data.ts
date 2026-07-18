/**
 * @deprecated Use the modular framework:
 *   npx tsx scripts/migrate-data/index.ts <command>
 *   npm run migrate:data
 *
 * This entrypoint forwards to the Legacy Data Migration Framework.
 */
import { spawnSync } from "child_process";
import path from "path";

const args = process.argv.slice(2);
const forwarded = args.length === 0 ? ["migrate"] : args;
const entry = path.join(__dirname, "migrate-data", "index.ts");

const result = spawnSync(
  "npx",
  ["tsx", entry, ...forwarded],
  { stdio: "inherit", cwd: path.join(__dirname, "..") },
);
process.exit(result.status ?? 1);
