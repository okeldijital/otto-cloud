import { requireProductOrganization } from "@/lib/platform/productization";

export default async function RightsLayout({ children }: { children: React.ReactNode }) {
  await requireProductOrganization("rights");
  return children;
}
