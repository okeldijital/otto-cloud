"use client";

import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Documents" subtitle="Document management" />
      <Card title="Coming Soon" subtitle="Document management is under development." />
    </div>
  );
}
