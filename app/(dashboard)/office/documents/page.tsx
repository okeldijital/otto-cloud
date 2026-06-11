"use client";

import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

export default function OfficeDocumentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Documents" subtitle="Manage office documents" />
      <Card title="Coming Soon" subtitle="Document management is under development." />
    </div>
  );
}
