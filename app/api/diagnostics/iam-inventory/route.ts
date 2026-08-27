import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Temporary read-only schema/data inventory. No user PII is returned. */
export async function GET() {
  try {
    const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name ILIKE 'iam%'
      ORDER BY table_name
    `;

    const inventory: Array<{ table: string; count: number | null; columns?: string[]; error?: string }> = [];

    for (const { table_name: table } of tables) {
      const columns = await prisma.$queryRaw<Array<{ column_name: string }>>`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${table}
        ORDER BY ordinal_position
      `;

      try {
        const result = await prisma.$queryRawUnsafe<Array<{ count: bigint }>>(
          `SELECT COUNT(*)::bigint AS count FROM public."${table.replaceAll('"', '""')}"`
        );
        inventory.push({
          table,
          count: Number(result[0]?.count ?? 0),
          columns: columns.map((c) => c.column_name),
        });
      } catch (error) {
        inventory.push({
          table,
          count: null,
          columns: columns.map((c) => c.column_name),
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return NextResponse.json({
      ok: true,
      diagnostic: "iam-schema-inventory",
      inventory,
    });
  } catch (error) {
    console.error("[iam inventory] failed", error);
    return NextResponse.json({
      ok: false,
      code: "IAM_INVENTORY_FAILED",
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
