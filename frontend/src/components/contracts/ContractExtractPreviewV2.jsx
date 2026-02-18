import React from 'react';

const sectionStyle = {
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  padding: 12,
  background: '#fff',
  marginBottom: 10,
};

function asDate(val, fallback) {
  return val || fallback;
}

export default function ContractExtractPreviewV2({ extraction }) {
  if (!extraction) return null;

  const warnings = extraction.warnings || [];
  const parties = extraction.parties || [];
  const splits = extraction.splits || [];
  const tracks = extraction.tracks_mentioned || [];
  const terms = extraction.terms || [];

  return (
    <div className="panel" style={{ marginBottom: 12, maxHeight: '65vh', overflowY: 'auto', padding: 12 }}>
      <div style={sectionStyle}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
          <div>
            <div><strong>{extraction.contract_title || 'Untitled contract'}</strong></div>
            <div className="muted small">parser: {extraction.parser_version || '-'} | confidence: {Number(extraction.raw_confidence || 0).toFixed(2)}</div>
          </div>
          <span className={`status-badge ${warnings.length ? 'amber' : 'success'}`}>{warnings.length ? 'Needs Review' : 'Ready'}</span>
        </div>
      </div>

      <div style={sectionStyle}>
        <strong>Dates</strong>
        <div className="small" style={{ marginTop: 6 }}>Effective: {asDate(extraction.effective_date, 'Not specified')}</div>
        <div className="small">Start: {asDate(extraction.start_date, asDate(extraction.effective_date, 'Not specified'))}</div>
        <div className="small">End: {asDate(extraction.end_date, extraction.end_date_note || 'No end date specified')}</div>
      </div>

      <div style={sectionStyle}>
        <strong>Parties</strong>
        <div style={{ overflowX: 'auto', marginTop: 6 }}>
          <table className="contracts-table" style={{ minWidth: 620 }}>
            <thead><tr><th>Name</th><th>Role</th><th>Confidence</th><th>Evidence</th></tr></thead>
            <tbody>
              {parties.length ? parties.map((p, idx) => (
                <tr key={idx}>
                  <td>{p.display_name || '-'}</td>
                  <td>{p.role || 'unknown'}</td>
                  <td>{Number(p.confidence || 0).toFixed(2)}</td>
                  <td className="small">{(p.evidence || []).join(' | ') || '-'}</td>
                </tr>
              )) : <tr><td colSpan={4} className="muted">No parties detected</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div style={sectionStyle}>
        <strong>Splits</strong>
        <div style={{ overflowX: 'auto', marginTop: 6 }}>
          <table className="contracts-table" style={{ minWidth: 680 }}>
            <thead><tr><th>Type</th><th>%</th><th>Party</th><th>Notes</th><th>Evidence</th></tr></thead>
            <tbody>
              {splits.length ? splits.map((s, idx) => (
                <tr key={idx}>
                  <td>{s.split_type || 'other'}</td>
                  <td>{s.percent}</td>
                  <td>{s.party_name || (s.party_ref !== null && s.party_ref !== undefined ? parties[s.party_ref]?.display_name : '') || 'Unknown party'}</td>
                  <td className="small">{s.notes || '-'}</td>
                  <td className="small">{(s.evidence || []).join(' | ') || '-'}</td>
                </tr>
              )) : <tr><td colSpan={5} className="muted">No splits detected</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="small muted" style={{ marginTop: 6 }}>Splits total: {extraction.splits_total ?? 'n/a'}%</div>
      </div>

      <div style={sectionStyle}>
        <strong>Tracks Mentioned</strong>
        <div className="small" style={{ marginTop: 6 }}>
          {tracks.length ? tracks.map((t) => t.title).join(', ') : 'No track references detected'}
        </div>
      </div>

      <div style={sectionStyle}>
        <strong>Key Terms</strong>
        <div className="small" style={{ marginTop: 6 }}>
          {terms.length ? terms.map((t, idx) => <div key={idx}>{t.term_type}: {t.summary}</div>) : 'No key terms detected'}
        </div>
      </div>

      {!!warnings.length && (
        <div className="warning-banner">
          {warnings.map((w, idx) => <div key={idx}>{w}</div>)}
        </div>
      )}
    </div>
  );
}
