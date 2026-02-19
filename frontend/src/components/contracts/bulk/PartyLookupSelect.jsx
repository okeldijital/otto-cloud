import React, { useEffect, useState } from 'react';

export default function PartyLookupSelect({ value, onChange, searchParties }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!q.trim()) {
        setItems([]);
        return;
      }
      try {
        const res = await searchParties(q.trim(), ['artist', 'individual', 'organization']);
        setItems(res?.items || []);
      } catch {
        setItems([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [q, searchParties]);

  const currentValue = value ? `${value.ref_type}:${value.ref_id}` : '';

  return (
    <div>
      <input className="form-control" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search parties..." />
      <select
        className="form-control"
        value={currentValue}
        onChange={(e) => {
          const next = e.target.value;
          if (!next) {
            onChange?.(null);
            return;
          }
          const [ref_type, ref_id] = next.split(':');
          const hit = items.find((x) => `${x.ref_type}:${x.ref_id}` === next);
          onChange?.({ ref_type, ref_id: Number(ref_id), display_name: hit?.display_name || '' });
        }}
      >
        <option value="">Select party</option>
        {items.map((row) => (
          <option key={`${row.ref_type}:${row.ref_id}`} value={`${row.ref_type}:${row.ref_id}`}>
            [{row.ref_type}] {row.display_name}
          </option>
        ))}
      </select>
    </div>
  );
}
