import React from 'react';
import ContractExtractPreviewV2 from './ContractExtractPreviewV2';

const card = {
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  padding: 12,
  background: '#fff',
  marginBottom: 10,
};

function getDates(extraction) {
  return extraction?.dates || {
    contract_date: extraction?.contract_date || null,
    effective_date: extraction?.effective_date || null,
    start_date: extraction?.start_date || null,
    end_date: extraction?.end_date || null,
    expiration_date: extraction?.expiration_date || null,
    end_date_specified: Boolean(extraction?.end_date || extraction?.expiration_date),
  };
}

export default function ContractExtractPreview({ extraction }) {
  if (!extraction) return null;
  if (Array.isArray(extraction.tracks_mentioned) || extraction.source?.file_sha256) {
    return <ContractExtractPreviewV2 extraction={extraction} />;
  }

  const warnings = extraction.warnings || [];
  const dates = getDates(extraction);
  const parties = extraction.parties || [];
  const splits = extraction.splits || [];
  const terms = extraction.terms || {};
  const worksHints = extraction.works_hints || {};
  const tracks = extraction.tracks || worksHints.tracks || [];
  const keyTerms = extraction.key_terms || [];

  return (
    <div className="panel" style={{ marginBottom: 12, maxHeight: '65vh', overflowY: 'auto', padding: 12 }}>
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
          <div>
            <div><strong>{extraction.contract_title || 'Untitled contract'}</strong></div>
            <div className="muted small">
              type: {extraction.contract_type || 'unknown'} | parser: {extraction.parser_version || '-'} | confidence: {Number(extraction.raw_confidence || 0).toFixed(2)}
            </div>
          </div>
          <span className={`status-badge ${warnings.length ? 'amber' : 'success'}`}>{warnings.length ? 'Needs Review' : 'Ready'}</span>
        </div>
      </div>

      <div style={card}>
        <strong>Dates & Term</strong>
        <div className="small" style={{ marginTop: 6 }}>Contract date: {dates.contract_date || 'Not specified'}</div>
        <div className="small">Effective/start: {dates.start_date || dates.effective_date || 'Not specified'}</div>
        <div className="small">End/expiration: {dates.end_date || dates.expiration_date || 'No end date specified'}</div>
        <div className="small muted" style={{ marginTop: 6 }}>
          Governing law: {terms.governing_law || 'Not specified'} | Territory: {terms.territory || 'Not specified'}
        </div>
        {terms.term_summary ? <div className="small muted">Term: {terms.term_summary}</div> : null}
      </div>

      <div style={card}>
        <strong>Parties + Roles</strong>
        <div style={{ overflowX: 'auto', marginTop: 6 }}>
          <table className="contracts-table" style={{ minWidth: 680 }}>
            <thead><tr><th>Role</th><th>Name</th><th>Aka</th><th>Confidence</th><th>Source</th></tr></thead>
            <tbody>
              {parties.length ? parties.map((p, idx) => (
                <tr key={idx}>
                  <td>{p.role || '-'}</td>
                  <td>{p.display_name || p.name || '-'}</td>
                  <td>{p.aka || '-'}</td>
                  <td>{Number(p.confidence || 0).toFixed(2)}</td>
                  <td>{p.source || '-'}</td>
                </tr>
              )) : <tr><td colSpan={5} className="muted">No parties detected</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div style={card}>
        <strong>Tracks / Works Hints</strong>
        <div className="small" style={{ marginTop: 6 }}>
          Tracks: {tracks.length ? tracks.join(', ') : 'No track references detected'}
        </div>
        <div className="small">Artists: {(worksHints.artists || []).length ? worksHints.artists.join(', ') : 'No artist references detected'}</div>
        <div className="small">Works: {(worksHints.works || []).length ? worksHints.works.join(', ') : 'No work references detected'}</div>
      </div>

      <div style={card}>
        <strong>Royalties / Splits</strong>
        <div style={{ overflowX: 'auto', marginTop: 6 }}>
          <table className="contracts-table" style={{ minWidth: 700 }}>
            <thead><tr><th>Scope</th><th>%</th><th>Party</th><th>Role</th><th>Notes</th></tr></thead>
            <tbody>
              {splits.length ? splits.map((s, idx) => {
                const party = s.party_display_name || s.party_name;
                const missing = !party;
                return (
                  <tr key={idx}>
                    <td>{s.scope || s.split_type || 'OTHER'}</td>
                    <td>{s.percent}</td>
                    <td>{party || 'Unknown party ⚠'}</td>
                    <td>{s.party_role || '-'}</td>
                    <td className="small">{s.notes || '-'}</td>
                  </tr>
                );
              }) : <tr><td colSpan={5} className="muted">No splits detected</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="small muted" style={{ marginTop: 6 }}>Splits total: {Number(extraction.splits_total || 0).toFixed(2)}%</div>
      </div>

      <div style={card}>
        <strong>Key Terms</strong>
        <div className="small" style={{ marginTop: 6 }}>Grant: {terms.grant_of_rights || 'Not specified'}</div>
        <div className="small">Exclusivity: {terms.exclusivity || 'Not specified'}</div>
        <div className="small">Renewal: {terms.renewal || 'Not specified'}</div>
        <div className="small">Reversion: {terms.reversion || 'Not specified'}</div>
        {keyTerms.length ? (
          <div className="small muted" style={{ marginTop: 8 }}>
            {keyTerms.map((k, idx) => <div key={idx}>{k.key}: {k.value}</div>)}
          </div>
        ) : null}
      </div>

      {!!warnings.length && (
        <div className="warning-banner">
          {warnings.map((w, idx) => <div key={idx}>{w}</div>)}
        </div>
      )}
    </div>
  );
}
