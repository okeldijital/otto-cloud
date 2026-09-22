import { NextResponse } from "next/server";
import { requireOrganization, identityErrorResponse } from "@/lib/platform/identity";
import { PERMISSION_CATALOG } from "@/lib/platform/identity/permissions/catalog";

export async function GET(req: Request) {
  try {
    await requireOrganization(req);
    const grouped = PERMISSION_CATALOG.reduce<Record<string, typeof PERMISSION_CATALOG[number][]>>(
      (acc, permission) => {
        (acc[permission.module] ??= []).push(permission);
        return acc;
      },
      {}
    );

    return NextResponse.json({ permissions: PERMISSION_CATALOG, grouped });
  } catch (err) {
    return identityErrorResponse(err);
  }
}
