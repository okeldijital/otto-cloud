"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import DataTable from "@/components/DataTable";
import api from "@/lib/api";

const columns = [
  { key: "title", label: "Title", sortable: true },
  {
    key: "work_type",
    label: "Type",
    sortable: true,
    render: (row: any) => row.work_type || "—",
  },
  { key: "iswc", label: "ISWC", render: (row: any) => row.iswc || "—" },
];

export default function WorksPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await api.get("/works");
      const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setData(items);
    } catch (err) {
      console.error("Failed to fetch works:", err);
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
        title="Works"
        subtitle="Manage compositions and arrangements"
        actions={
          <Button variant="primary" size="sm">
            <Plus size={16} />
            Add Work
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
