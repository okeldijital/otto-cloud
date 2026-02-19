import React, { useEffect, useMemo, useState } from 'react';

export default function TrackSearchMultiSelect({ value = [], onChange, suggested = [], searchTracks }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const id = setTimeout(async () => {
      if (!q.trim()) {
        setResults([]);
        return;
      }
      setLoading(true);
      try {
        const res = await searchTracks(q.trim());
        setResults(res?.items || []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [q, searchTracks]);

  const selected = useMemo(() => new Set((value || []).map(Number)), [value]);

  const toggle = (id) => {
    const next = new Set(selected);
    if (next.has(Number(id))) next.delete(Number(id));
    else next.add(Number(id));
    onChange?.(Array.from(next));
  };

  return (
    <div>
      <input className="form-control" placeholder="Search tracks..." value={q} onChange={(e) => setQ(e.target.value)} />
      {!!suggested.length && (
        <div className="muted small" style={{ marginTop: 6 }}>
          Suggested: {suggested.slice(0, 5).map((s) => s.raw_mention || s.raw || s).join(', ')}
        </div>
      )}
      <div style={{ maxHeight: 220, overflowY: 'auto', marginTop: 8, border: '1px solid #e5e7eb', borderRadius: 8 }}>
        {loading ? (
          <div className="muted small" style={{ padding: 8 }}>Searching…</div>
        ) : results.length ? (
          results.map((row) => (
            <label key={row.id} style={{ display: 'block', padding: 8 }}>
              <input type="checkbox" checked={selected.has(Number(row.id))} onChange={() => toggle(row.id)} />{' '}
              {row.title}
              {!!row.artists?.length ? <span className="muted small"> ({row.artists.join(', ')})</span> : null}
            </label>
          ))
        ) : (
          <div className="muted small" style={{ padding: 8 }}>No results</div>
        )}
      </div>
      {!!value.length && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
          {value.map((id) => <span className="status-badge success" key={id}>Track #{id}</span>)}
        </div>
      )}
    </div>
  );
}
