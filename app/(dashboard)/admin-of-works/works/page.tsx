"use client";

import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

export default function WorksAdminPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Works Administration" subtitle="Manage works registrations and filings" />
      <Card title="Coming Soon" subtitle="Works administration module is under development." />
    </div>
  );
}
