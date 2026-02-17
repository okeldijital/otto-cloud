import React from 'react';

export default function ContractExtractPreview({ extraction }) {
  if (!extraction) return null;
  const warnings = extraction.warnings || [];
  const parties = extraction.parties || [];
  const splits = extraction.splits || [];

  return (
    <div className="panel" style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h4 style={{ margin: 0 }}>Extraction Preview</h4>
        <span className={`status-badge ${warnings.length ? 'amber' : 'success'}`}>
          {warnings.length ? 'Needs Review' : 'Ready'}
        </span>
      </div>
      <div className="muted small" style={{ marginTop: 6 }}>
        parser: {extraction.parser_version || 'deterministic_v1'} | confidence: {Number(extraction.raw_confidence || 0).toFixed(2)}
      </div>
      {!!warnings.length && (
        <div className="warning-banner" style={{ marginTop: 8 }}>
          {warnings.map((w, idx) => <div key={idx}>{w}</div>)}
        </div>
      )}
      <div style={{ marginTop: 10 }}>
        <strong>Parties</strong>
        <ul>
          {parties.map((p, idx) => <li key={idx}>{p.display_name} {p.role ? `(${p.role})` : ''}</li>)}
        </ul>
      </div>
      <div>
        <strong>Splits</strong>
        <ul>
          {splits.map((s, idx) => <li key={idx}>{s.party_name}: {s.percent}% ({s.split_type})</li>)}
        </ul>
      </div>
    </div>
  );
}
