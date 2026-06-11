"use client";

import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

export default function OfficeReportsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Reports" subtitle="Office reports and analytics" />
      <Card title="Coming Soon" subtitle="Reports module is under development." />
    </div>
  );
}
