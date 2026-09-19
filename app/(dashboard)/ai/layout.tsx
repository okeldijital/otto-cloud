export const dynamic = "force-dynamic";

import { requireProductOrganization } from "@/lib/platform/productization";

export default async function AILayout({ children }: { children: React.ReactNode }) {
  await requireProductOrganization("ai");
  return children;
}
