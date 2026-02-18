import React from 'react';

function renderRows(rows = [], keyField = 'extract_name') {
  if (!rows.length) return <div className="muted small">No matches</div>;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="contracts-table" style={{ minWidth: 740 }}>
        <thead><tr><th>Extract</th><th>Matched Entity</th><th>Confidence</th><th>Strategy</th></tr></thead>
        <tbody>
          {rows.map((r, idx) => (
            <tr key={`${r[keyField] || 'row'}-${idx}`}>
              <td>{r.extract_name || r.extract_title || '-'}</td>
              <td>{r.matched_entity?.display_name || '-'}</td>
              <td>{Number(r.confidence || 0).toFixed(2)}</td>
              <td>{r.strategy || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ContractReleaseMapper({ result, loading = false, error = '' }) {
  if (loading) {
    return <div className="muted">Generating map plan...</div>;
  }
  if (error) {
    return <div className="error-banner">{error}</div>;
  }
  if (!result) {
    return <div className="muted">Select a release and run map plan to compare extraction against release/catalog/network.</div>;
  }

  const matches = result.matches || {};
  const missing = result.missing || {};

  return (
    <div className="panel" style={{ marginBottom: 12, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <strong>Release Mapping Plan</strong>
        <span className={`status-badge ${result.needs_review ? 'amber' : 'success'}`}>{result.needs_review ? 'Needs Review' : 'Clean'}</span>
      </div>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, marginBottom: 10 }}>
        <div className="small"><strong>Release:</strong> #{result.release?.id} {result.release?.title}</div>
        <div className="small"><strong>Flags:</strong> {(result.release_validation_flags || []).join(', ') || 'None'}</div>
      </div>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, marginBottom: 10 }}>
        <div><strong>Artists</strong></div>
        {renderRows(matches.artists || [], 'extract_name')}
        <div className="small muted" style={{ marginTop: 6 }}>Missing: {(missing.artists || []).join(', ') || 'None'}</div>
      </div>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, marginBottom: 10 }}>
        <div><strong>Organizations</strong></div>
        {renderRows(matches.organizations || [], 'extract_name')}
        <div className="small muted" style={{ marginTop: 6 }}>Missing: {(missing.organizations || []).join(', ') || 'None'}</div>
      </div>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, marginBottom: 10 }}>
        <div><strong>Individuals</strong></div>
        {renderRows(matches.individuals || [], 'extract_name')}
        <div className="small muted" style={{ marginTop: 6 }}>Missing: {(missing.individuals || []).join(', ') || 'None'}</div>
      </div>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, marginBottom: 10 }}>
        <div><strong>Tracks</strong></div>
        {renderRows(matches.tracks || [], 'extract_title')}
        <div className="small muted" style={{ marginTop: 6 }}>Missing: {(missing.tracks || []).join(', ') || 'None'}</div>
      </div>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: 10, padding: 10, marginBottom: 10 }}>
        <div><strong>Works</strong></div>
        {renderRows(matches.works || [], 'extract_title')}
        <div className="small muted" style={{ marginTop: 6 }}>Missing: {(missing.works || []).join(', ') || 'None'}</div>
      </div>

      {!!(result.notes || []).length && (
        <div className="warning-banner">
          {(result.notes || []).map((n, idx) => <div key={idx}>{n}</div>)}
        </div>
      )}
    </div>
  );
}
