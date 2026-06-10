"use client";

import PageHeader from "@/components/ui/PageHeader";

export default function BulkProcessingPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Bulk Processing"
        subtitle="Batch contract operations"
      />
      <div className="bg-premium-glass border border-white/5 rounded-2xl p-12 text-center text-text-secondary backdrop-blur-xl">
        Bulk processing module
      </div>
    </div>
  );
}
