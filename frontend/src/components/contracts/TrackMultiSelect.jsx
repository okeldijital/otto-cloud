import React, { useEffect, useMemo, useRef, useState } from 'react';
import { tracksClient } from '../../api/tracksClient';

function useDebounced(value, delayMs = 250) {
  const [out, setOut] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setOut(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return out;
}

export default function TrackMultiSelect({
  tracks = [],
  selectedIds = [],
  onChange,
  placeholder = 'Search tracks...',
  createTrackPath = '/catalog/tracks',
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedItems, setSelectedItems] = useState([]);
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounced = useDebounced(query);

  const tracksById = useMemo(() => {
    const map = new Map();
    for (const row of tracks || []) {
      const id = Number(row?.id);
      if (!Number.isFinite(id)) continue;
      map.set(id, row);
    }
    return map;
  }, [tracks]);

  const selectedSet = useMemo(() => new Set(selectedItems.map((x) => Number(x.id))), [selectedItems]);

  function normalizeTrack(row) {
    const id = Number(row?.id);
    if (!Number.isFinite(id)) return null;
    const label = row?.title || row?.name || row?.display_name || row?.filename || `Track #${id}`;
    return {
      id,
      label,
      artist: row?.artist || null,
      release: row?.release || null,
    };
  }

  useEffect(() => {
    const incoming = Array.isArray(selectedIds) ? selectedIds : [];
    const normalized = [];
    for (const row of incoming) {
      if (typeof row === 'number' || typeof row === 'string') {
        const id = Number(row);
        if (!Number.isFinite(id)) continue;
        const known = tracksById.get(id);
        normalized.push(normalizeTrack({ id, ...known }) || { id, label: `Track #${id}` });
      } else if (row && typeof row === 'object') {
        const n = normalizeTrack(row);
        if (n) normalized.push(n);
      }
    }
    const deduped = Array.from(new Map(normalized.map((x) => [x.id, x])).values());
    setSelectedItems(deduped);
  }, [selectedIds, tracksById]);

  useEffect(() => {
    const missing = selectedItems.filter((x) => String(x.label || '').startsWith('Track #')).map((x) => x.id);
    if (!missing.length) return;
    let alive = true;
    (async () => {
      try {
        const data = await tracksClient.byIds(missing);
        if (!alive) return;
        const byId = new Map((data?.items || []).map((x) => [Number(x.id), x.title || `Track #${x.id}`]));
        setSelectedItems((prev) => prev.map((item) => {
          const label = byId.get(Number(item.id));
          return label ? { ...item, label } : item;
        }));
      } catch {
        // best effort
      }
    })();
    return () => {
      alive = false;
    };
  }, [selectedItems]);

  useEffect(() => {
    if (!query.trim()) {
      setOpen(false);
      setActiveIndex(-1);
      return;
    }
    setOpen(true);
  }, [query]);

  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (!containerRef.current?.contains(e.target)) {
        setOpen(false);
        setActiveIndex(-1);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  function closeDropdown() {
    setOpen(false);
    setActiveIndex(-1);
  }

  function onSelect(track) {
    const normalized = normalizeTrack(track);
    if (!normalized) return;
    setSelectedItems((prev) => {
      const map = new Map(prev.map((x) => [x.id, x]));
      map.set(normalized.id, normalized);
      const arr = Array.from(map.values());
      onChange?.(arr.map((x) => Number(x.id)));
      return arr;
    });
    setQuery('');
    closeDropdown();
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function onInputBlur() {
    window.setTimeout(() => {
      closeDropdown();
    }, 120);
  }

  useEffect(() => {
    let alive = true;
    async function run() {
      const q = debounced.trim();
      if (!q) {
        setResults([]);
        setActiveIndex(-1);
        return;
      }
      setLoading(true);
      try {
        const data = await tracksClient.search({ q, limit: 20 });
        if (!alive) return;
        const rows = (Array.isArray(data?.items) ? data.items : []).map((row) => normalizeTrack(row)).filter(Boolean);
        setResults(rows);
        setActiveIndex(rows.length ? 0 : -1);
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
    const numeric = Number(id);
    setSelectedItems((prev) => {
      const exists = prev.some((x) => Number(x.id) === numeric);
      const next = exists ? prev.filter((x) => Number(x.id) !== numeric) : [...prev, { id: numeric, label: `Track #${numeric}` }];
      onChange?.(next.map((x) => Number(x.id)));
      return next;
    });
  }

  function onInputKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeDropdown();
      return;
    }
    if (!open || !results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((idx) => (idx + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((idx) => (idx <= 0 ? results.length - 1 : idx - 1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      onSelect(results[activeIndex]);
    }
  }

  return (
    <div className="min-w-0" ref={containerRef}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          ref={inputRef}
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onInputKeyDown}
          onBlur={onInputBlur}
          onFocus={() => {
            if (query.trim()) setOpen(true);
          }}
          placeholder={placeholder}
          aria-label="Track search"
        />
        <button
          type="button"
          className="ghost-btn"
          disabled={!selectedSet.size}
          onClick={() => {
            setSelectedItems([]);
            onChange?.([]);
          }}
        >
          Clear
        </button>
      </div>

      {selectedSet.size > 0 && (
        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {selectedItems.map((row) => (
            <button key={row.id} type="button" className="ghost-btn" onClick={() => toggle(row.id)}>
              {row.label} x
            </button>
          ))}
        </div>
      )}

      {open ? (
      <div style={{ marginTop: 8, border: '1px solid #e5e7eb', borderRadius: 10, maxHeight: 220, overflowY: 'auto' }}>
        {loading && <div className="muted small" style={{ padding: 10 }}>Searching...</div>}
        {!loading && query.trim() && results.length === 0 && (
          <div style={{ padding: 10 }} className="small">
            No results. <a href={`#${createTrackPath}`}>Create Track</a>
          </div>
        )}
        {!loading && results.map((row, idx) => {
          const active = idx === activeIndex;
          const checked = selectedSet.has(Number(row.id));
          return (
            <button
              key={row.id}
              type="button"
              onMouseEnter={() => setActiveIndex(idx)}
              onClick={() => onSelect(row)}
              style={{
                width: '100%',
                textAlign: 'left',
                border: 'none',
                background: active ? '#f8fafc' : 'white',
                borderBottom: '1px solid #f1f5f9',
                padding: '8px 10px',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <div className="strong break-words">{row.label}</div>
                {checked ? <span className="status-badge success">Selected</span> : null}
              </div>
              <div className="muted small break-words">
                {row.artist || 'Unknown artist'}{row.release ? ` • ${row.release}` : ''}
              </div>
            </button>
          );
        })}
      </div>
      ) : null}
    </div>
  );
}
