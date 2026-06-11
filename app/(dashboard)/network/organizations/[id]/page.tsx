"use client";

import { useParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

export default function OrganizationDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="space-y-6">
      <PageHeader title="Organization" subtitle={`Organization #${id}`} />
      <Card title="Coming Soon" subtitle="Organization detail page is under development." />
    </div>
  );
}
