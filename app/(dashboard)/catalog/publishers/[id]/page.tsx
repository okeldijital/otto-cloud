"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import api from "@/lib/api";
import { ArrowLeft, Building, Edit, Hash, Music, Trash2 } from "lucide-react";

export default function PublisherDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [publisher, setPublisher] = useState<any>(null);
  const [artists, setArtists] = useState<any[]>([]);
  const [works, setWorks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [{ data: publisherData }, { data: artistData }, { data: workData }] = await Promise.all([
          api.get(`/publishers?id=${id}`),
          api.get(`/publishers?id=${id}&relation=artists`),
          api.get(`/publishers?id=${id}&relation=works`),
        ]);
        setPublisher(publisherData);
        setArtists(Array.isArray(artistData) ? artistData : []);
        setWorks(Array.isArray(workData) ? workData : []);
      } catch (err) {
        console.error("Failed to load publisher detail:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const handleRename = async () => {
    const name = window.prompt("Publisher name:", publisher.name || "");
    if (!name || name === publisher.name) return;
    try {
      const { data } = await api.put(`/publishers?id=${id}`, { name });
      setPublisher(data);
    } catch (err: any) {
      alert(err?.response?.data?.error || "Update failed");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete publisher "${publisher.name}"?`)) return;
    try {
      await api.delete(`/publishers?id=${id}`);
      router.push("/catalog/publishers");
    } catch (err: any) {
      alert(err?.response?.data?.error || "Delete failed");
    }
  };

  if (loading) return <div className="p-12 text-center text-text-secondary">Loading...</div>;
  if (!publisher) return <div className="p-12 text-center text-text-secondary">Publisher not found</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/catalog/publishers")}
          className="text-text-secondary hover:text-white transition-colors"
          aria-label="Back to publishers"
        >
          <ArrowLeft size={20} />
        </button>
        <PageHeader
          title={publisher.name || "Publisher"}
          subtitle={`Publisher #${id}`}
          actions={
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" onClick={handleRename}>
                <Edit size={14} /> Rename
              </Button>
              <Button variant="danger" size="sm" onClick={handleDelete}>
                <Trash2 size={14} /> Delete
              </Button>
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <span className="text-text-secondary text-xs block">Name</span>
                <span className="font-medium">{publisher.name || "—"}</span>
              </div>
              <div>
                <span className="text-text-secondary text-xs block">Publisher ID</span>
                <span className="flex items-center gap-1"><Hash size={14} />{publisher.publisher_id || "—"}</span>
              </div>
            </div>
          </Card>

          <Card title="Linked Artists">
            {artists.length === 0 ? (
              <p className="text-text-secondary text-sm">No artists linked to this publisher.</p>
            ) : (
              <div className="space-y-2">
                {artists.map((artist: any) => (
                  <div
                    key={artist.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10"
                    onClick={() => router.push(`/catalog/artists/${artist.id}`)}
                  >
                    <Music size={16} />
                    <span>{artist.name}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Linked Works">
            {works.length === 0 ? (
              <p className="text-text-secondary text-sm">No works linked to this publisher.</p>
            ) : (
              <div className="space-y-2">
                {works.map((work: any) => (
                  <div
                    key={work.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-white/5 cursor-pointer hover:bg-white/10"
                    onClick={() => router.push(`/catalog/works/${work.id}`)}
                  >
                    <span className="text-sm flex items-center gap-2"><Building size={15} />{work.title}</span>
                    <Badge variant="neutral">{work.iswc_code || "—"}</Badge>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Quick Stats">
            <div className="space-y-2">
              <div className="flex items-center justify-between"><span>Linked Works</span><Badge variant="primary">{works.length}</Badge></div>
              <div className="flex items-center justify-between"><span>Linked Artists</span><Badge variant="primary">{artists.length}</Badge></div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
