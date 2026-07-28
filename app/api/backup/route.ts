import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { execSync } from "child_process";
import fs from "fs";
import path from "path";

const BACKUP_DIR = path.join(process.cwd(), "backups");

function ensureBackupDir() {
  if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
}

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user as any;
    if (!user.is_superuser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const action = new URL(req.url).searchParams.get("action");

    if (action === "list") {
      ensureBackupDir();
      const files = fs.readdirSync(BACKUP_DIR)
        .filter((f) => f.endsWith(".sql") || f.endsWith(".dump"))
        .map((f) => {
          const stat = fs.statSync(path.join(BACKUP_DIR, f));
          return {
            name: f,
            size_bytes: stat.size,
            created_at: stat.birthtime.toISOString(),
          };
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return NextResponse.json(files);
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("[GET /api/backup]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const user = session.user as any;
    if (!user.is_superuser) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const action = new URL(req.url).searchParams.get("action");

    if (action === "create") {
      const databaseUrl = process.env.DATABASE_URL;
      if (!databaseUrl) return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 500 });

      ensureBackupDir();
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `backup-${timestamp}.sql`;
      const filepath = path.join(BACKUP_DIR, filename);

      try {
        // Use pg_dump if available, fall back to prisma introspection
        if (databaseUrl.includes("postgres")) {
          execSync(`pg_dump "${databaseUrl}" > "${filepath}"`, { timeout: 120000 });
        } else {
          // Fallback: write schema + data counts as a text backup
          const tables = await prisma.$queryRawUnsafe<Array<{ tablename: string }>>(
            "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public'"
          );
          const lines = [`-- OTTO Cloud Backup - ${new Date().toISOString()}`, ""];
          for (const { tablename } of tables) {
            const count = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
              `SELECT COUNT(*) as count FROM "${tablename}"`
            );
            lines.push(`-- Table: ${tablename} - ${count[0]?.count || 0} rows`);
          }
          fs.writeFileSync(filepath, lines.join("\n"));
        }

        const stat = fs.statSync(filepath);
        return NextResponse.json({
          filename,
          size_bytes: stat.size,
          created_at: stat.birthtime.toISOString(),
          message: "Backup created successfully",
        }, { status: 201 });
      } catch (execErr: any) {
        return NextResponse.json({ error: `Backup failed: ${execErr.message}` }, { status: 500 });
      }
    }

    if (action === "cleanup") {
      ensureBackupDir();
      const files = fs.readdirSync(BACKUP_DIR)
        .filter((f) => f.endsWith(".sql") || f.endsWith(".dump"))
        .map((f) => ({ name: f, path: path.join(BACKUP_DIR, f), mtime: fs.statSync(path.join(BACKUP_DIR, f)).mtime }))
        .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

      // Keep last 10, delete rest
      const toDelete = files.slice(10);
      for (const f of toDelete) {
        fs.unlinkSync(f.path);
      }

      return NextResponse.json({ deleted: toDelete.length, kept: Math.min(files.length, 10) });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    console.error("[POST /api/backup]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
