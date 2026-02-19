import React, { useEffect, useMemo, useState } from 'react';
import partyClient from '../../api/partyClient';

const ROLE_OPTIONS = [
  'label',
  'artist',
  'producer',
  'remixer',
  'publisher',
  'other',
];

const CREATE_TYPES = [
  { value: 'artist', label: 'Artist' },
  { value: 'individual', label: 'Individual' },
  { value: 'organization', label: 'Organization' },
];

function useDebounced(value, delayMs = 250) {
  const [out, setOut] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setOut(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return out;
}

function groupByType(rows = []) {
  const groups = {
    artist: [],
    individual: [],
    organization: [],
  };
  for (const row of rows) {
    const type = String(row?.entity_type || '').toLowerCase();
    if (groups[type]) groups[type].push(row);
  }
  return groups;
}

export default function PartyMultiAssign({
  rows = [],
  onChangeRows,
  onPersist,
  canPersist = false,
  isPersisting = false,
}) {
  const [role, setRole] = useState('label');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateInline, setShowCreateInline] = useState(false);
  const [createType, setCreateType] = useState('artist');
  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);
  const debounced = useDebounced(query);

  const grouped = useMemo(() => groupByType(results), [results]);

  useEffect(() => {
    let alive = true;
    async function run() {
      const q = debounced.trim();
      if (!q) {
        setResults([]);
        setShowCreateInline(false);
        return;
      }
      setLoading(true);
      try {
        const data = await partyClient.search(q, 20);
        if (!alive) return;
        setResults(Array.isArray(data?.items) ? data.items : []);
      } finally {
        if (alive) setLoading(false);
      }
    }
    run();
    return () => {
      alive = false;
    };
  }, [debounced]);

  function addRow(entity) {
    const next = [
      ...(rows || []),
      {
        entity_type: String(entity.entity_type || '').toLowerCase(),
        entity_id: Number(entity.id),
        display_name: entity.display_name,
        role,
        split_percent: null,
      },
    ];
    onChangeRows?.(next);
    setQuery('');
    setResults([]);
    setShowCreateInline(false);
  }

  function updateRow(index, patch) {
    const next = (rows || []).map((row, idx) => (idx === index ? { ...row, ...patch } : row));
    onChangeRows?.(next);
  }

  function removeRow(index) {
    const next = (rows || []).filter((_, idx) => idx !== index);
    onChangeRows?.(next);
  }

  async function createInline() {
    const name = createName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const created = await partyClient.create({ entity_type: createType, display_name: name });
      addRow(created);
      setCreateName('');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-w-0" style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8 }}>
        <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <input
          className="input"
          value={query}
          onChange={(e) => {
            const v = e.target.value;
            setQuery(v);
            if (v.trim()) {
              setCreateName(v);
            } else {
              setShowCreateInline(false);
            }
          }}
          placeholder="Search parties..."
        />
      </div>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, maxHeight: 220, overflowY: 'auto' }}>
        {loading && <div className="small muted" style={{ padding: 8 }}>Searching...</div>}
        {!loading && !query.trim() && <div className="small muted" style={{ padding: 8 }}>Type to search parties.</div>}
        {!loading && query.trim() && (
          <div style={{ display: 'grid' }}>
            {(['artist', 'individual', 'organization']).map((type) => {
              const rowsForType = grouped[type] || [];
              const title = type === 'artist' ? 'Artists' : type === 'individual' ? 'Individuals' : 'Organizations';
              return (
                <div key={type}>
                  <div className="small muted" style={{ padding: '8px 8px 4px' }}>{title}</div>
                  {rowsForType.length === 0 ? (
                    <div className="small muted" style={{ padding: '0 8px 8px' }}>No matches</div>
                  ) : rowsForType.map((entity) => (
                    <button
                      key={`${entity.entity_type}:${entity.id}`}
                      type="button"
                      className="ghost-btn"
                      style={{ justifyContent: 'space-between', borderRadius: 0, borderTop: '1px solid #f1f5f9' }}
                      onClick={() => addRow(entity)}
                    >
                      <span className="break-words">{entity.display_name}</span>
                      <span className="small muted">Add</span>
                    </button>
                  ))}
                </div>
              );
            })}

            <div style={{ borderTop: '1px solid #e5e7eb', padding: 8 }}>
              {!showCreateInline ? (
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={() => {
                    setShowCreateInline(true);
                    setCreateName(query.trim());
                  }}
                >
                  Create "{query.trim()}"...
                </button>
              ) : (
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr auto', gap: 8 }}>
                    <select className="input" value={createType} onChange={(e) => setCreateType(e.target.value)}>
                      {CREATE_TYPES.map((x) => <option key={x.value} value={x.value}>{x.label}</option>)}
                    </select>
                    <input
                      className="input"
                      value={createName}
                      onChange={(e) => setCreateName(e.target.value)}
                      placeholder="Party name"
                    />
                    <button type="button" className="btn" disabled={!createName.trim() || creating} onClick={createInline}>
                      {creating ? 'Creating...' : 'Create'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 8, display: 'grid', gap: 8 }}>
        {!rows.length ? <div className="small muted">No parties assigned yet.</div> : null}
        {rows.map((row, idx) => (
          <div key={`${row.entity_type}:${row.entity_id}:${idx}`} style={{ display: 'grid', gridTemplateColumns: '1fr 170px 110px auto', gap: 8 }}>
            <div className="input break-words" style={{ background: '#f8fafc' }}>{row.display_name}</div>
            <select
              className="input"
              value={row.role || 'other'}
              onChange={(e) => updateRow(idx, { role: e.target.value })}
            >
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <input
              className="input"
              type="number"
              min="0"
              max="100"
              value={row.split_percent ?? ''}
              onChange={(e) => {
                const v = e.target.value;
                updateRow(idx, { split_percent: v === '' ? null : Number(v) });
              }}
              placeholder="%"
            />
            <button type="button" className="ghost-btn" onClick={() => removeRow(idx)}>Remove</button>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button type="button" className="btn" disabled={!canPersist || isPersisting} onClick={onPersist}>
          {isPersisting ? 'Saving...' : 'Save Parties'}
        </button>
      </div>
    </div>
  );
}
