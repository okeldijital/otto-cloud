import React, { useState } from 'react';

const AdvancedSwitchPathAccordion = ({ onSwitchPath }) => {
  const [open, setOpen] = useState(false);
  const [path, setPath] = useState('');
  const [confirmExternal, setConfirmExternal] = useState(false);

  return (
    <div className="stats-board">
      <button className="btn-secondary" onClick={() => setOpen(!open)}>
        {open ? 'Hide' : 'Show'} Advanced Path Switch
      </button>
      {open && (
        <div style={{ marginTop: 12 }}>
          <p style={{ color: '#64748b', marginBottom: 10 }}>
            Advanced mode: switch by absolute path. Use with caution.
          </p>
          <input
            type="text"
            value={path}
            onChange={(e) => setPath(e.target.value)}
            placeholder="/absolute/path/to/file.sqlite"
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 10 }}
          />
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <input type="checkbox" checked={confirmExternal} onChange={(e) => setConfirmExternal(e.target.checked)} />
            confirm_external (required if outside app data dir)
          </label>
          <button className="btn-primary" onClick={() => onSwitchPath(path, confirmExternal)} disabled={!path}>
            Set Active DB (Advanced)
          </button>
        </div>
      )}
    </div>
  );
};

export default AdvancedSwitchPathAccordion;
