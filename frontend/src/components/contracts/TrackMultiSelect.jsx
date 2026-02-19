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
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounced = useDebounced(query);

  const selectedSet = useMemo(
    () => new Set((selectedIds || []).map((id) => Number(id))),
    [selectedIds],
  );

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
    const numeric = Number(track?.id);
    if (!Number.isFinite(numeric)) return;
    const next = new Set(selectedSet);
    next.add(numeric);
    onChange?.(Array.from(next));
    setQuery('');
    closeDropdown();
    requestAnimationFrame(() => inputRef.current?.blur());
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
        const rows = Array.isArray(data?.items) ? data.items : [];
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
    const next = new Set(selectedSet);
    if (next.has(numeric)) next.delete(numeric);
    else next.add(numeric);
    onChange?.(Array.from(next));
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
        <button type="button" className="ghost-btn" disabled={!selectedSet.size} onClick={() => onChange?.([])}>
          Clear
        </button>
      </div>

      {selectedSet.size > 0 && (
        <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Array.from(selectedSet).map((id) => (
            <button key={id} type="button" className="ghost-btn" onClick={() => toggle(id)}>
              #{id} x
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
                <div className="strong break-words">{row.display_name || row.title || `Track #${row.id}`}</div>
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
