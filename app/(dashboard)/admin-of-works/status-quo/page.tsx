"use client";

import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

export default function StatusQuoPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Status Quo" subtitle="Contract completeness and status overview" />
      <Card title="Coming Soon" subtitle="Status quo reporting is under development." />
    </div>
  );
}
