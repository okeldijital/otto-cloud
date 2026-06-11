"use client";

import { useState } from "react";
import { X, Upload, ChevronLeft, ChevronRight, FileText, Check } from "lucide-react";
import Button from "@/components/ui/Button";
import api from "@/lib/api";

interface AddContractWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (contract: any) => void;
}

export default function AddContractWizard({ isOpen, onClose, onCreated }: AddContractWizardProps) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    title: "",
    contract_number: "",
    type: "Recording",
    status: "Draft",
    start_date: "",
    end_date: "",
    signed_date: "",
    territory: "World",
    exclusivity: false,
    notes: "",
    file: null as File | null,
  });

  const [result, setResult] = useState<any>(null);

  if (!isOpen) return null;

  const canNext = () => {
    if (step === 1) return form.title.trim().length > 0;
    if (step === 2) return true;
    if (step === 3) return true;
    return false;
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      if (form.status === "Active" && !form.file) {
        setError("A PDF document is required before activating a contract.");
        setSubmitting(false);
        return;
      }

      const payload: any = {
        title: form.title,
        contract_number: form.contract_number || `CTR-${Math.floor(100000 + Math.random() * 900000)}`,
        status: form.status || "Draft",
        type: form.type || "ArtistAgreement",
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        signed_date: form.signed_date || null,
        territory: form.territory || "Worldwide",
        exclusivity: form.exclusivity ?? false,
        notes: form.notes || "",
      };

      const res = await api.post("/contracts", payload);
      const contract = res.data;

      if (form.file) {
        const fd = new FormData();
        fd.append("file", form.file);
        await api.post(`/contracts?action=upload_document&id=${contract.id}`, fd);
      }

      setResult(contract);
      setStep(4);
      onCreated(contract);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to create contract");
    } finally {
      setSubmitting(false);
    }
  };

  const reset = () => {
    setStep(1);
    setForm({
      title: "", contract_number: "", type: "Recording", status: "Draft",
      start_date: "", end_date: "", signed_date: "", territory: "World",
      exclusivity: false, notes: "", file: null,
    });
    setError("");
    setResult(null);
  };

  const steps = [
    { num: 1, label: "Basic Info" },
    { num: 2, label: "Upload PDF" },
    { num: 3, label: "Review" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0f1115]/80 backdrop-blur-md p-4 sm:p-6 overflow-y-auto">
      <div className="bg-premium-glass border border-white/10 rounded-3xl shadow-glass w-full max-w-2xl overflow-hidden flex flex-col max-h-full animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/[0.02]">
          <h2 className="text-xl font-black text-white tracking-tight">Add New Contract</h2>
          <button className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-secondary hover:text-white transition-colors" onClick={() => { reset(); onClose(); }} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        {!result && (
          <div className="flex items-center justify-center gap-2 px-6 pt-6 pb-2">
            {steps.map((s) => (
              <div key={s.num} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === s.num ? "bg-primary text-white" : step > s.num ? "bg-success/20 text-success" : "bg-white/5 text-text-secondary"
                }`}>
                  {step > s.num ? <Check size={14} /> : s.num}
                </div>
                <span className={`text-xs ${step === s.num ? "text-white" : "text-text-secondary"}`}>{s.label}</span>
                {s.num < 3 && <div className="w-8 h-px bg-white/10 mx-1" />}
              </div>
            ))}
          </div>
        )}

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {error && (
            <div className="mb-6 bg-danger/10 border border-danger/20 rounded-xl p-4 text-danger text-sm">{error}</div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="text-xs text-text-secondary font-bold">Title *</label>
                  <input className="input w-full" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g., Recording Agreement" required />
                </div>
                <div>
                  <label className="text-xs text-text-secondary font-bold">Contract Number</label>
                  <input className="input w-full" value={form.contract_number} onChange={(e) => setForm({ ...form, contract_number: e.target.value })} placeholder="Auto-generated if empty" />
                </div>
                <div>
                  <label className="text-xs text-text-secondary font-bold">Type</label>
                  <select className="input w-full" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option>Recording</option>
                    <option>Publishing</option>
                    <option>License</option>
                    <option>Other</option>
                    <option>Unknown</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-secondary font-bold">Status</label>
                  <select className="input w-full" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                    <option>Draft</option>
                    <option>Active</option>
                    <option>Expired</option>
                    <option>Terminated</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-secondary font-bold">Territory</label>
                  <input className="input w-full" value={form.territory} onChange={(e) => setForm({ ...form, territory: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-text-secondary font-bold">Exclusivity</label>
                  <select className="input w-full" value={String(form.exclusivity)} onChange={(e) => setForm({ ...form, exclusivity: e.target.value === "true" })}>
                    <option value="false">Non-Exclusive</option>
                    <option value="true">Exclusive</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-text-secondary font-bold">Start Date</label>
                  <input type="date" className="input w-full" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-text-secondary font-bold">End Date</label>
                  <input type="date" className="input w-full" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} />
                </div>
                <div>
                  <label className="text-xs text-text-secondary font-bold">Signed Date</label>
                  <input type="date" className="input w-full" value={form.signed_date} onChange={(e) => setForm({ ...form, signed_date: e.target.value })} />
                </div>
                <div className="col-span-2">
                  <label className="text-xs text-text-secondary font-bold">Notes</label>
                  <textarea className="input w-full" rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 py-4">
              <div className="text-center">
                <FileText size={48} className="mx-auto mb-4 text-text-secondary opacity-40" />
                <h3 className="text-lg font-semibold mb-2">Upload Signed PDF</h3>
                <p className="text-sm text-text-secondary mb-4">Attach the signed PDF. This step is optional — you can add documents later.</p>
                <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 hover:border-white/20 transition-colors cursor-pointer"
                  onClick={() => document.getElementById("wizard-file-input")?.click()}
                >
                  <Upload size={24} className="mx-auto mb-2 text-text-secondary" />
                  <p className="text-sm font-medium">
                    {form.file ? form.file.name : "Click to select PDF"}
                  </p>
                  {form.file && (
                    <p className="text-xs text-text-secondary mt-1">
                      {(form.file.size / 1024 / 1024).toFixed(1)} MB
                    </p>
                  )}
                </div>
                <input id="wizard-file-input" type="file" accept="application/pdf" className="hidden"
                  onChange={(e) => setForm({ ...form, file: e.target.files?.[0] || null })}
                />
                <p className="text-xs text-text-secondary mt-4">PDF is the source of truth. Each upload creates a new version.</p>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-semibold">Review & Confirm</h3>
              <div className="grid grid-cols-2 gap-4 bg-white/5 rounded-2xl p-4">
                {[
                  { label: "Title", value: form.title },
                  { label: "Contract #", value: form.contract_number || "(Auto-generated)" },
                  { label: "Type", value: form.type },
                  { label: "Status", value: form.status },
                  { label: "Territory", value: form.territory },
                  { label: "Exclusivity", value: form.exclusivity ? "Yes" : "No" },
                  { label: "Start Date", value: form.start_date || "—" },
                  { label: "End Date", value: form.end_date || "—" },
                  { label: "Signed Date", value: form.signed_date || "—" },
                ].map((item) => (
                  <div key={item.label}>
                    <span className="text-xs text-text-secondary block">{item.label}</span>
                    <span className="text-sm font-medium">{String(item.value)}</span>
                  </div>
                ))}
                <div className="col-span-2">
                  <span className="text-xs text-text-secondary block">PDF</span>
                  <span className="text-sm font-medium">{form.file ? form.file.name : "None (will add later)"}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-xs text-text-secondary block">Notes</span>
                  <span className="text-sm">{form.notes || "—"}</span>
                </div>
              </div>
            </div>
          )}

          {step === 4 && result && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto">
                <Check size={32} className="text-success" />
              </div>
              <h3 className="text-xl font-bold">Contract Created</h3>
              <p className="text-text-secondary">{result.title} ({result.contract_number})</p>
              <Button variant="primary" onClick={() => { reset(); onClose(); }}>
                Done
              </Button>
            </div>
          )}
        </div>

        {step < 4 && (
          <div className="p-6 border-t border-white/5 bg-white/[0.02] flex items-center justify-between">
            <div>
              {step > 1 ? (
                <Button variant="secondary" onClick={() => setStep(step - 1)}>
                  <ChevronLeft size={16} /> Back
                </Button>
              ) : (
                <div />
              )}
            </div>
            {step < 3 ? (
              <Button variant="primary" disabled={!canNext()} onClick={() => setStep(step + 1)}>
                Next <ChevronRight size={16} />
              </Button>
            ) : (
              <Button variant="primary" disabled={submitting} onClick={handleCreate}>
                {submitting ? "Creating..." : "Create Contract"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
