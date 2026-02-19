import React from 'react';

export default function ExtractSummaryCard({ extract, completeness }) {
  if (!extract) return null;
  const data = extract.data || {};
  const warnings = Array.isArray(data.warnings) ? data.warnings : [];

  return (
    <div className="panel" style={{ padding: 10, marginBottom: 10 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Extract Summary</div>
      <div className="small">Title: {data.title || '—'}</div>
      <div className="small">Effective: {data?.dates?.effective_date || 'Not specified'}</div>
      <div className="small">End: {data?.dates?.end_date || (data?.dates?.end_date_specified ? 'Not specified' : 'No end date specified')}</div>
      <div className="small">Parties: {Array.isArray(data.parties) ? data.parties.length : 0}</div>
      <div className="small">Tracks mentioned: {Array.isArray(data.tracks) ? data.tracks.length : (Array.isArray(data?.tracks?.mentioned_titles) ? data.tracks.mentioned_titles.length : 0)}</div>
      {!!completeness && (
        <div className="small" style={{ marginTop: 4 }}>
          Completeness: {completeness.score} ({completeness.status_quo})
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
        {warnings.map((w, i) => {
          const label = typeof w === 'string' ? w : w?.code || 'warning';
          return <span key={`${label}-${i}`} className="status-badge warning">{label}</span>;
        })}
      </div>
    </div>
  );
}
