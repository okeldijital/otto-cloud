import { requireProductOrganization } from "@/lib/platform/productization";

export default async function RoyaltiesLayout({ children }: { children: React.ReactNode }) {
  await requireProductOrganization("royalties");
  return children;
}
