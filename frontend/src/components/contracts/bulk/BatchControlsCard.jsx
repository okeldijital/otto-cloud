import React from 'react';
import { Upload, Play } from 'lucide-react';

export default function BatchControlsCard({ batchId, busy, hasFiles, onChooseFiles, onRunExtract, error, notice }) {
  return (
    <div className="panel" style={{ padding: 12 }}>
      <h2 style={{ marginTop: 0 }}>Contracts Bulk Processing</h2>
      <p className="muted small">Tracks-only. Non-destructive. No core overwrite.</p>
      <label className="btn" style={{ display: 'inline-flex', gap: 8, marginBottom: 8 }}>
        <Upload size={16} /> Select PDFs
        <input type="file" accept="application/pdf" multiple style={{ display: 'none' }} onChange={onChooseFiles} />
      </label>
      <div className="muted small" style={{ marginBottom: 10 }}>Batch: {batchId}</div>
      <button className="btn orange" disabled={busy || !hasFiles} onClick={onRunExtract}>
        <Play size={16} /> {busy ? 'Extracting...' : 'Run Bulk Extract'}
      </button>
      {!!notice && <div className="status-badge success" style={{ marginTop: 8 }}>{notice}</div>}
      {!!error && <div className="error-banner" style={{ marginTop: 8 }}>{error}</div>}
    </div>
  );
}
