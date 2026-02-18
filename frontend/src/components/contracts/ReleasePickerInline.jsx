import React, { useMemo, useState } from 'react';

export default function ReleasePickerInline({ releases = [], value, onChange }) {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return releases;
    return releases.filter((r) => `${r.id} ${r.title}`.toLowerCase().includes(q));
  }, [releases, query]);

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 12, background: '#fff', marginBottom: 10 }}>
      <strong>Select Release (optional)</strong>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search release"
        style={{ width: '100%', marginTop: 8, marginBottom: 8, padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: 8 }}
      />
      <select
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value || '')}
        style={{ width: '100%', padding: '0.55rem', border: '1px solid #cbd5e1', borderRadius: 8 }}
      >
        <option value="">No release selected</option>
        {filtered.map((r) => (
          <option key={r.id} value={r.id}>#{r.id} {r.title}</option>
        ))}
      </select>
    </div>
  );
}
