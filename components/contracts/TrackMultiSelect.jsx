import React, { useEffect, useMemo, useRef, useState } from 'react';
import { tracksClient } from '../../api/tracksClient';
import { X, Search, Check } from 'lucide-react';

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
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [selectedItems, setSelectedItems] = useState([]);

  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounced = useDebounced(query, 300);

  // Sync selectedIds prop to internal selectedItems state (fetching details if needed)
  useEffect(() => {
    const incomingIds = (selectedIds || []).map(Number).filter(n => n > 0);
    const existingMap = new Map(selectedItems.map(i => [i.id, i]));

    // Identify IDs that we don't have full objects for yet
    const missingIds = incomingIds.filter(id => !existingMap.has(id));

    // Build the new list of items
    const newItems = incomingIds.map(id => {
      return existingMap.get(id) || { id, title: `Track #${id}`, isPlaceholder: true };
    });

    // Update state only if changed to avoid loops
    // Simplified comparison: join IDs
    const currentIdsStr = selectedItems.map(x => x.id).join(',');
    const newIdsStr = newItems.map(x => x.id).join(',');

    if (currentIdsStr !== newIdsStr || newItems.some(x => x.isPlaceholder && !existingMap.get(x.id)?.isPlaceholder && existingMap.has(x.id))) {
      // If we have placeholders but we actually know them?
      // Let's just blindly update if IDs changed, or if we need to hydrate.
      setSelectedItems(newItems);
    }

    // Fetch missing
    if (missingIds.length > 0) {
      tracksClient.byIds(missingIds).then(res => {
        if (res.items && res.items.length) {
          setSelectedItems(prev => prev.map(p => {
            const found = res.items.find(x => x.id === p.id);
            return found ? { ...found, isPlaceholder: false } : p;
          }));
        }
      }).catch(err => console.error('Failed to fetch selected track details', err));
    }
  }, [selectedIds]); // Only run when prop changes. Use internal logic to avoid infinite loop with onChange.

  // API Search
  useEffect(() => {
    if (!debounced.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    let alive = true;
    tracksClient.search({ q: debounced, limit: 20 })
      .then(res => {
        if (!alive) return;
        setResults(res.items || []);
        setActiveIndex(res.items?.length ? 0 : -1);
      })
      .catch(err => {
        console.error('Search failed', err);
        if (alive) setResults([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });

    return () => { alive = false; };
  }, [debounced]);

  // Click outside to close
  useEffect(() => {
    const onDocMouseDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocMouseDown);
    return () => document.removeEventListener('mousedown', onDocMouseDown);
  }, []);

  const handleSelect = (track) => {
    // Check if already selected
    if (selectedItems.some(x => x.id === track.id)) {
      setQuery('');
      setOpen(false);
      return;
    }

    const newItem = { ...track, isPlaceholder: false };
    const nextItems = [...selectedItems, newItem];

    // Optimistic update
    setSelectedItems(nextItems);
    onChange?.(nextItems.map(x => x.id));

    setQuery('');
    setOpen(false);
    inputRef.current?.focus();
  };

  const handleRemove = (id) => {
    const nextItems = selectedItems.filter(x => x.id !== id);
    setSelectedItems(nextItems);
    onChange?.(nextItems.map(x => x.id));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (results.length) setActiveIndex(i => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (results.length) setActiveIndex(i => (i - 1 + results.length) % results.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (open && results[activeIndex]) {
        handleSelect(results[activeIndex]);
      } else {
        // Maybe open search?
        if (!open && query.trim()) setOpen(true);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === 'Backspace' && !query && selectedItems.length > 0) {
      // Optional: remove last item on backspace if query empty
      handleRemove(selectedItems[selectedItems.length - 1].id);
    }
  };

  return (
    <div className="track-multi-select" ref={containerRef} style={{ position: 'relative' }}>
      <div className="input-box" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        padding: '6px 8px',
        border: '1px solid #e5e7eb',
        borderRadius: 6,
        background: 'white',
        minHeight: 38
      }}>
        {selectedItems.map(item => (
          <span key={item.id} className="chip" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '2px 6px',
            borderRadius: 4,
            background: '#f1f5f9',
            fontSize: '0.85rem'
          }}>
            <span className="truncate" style={{ maxWidth: 200 }}>{item.title}{item.artist ? ` (${item.artist})` : ''}</span>
            <button
              type="button"
              onClick={() => handleRemove(item.id)}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', padding: 0, display: 'flex' }}
            >
              <X size={12} className="muted" />
            </button>
          </span>
        ))}

        <input
          ref={inputRef}
          value={query}
          onChange={e => {
            setQuery(e.target.value);
            if (!open && e.target.value.trim()) setOpen(true);
          }}
          onFocus={() => { if (query.trim()) setOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder={selectedItems.length ? '' : placeholder}
          style={{
            border: 'none',
            outline: 'none',
            flex: 1,
            minWidth: 120,
            fontSize: '0.9rem',
            background: 'transparent'
          }}
        />
        {loading && <div className="muted small" style={{ alignSelf: 'center' }}>...</div>}
      </div>
      <div className="small" style={{ marginTop: 6, color: selectedItems.length > 0 ? '#15803d' : '#64748b' }}>
        {selectedItems.length > 0 ? `${selectedItems.length} track${selectedItems.length === 1 ? '' : 's'} selected` : 'No tracks selected'}
      </div>

      {open && (query.trim() || results.length > 0) && (
        <div className="dropdown-menu" style={{
          position: 'absolute',
          zIndex: 50,
          marginTop: 4,
          width: '100%',
          maxWidth: 500, // Constrain width if container is wide
          background: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: 6,
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          maxHeight: 240,
          overflowY: 'auto'
        }}>
          {results.length === 0 && !loading && (
            <div style={{ padding: 12, color: '#64748b' }} className="small">No tracks found for "{query}"</div>
          )}
          {results.map((track, idx) => {
            const isSelected = selectedItems.some(x => x.id === track.id);
            return (
              <div
                key={track.id}
                className={`dropdown-item ${idx === activeIndex ? 'active' : ''}`}
                onMouseDown={(e) => { e.preventDefault(); handleSelect(track); }}
                onMouseEnter={() => setActiveIndex(idx)}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  background: idx === activeIndex ? '#f8fafc' : 'white',
                  borderBottom: '1px solid #f8fafc',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <div style={{ overflow: 'hidden' }}>
                  <div className="strong truncate">{track.title}</div>
                  <div className="small muted truncate">
                    {track.artist || 'Unknown Artist'} {track.release ? `• ${track.release}` : ''}
                  </div>
                </div>
                {isSelected && <Check size={14} className="success" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
