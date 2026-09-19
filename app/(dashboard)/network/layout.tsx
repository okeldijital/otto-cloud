import { requireProductOrganization } from "@/lib/platform/productization";

export default async function NetworkLayout({ children }: { children: React.ReactNode }) {
  await requireProductOrganization("network");
  return children;
}
