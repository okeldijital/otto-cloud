import React, { useEffect, useMemo, useState } from 'react';
import partyClient from '../../api/partyClient';
import CreatePartyModal from './CreatePartyModal';

const ROLE_OPTIONS = [
  'label',
  'artist',
  'producer',
  'remixer',
  'publisher',
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

function groupByType(rows = []) {
  const groups = {
    artist: [],
    individual: [],
    organization: [],
    label: [],
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const debounced = useDebounced(query);

  const grouped = useMemo(() => groupByType(results), [results]);

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
        // Always search ALL types so the user sees every matching entity.
        const data = await partyClient.search(q, 20, 'artist,organization,individual,label');
        if (!alive) return;
        const items = Array.isArray(data?.results || data?.items || data) ? (data.results || data.items || data) : [];
        setResults(items);
      } catch (err) {
        console.error('[PartyMultiAssign] search failed:', err);
        if (alive) setResults([]);
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
        display_name: entity.display_name || entity.name,
        role,
        split_percent: null,
        // Carry over kind if adding directly
        kind: entity.artist_type || entity.kind || entity.artist_kind,
        member_preview: entity.members_preview || entity.members || [],
      },
    ];
    onChangeRows?.(next);
    setQuery('');
    setResults([]);
    setIsModalOpen(false);
  }

  function updateRow(index, patch) {
    const next = (rows || []).map((row, idx) => (idx === index ? { ...row, ...patch } : row));
    onChangeRows?.(next);
  }

  function removeRow(index) {
    const next = (rows || []).filter((_, idx) => idx !== index);
    onChangeRows?.(next);
  }

  // Only show type groups that actually have results
  const typesToShow = ['artist', 'label', 'individual', 'organization'].filter(
    (type) => (grouped[type] || []).length > 0
  );
  const hasAnyResults = typesToShow.length > 0;

  return (
    <div className="min-w-0" style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 8 }}>
        <select className="input" value={role} onChange={(e) => setRole(e.target.value)}>
          {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <input
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search parties..."
        />
      </div>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, maxHeight: 220, overflowY: 'auto' }}>
        {loading && <div className="small muted" style={{ padding: 8 }}>Searching...</div>}
        {!loading && !query.trim() && <div className="small muted" style={{ padding: 8 }}>Type to search parties.</div>}
        {!loading && query.trim() && (
          <div style={{ display: 'grid' }}>
            {!hasAnyResults && (
              <div className="small muted" style={{ padding: 8 }}>No matches found for "{query}"</div>
            )}
            {typesToShow.map((type) => {
              const rowsForType = grouped[type] || [];
              const title = type === 'artist' ? 'Artists' : type === 'individual' ? 'Individuals' : type === 'label' ? 'Labels' : 'Organizations';
              return (
                <div key={type}>
                  <div className="small muted" style={{ padding: '8px 8px 4px' }}>{title}</div>
                  {rowsForType.map((entity) => (
                    <button
                      key={`${entity.entity_type}:${entity.id}`}
                      type="button"
                      className="ghost-btn"
                      style={{ justifyContent: 'space-between', borderRadius: 0, borderTop: '1px solid #f1f5f9' }}
                      onClick={() => addRow(entity)}
                      title={(entity.kind === 'group' || entity.artist_type === 'group') && (entity.members_preview || entity.member_preview)?.length
                        ? `Members: ${(entity.members_preview || entity.member_preview || []).map(m => m.display_name || m.name).join(', ')}`
                        : undefined}
                    >
                      <span className="break-words" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        {entity.display || entity.display_name || entity.subtitle}
                        {(entity.kind === 'group' || entity.artist_type === 'group') && (
                          <span className="status-badge success" style={{ fontSize: '0.55rem', padding: '1px 4px', lineHeight: 1.2 }}>GROUP</span>
                        )}
                        {/* Member count support */}
                        {(entity.member_count > 0 && !(entity.members_preview?.length)) && (
                          <span className="small muted">({entity.member_count} members)</span>
                        )}
                      </span>
                      <span className="small muted">Add as {role}</span>
                    </button>
                  ))}
                </div>
              );
            })}

            <div style={{ borderTop: '1px solid #e5e7eb', padding: 8 }}>
              <button
                type="button"
                className="ghost-btn"
                onClick={() => setIsModalOpen(true)}
              >
                Create "{query.trim()}"...
              </button>
            </div>
          </div>
        )}
      </div>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 8, display: 'grid', gap: 8 }}>
        {!rows.length ? <div className="small muted">No parties assigned yet.</div> : null}
        {rows.map((row, idx) => (
          <div key={`${row.entity_type}:${row.entity_id}:${idx}`} style={{ display: 'grid', gridTemplateColumns: '1fr 170px 110px auto', gap: 8 }}>
            <div className="input break-words" style={{ background: '#f8fafc', display: 'flex', alignItems: 'center', gap: 6 }}>
              {row.display_name}
              {(row.kind === 'group' || row.artist_type === 'group') && <span className="status-badge success" style={{ fontSize: '0.5rem', padding: '1px 3px' }}>GROUP</span>}
            </div>
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

      {isModalOpen && (
        <CreatePartyModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onCreated={addRow}
          initialName={query.trim()}
        />
      )}
    </div>
  );
}
