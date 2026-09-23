"use client";

import { useEffect, useRef, useState } from "react";
import { AlertCircle, Check, FileText, Loader2, Upload, X } from "lucide-react";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (contract: any) => void;
}

export default function AddContractWizard({ isOpen, onClose, onCreated }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [contractNumber, setContractNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    setFile(null);
    setTitle("");
    setContractNumber("");
    setNotes("");
    setBusy(false);
    setError("");
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFile = (selected: File | null) => {
    if (!selected) return;
    if (selected.type !== "application/pdf") {
      setError("Only PDF contracts are supported.");
      return;
    }
    setFile(selected);
    setTitle((current) => current || selected.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " ").trim());
    setError("");
  };

  const create = async () => {
    if (!file) {
      setError("Select a contract PDF.");
      return;
    }
    if (!title.trim()) {
      setError("Enter a contract title.");
      return;
    }

    try {
      setBusy(true);
      setError("");
      const createdRes = await api.post("/contracts", {
        title: title.trim(),
        contract_number: contractNumber.trim() || undefined,
        status: "Draft",
        type: "Other",
        notes: notes.trim(),
      });
      const created = createdRes.data;

      const formData = new FormData();
      formData.append("file", file);
      await api.post(`/contracts?action=upload_document&id=${created.id}`, formData);

      onCreated(created);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.message || "Unable to create the contract.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1115]/80 backdrop-blur-md p-4">
      <div className="bg-premium-glass border border-white/10 rounded-3xl shadow-glass w-full max-w-xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div>
            <h2 className="text-xl font-black text-white">Add Contract</h2>
            <p className="text-xs text-text-secondary mt-1">Store the signed PDF, then connect it to OTTO records.</p>
          </div>
          <button className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-white" onClick={onClose} aria-label="Close"><X size={16} /></button>
        </div>

        <div className="p-6 space-y-5">
          {error && <div className="flex gap-3 rounded-xl border border-danger/20 bg-danger/10 p-4 text-sm text-danger"><AlertCircle size={18} className="shrink-0" />{error}</div>}

          <div
            className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center cursor-pointer hover:border-primary/40"
            onClick={() => inputRef.current?.click()}
          >
            <FileText size={32} className="mx-auto mb-3 text-primary" />
            <p className="text-sm font-medium text-white">{file ? file.name : "Select signed contract PDF"}</p>
            {file && <p className="text-xs text-text-secondary mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</p>}
            <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <label className="space-y-2"><span className="text-xs text-text-secondary">Contract title *</span><input className="input w-full" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Dazz-B MusiQ MWNN V5 M2KR" /></label>
            <label className="space-y-2"><span className="text-xs text-text-secondary">Contract number</span><input className="input w-full" value={contractNumber} onChange={(e) => setContractNumber(e.target.value)} placeholder="Optional" /></label>
            <label className="space-y-2"><span className="text-xs text-text-secondary">Notes</span><textarea className="input w-full min-h-24" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional administrative notes" /></label>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
            <Button variant="primary" onClick={() => void create()} disabled={!file || !title.trim() || busy}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
              {busy ? "Saving…" : "Create Contract"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
