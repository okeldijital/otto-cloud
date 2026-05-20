import React from 'react';

const DBSelectorCard = ({ inventory, selectedDbId, setSelectedDbId, onSwitch, loading }) => {
  const options = inventory?.options || [];
  const active = inventory?.active || {};

  return (
    <div className="stats-board" style={{ marginBottom: '1rem' }}>
      <h3>Database Selector</h3>
      <p style={{ color: '#64748b', marginBottom: 12 }}>
        Select a discovered database. This updates pointer only and never mutates DB content.
      </p>

      {!options.length ? (
        <div>
          <p style={{ color: '#b45309', marginBottom: 8 }}>No DB files found under app data dir.</p>
          <code>{inventory?.app_data_dir || 'n/a'}</code>
        </div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            <select
              value={selectedDbId}
              onChange={(e) => setSelectedDbId(e.target.value)}
              style={{ flex: 1, padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0' }}
            >
              {options.map((opt) => (
                <option key={opt.db_id} value={opt.db_id}>
                  {opt.label} {opt.is_current ? '(current)' : ''}
                </option>
              ))}
            </select>
            <button className="btn-primary" onClick={onSwitch} disabled={loading || !selectedDbId}>
              Set Active DB
            </button>
          </div>

          {options.map((opt) => (
            <div className="stat-pill" key={`${opt.db_id}-row`}>
              <span className="stat-label" style={{ maxWidth: 640, overflowWrap: 'anywhere' }}>
                {opt.db_path}
              </span>
              <span className="stat-val">
                {opt.size_bytes} bytes | {opt.modified_at} {opt.is_current ? '| current' : ''}
              </span>
            </div>
          ))}
        </>
      )}

      <div className="stat-pill" style={{ marginTop: 12 }}>
        <span className="stat-label">Current DB</span>
        <span className="stat-val" style={{ maxWidth: 640, overflowWrap: 'anywhere' }}>{active?.db_path || 'n/a'}</span>
      </div>
    </div>
  );
};

export default DBSelectorCard;
