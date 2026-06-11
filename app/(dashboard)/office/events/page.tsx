"use client";

import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

export default function OfficeEventsPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Events" subtitle="Calendar and event management" />
      <Card title="Coming Soon" subtitle="Event management is under development." />
    </div>
  );
}
