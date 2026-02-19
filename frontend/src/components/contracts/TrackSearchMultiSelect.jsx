import React, { useEffect, useMemo, useState } from 'react';
import { tracksClient } from '../../api/tracksClient';

function useDebounced(value, ms) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function TrackSearchMultiSelect({
  selectedTrackIds,
  onChangeSelectedIds,
  hintTracksText,
}) {
  const [query, setQuery] = useState('');
  const debounced = useDebounced(query, 250);

  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);

  const selectedSet = useMemo(() => new Set(selectedTrackIds || []), [selectedTrackIds]);

  useEffect(() => {
    let alive = true;

    async function run() {
      setErrorMsg(null);

      const q = debounced.trim();
      if (!q) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const data = await tracksClient.search({ q });
        if (!alive) return;
        setResults(Array.isArray(data?.items) ? data.items : []);
      } catch {
        if (!alive) return;
        setErrorMsg('Track search failed.');
      } finally {
        if (alive) setLoading(false);
      }
    }

    run();
    return () => {
      alive = false;
    };
  }, [debounced]);

  function toggle(id) {
    const next = new Set(selectedSet);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onChangeSelectedIds(Array.from(next));
  }

  function clearAll() {
    onChangeSelectedIds([]);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search tracks…"
          style={{
            flex: 1,
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.12)',
          }}
        />
        <button
          type="button"
          onClick={clearAll}
          disabled={(selectedTrackIds?.length || 0) === 0}
          style={{
            padding: '10px 12px',
            borderRadius: 10,
            border: '1px solid rgba(0,0,0,0.12)',
            background: 'white',
          }}
        >
          Clear
        </button>
      </div>

      {hintTracksText ? (
        <div style={{ fontSize: 12, opacity: 0.75 }}>
          <b>Tracks mentioned:</b> {hintTracksText}
        </div>
      ) : null}

      {(selectedTrackIds?.length || 0) > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {selectedTrackIds.map((id) => (
            <span
              key={id}
              style={{
                padding: '6px 10px',
                borderRadius: 999,
                border: '1px solid rgba(0,0,0,0.12)',
                fontSize: 12,
                display: 'inline-flex',
                gap: 8,
                alignItems: 'center',
              }}
            >
              Track #{id}
              <button
                type="button"
                onClick={() => toggle(id)}
                style={{ border: 'none', background: 'transparent', cursor: 'pointer', opacity: 0.7 }}
                aria-label={`Remove track ${id}`}
              >
                x
              </button>
            </span>
          ))}
        </div>
      )}

      <div
        style={{
          border: '1px solid rgba(0,0,0,0.08)',
          borderRadius: 12,
          padding: 10,
          maxHeight: 280,
          overflow: 'auto',
        }}
      >
        {loading && <div style={{ fontSize: 12 }}>Searching…</div>}
        {errorMsg && <div style={{ fontSize: 12, color: '#b91c1c' }}>{errorMsg}</div>}
        {!loading && !errorMsg && results.length === 0 && (
          <div style={{ fontSize: 12, opacity: 0.7 }}>Type to search for tracks.</div>
        )}

        {results.map((t) => {
          const checked = selectedSet.has(t.id);
          return (
            <label
              key={t.id}
              style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 6px', borderRadius: 10, cursor: 'pointer' }}
            >
              <input type="checkbox" checked={checked} onChange={() => toggle(t.id)} />
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{t.title}</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>
                  {t.artist ? `${t.artist} • ` : ''}
                  {t.isrc ? `ISRC ${t.isrc}` : `ID ${t.id}`}
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
