import React from 'react';

function getTracks(data) {
  if (Array.isArray(data?.tracks)) return data.tracks;
  if (Array.isArray(data?.tracks?.mentioned_titles)) {
    return data.tracks.mentioned_titles.map((title) => ({ title }));
  }
  return [];
}

export default function ExtractPreviewSections({ extract }) {
  if (!extract) return null;
  const data = extract.data || {};
  const dates = data.dates || {};
  const parties = Array.isArray(data.parties) ? data.parties : [];
  const tracks = getTracks(data);
  const splits = Array.isArray(data.splits) ? data.splits : [];
  const warnings = Array.isArray(data.warnings) ? data.warnings : [];

  return (
    <div className="min-w-0" style={{ display: 'grid', gap: 10 }}>
      <section className="panel" style={{ padding: 10 }}>
        <div className="strong" style={{ marginBottom: 6 }}>Overview</div>
        <div className="small break-words">Title: {data.title || 'Untitled'}</div>
        <div className="small break-words">Contract Date: {dates.contract_date || 'Not found'}</div>
        <div className="small break-words">Effective Date: {dates.effective_date || 'Not found'}</div>
        <div className="small break-words">
          Expiration: {dates.expiration_date || dates.end_date || (dates.end_date_specified ? 'Not found' : 'No end date specified')}
        </div>
        <div className="small break-words">Parties: {parties.length || 'No parties extracted'}</div>
      </section>

      <section className="panel" style={{ padding: 10 }}>
        <div className="strong" style={{ marginBottom: 6 }}>Tracks</div>
        {tracks.length ? (
          <div style={{ display: 'grid', gap: 6, maxHeight: 180, overflowY: 'auto' }}>
            {tracks.map((t, idx) => (
              <div key={`${t.title || t.raw_mention || 'track'}-${idx}`} className="small break-words">
                {(t.title || t.raw_mention || 'Untitled track')}{t.version ? ` (${t.version})` : ''}
              </div>
            ))}
          </div>
        ) : (
          <div className="small muted">No tracks extracted.</div>
        )}
      </section>

      <section className="panel" style={{ padding: 10 }}>
        <div className="strong" style={{ marginBottom: 6 }}>Splits</div>
        {splits.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="contracts-table">
              <thead>
                <tr><th>Party</th><th>Percent</th><th>Scope</th></tr>
              </thead>
              <tbody>
                {splits.map((s, idx) => (
                  <tr key={`${s.party_name || 'split'}-${idx}`}>
                    <td className="break-words">{s.party_name || 'Unbound party'}</td>
                    <td>{s.percent != null ? `${s.percent}%` : 'N/A'}</td>
                    <td>{s.scope || 'other'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="small muted">No splits extracted.</div>
        )}
      </section>

      <section className="panel" style={{ padding: 10 }}>
        <details>
          <summary className="strong" style={{ cursor: 'pointer' }}>
            Warnings ({warnings.length})
          </summary>
          <div style={{ marginTop: 8, display: 'grid', gap: 6 }}>
            {warnings.length ? warnings.map((w, idx) => (
              <div key={`warning-${idx}`} className="small break-words">{String(w)}</div>
            )) : <div className="small muted">No warnings.</div>}
          </div>
        </details>
      </section>
    </div>
  );
}
