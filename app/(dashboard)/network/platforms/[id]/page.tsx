"use client";

import { useParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

export default function PlatformDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="space-y-6">
      <PageHeader title="Platform" subtitle={`Platform #${id}`} />
      <Card title="Coming Soon" subtitle="Platform detail page is under development." />
    </div>
  );
}
