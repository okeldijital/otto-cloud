"use client";

import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import api from "@/lib/api";
import { type SectionProps } from "@/lib/workspace-engine";

interface FieldDef {
  id: number;
  field_key: string;
  label: string;
  field_type: string;
  options?: string[];
  is_required: boolean;
  placeholder: string | null;
  sort_order: number;
  section_slug: string | null;
  value: string | null;
}

type FieldValues = Record<string, string>;

function renderField(field: FieldDef, values: FieldValues, onChange: (key: string, value: string) => void) {
  const val = values[field.field_key] ?? field.value ?? "";
  const baseClass = "input w-full";
  const label = (
    <label className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block mb-1">
      {field.label}
      {field.is_required && <span className="text-red-400 ml-1">*</span>}
    </label>
  );

  switch (field.field_type) {
    case "text":
      return (
        <div key={field.field_key}>
          {label}
          <textarea className={`${baseClass} min-h-[100px]`} placeholder={field.placeholder || ""} value={val} onChange={(e) => onChange(field.field_key, e.target.value)} />
        </div>
      );
    case "date":
      return (
        <div key={field.field_key}>
          {label}
          <input type="date" className={baseClass} value={val || ""} onChange={(e) => onChange(field.field_key, e.target.value)} />
        </div>
      );
    case "number":
      return (
        <div key={field.field_key}>
          {label}
          <input type="number" className={baseClass} placeholder={field.placeholder || ""} value={val || ""} onChange={(e) => onChange(field.field_key, e.target.value)} />
        </div>
      );
    case "boolean":
      return (
        <div key={field.field_key} className="flex items-center gap-3">
          <input type="checkbox" className="w-4 h-4 rounded border-white/20 bg-white/5" checked={val === "true" || val === "1" || val === "yes"} onChange={(e) => onChange(field.field_key, e.target.checked ? "true" : "false")} />
          {label}
        </div>
      );
    case "select":
      return (
        <div key={field.field_key}>
          {label}
          <select className={baseClass} value={val} onChange={(e) => onChange(field.field_key, e.target.value)}>
            <option value="">{field.placeholder || "Select..."}</option>
            {(field.options || []).map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      );
    case "multi_select":
      const selected = val ? val.split(",").filter(Boolean) : [];
      const toggleOption = (opt: string) => {
        const next = selected.includes(opt) ? selected.filter((s) => s !== opt) : [...selected, opt];
        onChange(field.field_key, next.join(","));
      };
      return (
        <div key={field.field_key}>
          {label}
          <div className="flex flex-wrap gap-2">
            {(field.options || []).map((opt: string) => (
              <button
                key={opt}
                type="button"
                className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all ${selected.includes(opt) ? "bg-accent/20 text-accent border border-accent/30" : "bg-white/5 text-text-secondary border border-white/10 hover:border-white/30"}`}
                onClick={() => toggleOption(opt)}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      );
    default:
      return (
        <div key={field.field_key}>
          {label}
          <input className={baseClass} type="text" placeholder={field.placeholder || ""} value={val} onChange={(e) => onChange(field.field_key, e.target.value)} />
        </div>
      );
  }
}

export default function DynamicFieldsSection({ workspace, workspaceId }: SectionProps) {
  const [fields, setFields] = useState<FieldDef[]>([]);
  const [values, setValues] = useState<FieldValues>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get(`/workspace/${workspaceId}/fields`)
      .then(({ data }) => {
        setFields(data);
        const initial: FieldValues = {};
        for (const f of data) {
          if (f.value !== null && f.value !== undefined) {
            try { initial[f.field_key] = JSON.parse(f.value); } catch { initial[f.field_key] = f.value; }
          }
        }
        setValues(initial);
      })
      .catch(() => setFields([]))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  const handleChange = (key: string, value: string) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.put(`/workspace/${workspaceId}/fields`, { fields: values });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch { /* */ } finally { setSaving(false); }
  };

  if (loading) {
    return <Card title="Fields"><div className="h-32 bg-white/5 rounded animate-pulse" /></Card>;
  }

  if (fields.length === 0) {
    return (
      <Card title="Fields">
        <p className="text-text-secondary text-sm py-8 text-center">
          No custom fields defined for this workspace template.
        </p>
      </Card>
    );
  }

  const grouped = new Map<string | "ungrouped", FieldDef[]>();
  for (const f of fields) {
    const group = f.section_slug || "ungrouped";
    if (!grouped.has(group)) grouped.set(group, []);
    grouped.get(group)!.push(f);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-sm font-bold text-text-secondary uppercase tracking-wider">Fields ({fields.length})</h3>
        <Button variant="primary" size="sm" onClick={handleSave} loading={saving}>
          <Save size={14} /> {saved ? "Saved" : "Save"}
        </Button>
      </div>

      {Array.from(grouped.entries()).map(([group, groupFields]) => (
        <Card key={group} title={group === "ungrouped" ? "General" : group.charAt(0).toUpperCase() + group.slice(1)}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {groupFields.map((f) => renderField(f, values, handleChange))}
          </div>
        </Card>
      ))}
    </div>
  );
}
