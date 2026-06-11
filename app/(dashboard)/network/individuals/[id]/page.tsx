"use client";

import { useParams } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

export default function IndividualDetailPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <div className="space-y-6">
      <PageHeader title="Individual" subtitle={`Contact #${id}`} />
      <Card title="Coming Soon" subtitle="Individual detail page is under development." />
    </div>
  );
}
