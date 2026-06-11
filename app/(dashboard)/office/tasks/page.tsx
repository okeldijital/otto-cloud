"use client";

import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

export default function OfficeTasksPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Tasks" subtitle="Task management" />
      <Card title="Coming Soon" subtitle="Task management is under development." />
    </div>
  );
}
