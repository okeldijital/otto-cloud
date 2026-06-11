"use client";

import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";

export default function NotesPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Notes" subtitle="Internal notes and reminders" />
      <Card title="Coming Soon" subtitle="Notes management is under development." />
    </div>
  );
}
