import React, { useEffect, useState } from 'react';
import partyClient from '../../api/partyClient';

const ROLE_OPTIONS = [
  'label',
  'artist',
  'remix_artist',
  'producer',
  'publisher',
  'licensor',
  'licensee',
  'other',
];

function useDebounced(value, delayMs = 250) {
  const [out, setOut] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setOut(value), delayMs);
    return () => clearTimeout(id);
  }, [value, delayMs]);
  return out;
}

export default function PartyMultiAssign({
  rows = [],
  onChangeRows,
  onPersist,
  canPersist = false,
  isPersisting = false,
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [entityType, setEntityType] = useState('artist');
  const [createName, setCreateName] = useState('');
  const [creating, setCreating] = useState(false);
  const debounced = useDebounced(query);

  useEffect(() => {
    let alive = true;
    async function run() {
      const q = debounced.trim();
      if (!q) {
        setResults([]);
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

  function addRow(entity, role = 'other') {
    const next = [
      ...(rows || []),
      {
        entity_type: entity.entity_type,
        entity_id: Number(entity.id),
        display_name: entity.display_name,
        role,
        split_percent: null,
      },
    ];
    onChangeRows?.(next);
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
      const created = await partyClient.create({ entity_type: entityType, display_name: name });
      addRow(created, 'other');
      setCreateName('');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-w-0" style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search parties..."
        />
      </div>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, maxHeight: 160, overflowY: 'auto' }}>
        {loading && <div className="small muted" style={{ padding: 8 }}>Searching...</div>}
        {!loading && !query.trim() && <div className="small muted" style={{ padding: 8 }}>Type to search parties.</div>}
        {!loading && query.trim() && results.length === 0 && <div className="small muted" style={{ padding: 8 }}>No matches.</div>}
        {!loading && results.map((entity) => (
          <div key={`${entity.entity_type}:${entity.id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: 8, borderBottom: '1px solid #f1f5f9' }}>
            <div className="min-w-0">
              <div className="small strong break-words">{entity.display_name}</div>
              <div className="small muted">{entity.entity_type}</div>
            </div>
            <button type="button" className="ghost-btn" onClick={() => addRow(entity)}>
              Add
            </button>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr auto', gap: 8 }}>
        <select className="input" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
          <option value="artist">Artist</option>
          <option value="organization">Organization</option>
          <option value="individual">Individual</option>
        </select>
        <input
          className="input"
          value={createName}
          onChange={(e) => setCreateName(e.target.value)}
          placeholder="Create new party"
        />
        <button type="button" className="ghost-btn" disabled={!createName.trim() || creating} onClick={createInline}>
          {creating ? 'Creating...' : 'Create'}
        </button>
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
              {ROLE_OPTIONS.map((role) => <option key={role} value={role}>{role}</option>)}
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
