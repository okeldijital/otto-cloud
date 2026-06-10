"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import DataTable from "@/components/DataTable";
import api from "@/lib/api";

const columns = [
  { key: "title", label: "Title", sortable: true },
  { key: "release_type", label: "Type", sortable: true },
  {
    key: "release_date",
    label: "Release Date",
    sortable: true,
    render: (row: any) => row.release_date ? new Date(row.release_date).toLocaleDateString() : "—",
  },
  {
    key: "catalog_number",
    label: "Catalog #",
    render: (row: any) => row.catalog_number || "—",
  },
];

export default function ReleasesPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await api.get("/releases");
      const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setData(items);
    } catch (err) {
      console.error("Failed to fetch releases:", err);
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
        title="Releases"
        subtitle="Track albums, EPs, and singles"
        actions={
          <Button variant="primary" size="sm">
            <Plus size={16} />
            Add Release
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
