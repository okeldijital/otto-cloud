"use client";

import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

export default function OfficeStatusQuoPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Status Quo" subtitle="Office status overview" />
      <Card title="Coming Soon" subtitle="Office status quo is under development." />
    </div>
  );
}
