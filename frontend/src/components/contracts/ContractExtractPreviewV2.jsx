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
  const tracks = extraction.tracks || extraction.tracks_mentioned || [];
  const terms = extraction.terms || [];
  const keyTerms = extraction.key_terms || {};
  const dates = extraction.dates || {};

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
        <div className="small" style={{ marginTop: 6 }}>Effective: {asDate(dates.effective_date || extraction.effective_date, 'Not specified')}</div>
        <div className="small">Start: {asDate(extraction.start_date || dates.effective_date || extraction.effective_date, 'Not specified')}</div>
        <div className="small">End: {asDate(dates.end_date || extraction.end_date, extraction.end_date_note || (dates.end_date_specified ? 'Not specified' : 'No end date specified'))}</div>
      </div>

      <div style={sectionStyle}>
        <strong>Parties</strong>
        <div style={{ overflowX: 'auto', marginTop: 6 }}>
          <table className="contracts-table" style={{ minWidth: 620 }}>
            <thead><tr><th>Name</th><th>Role</th><th>Confidence</th><th>Source/Evidence</th></tr></thead>
            <tbody>
              {parties.length ? parties.map((p, idx) => (
                <tr key={idx}>
                  <td>{p.display_name || p.name || '-'}</td>
                  <td>{p.role || 'unknown'}</td>
                  <td>{Number(p.confidence || 0).toFixed(2)}</td>
                  <td className="small">{(Array.isArray(p.evidence) ? p.evidence.join(' | ') : p.evidence) || p.source || '-'}</td>
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
            <thead><tr><th>Scope/Type</th><th>%</th><th>Party</th><th>Role</th><th>Evidence</th></tr></thead>
            <tbody>
              {splits.length ? splits.map((s, idx) => (
                <tr key={idx}>
                  <td>{s.scope || s.split_type || 'other'}</td>
                  <td>{s.percent}</td>
                  <td>{s.party_name || s.party_display_name || (s.party_ref !== null && s.party_ref !== undefined ? parties[s.party_ref]?.display_name : '') || 'Unknown party'}</td>
                  <td>{s.party_role || '-'}</td>
                  <td className="small">{(Array.isArray(s.evidence) ? s.evidence.join(' | ') : s.evidence) || s.notes || '-'}</td>
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
          {tracks.length ? tracks.map((t) => t.raw_mention || t.title).join(', ') : 'No track references detected'}
        </div>
      </div>

      <div style={sectionStyle}>
        <strong>Key Terms</strong>
        <div className="small" style={{ marginTop: 6 }}>
          {keyTerms.territory ? <div>territory: {keyTerms.territory}</div> : null}
          {keyTerms.term_text ? <div>term: {keyTerms.term_text}</div> : null}
          {keyTerms.grant_of_rights ? <div>grant_of_rights: {keyTerms.grant_of_rights}</div> : null}
          {!keyTerms.territory && !keyTerms.term_text && !keyTerms.grant_of_rights && (
            terms.length ? terms.map((t, idx) => <div key={idx}>{t.term_type}: {t.summary || t.text}</div>) : 'No key terms detected'
          )}
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
