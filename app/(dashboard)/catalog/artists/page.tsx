"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import DataTable from "@/components/DataTable";
import api from "@/lib/api";

const columns = [
  { key: "name", label: "Name", sortable: true },
  { key: "stage_name", label: "Stage Name", sortable: true },
  { key: "email", label: "Email", sortable: true },
  {
    key: "ipi_number",
    label: "IPI",
    sortable: true,
    render: (row: any) => row.ipi_number || "—",
  },
];

export default function ArtistsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await api.get("/artists");
      const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setData(items);
    } catch (err) {
      console.error("Failed to fetch artists:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Artists"
        subtitle="Manage your artist roster"
        actions={
          <Button variant="primary" size="sm">
            <Plus size={16} />
            Add Artist
          </Button>
        }
      />
      <DataTable
        columns={columns}
        data={data}
        isLoading={loading}
        onEdit={() => {}}
        onDelete={() => {}}
      />
    </div>
  );
}
