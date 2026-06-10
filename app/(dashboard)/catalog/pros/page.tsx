"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import DataTable from "@/components/DataTable";
import api from "@/lib/api";

const columns = [
  { key: "name", label: "Name", sortable: true },
  { key: "code", label: "Code", render: (row: any) => row.code || "—" },
];

export default function ProsPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await api.get("/pros");
      const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setData(items);
    } catch (err) {
      console.error("Failed to fetch PROs:", err);
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
        title="PROs"
        subtitle="Performance Rights Organizations"
        actions={
          <Button variant="primary" size="sm">
            <Plus size={16} />
            Add PRO
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
