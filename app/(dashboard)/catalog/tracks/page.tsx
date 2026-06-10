"use client";

import { useState, useEffect } from "react";
import { Plus } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import DataTable from "@/components/DataTable";
import api from "@/lib/api";

const columns = [
  { key: "title", label: "Title", sortable: true },
  { key: "isrc", label: "ISRC", render: (row: any) => row.isrc || "—" },
  { key: "genre", label: "Genre", render: (row: any) => row.genre || "—" },
  {
    key: "duration",
    label: "Duration",
    render: (row: any) => row.duration || "—",
  },
];

export default function TracksPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const res = await api.get("/tracks");
      const items = Array.isArray(res.data) ? res.data : res.data?.items || [];
      setData(items);
    } catch (err) {
      console.error("Failed to fetch tracks:", err);
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
        title="Tracks"
        subtitle="Manage your track catalog"
        actions={
          <Button variant="primary" size="sm">
            <Plus size={16} />
            Add Track
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
