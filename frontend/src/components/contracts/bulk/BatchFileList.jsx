import React from 'react';
import CompletenessBadge from '../CompletenessBadge';

export default function BatchFileList({
  items,
  selected_file_id,
  onSelect,
  onToggleInclude,
  filterText,
  onFilterTextChange,
}) {
  return (
    <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: 10, borderBottom: '1px solid #e5e7eb' }}>
        <input
          className="form-control"
          placeholder="Filter by filename..."
          value={filterText || ''}
          onChange={(e) => onFilterTextChange(e.target.value)}
        />
      </div>
      <table className="contracts-table">
        <thead>
          <tr>
            <th />
            <th>Filename</th>
            <th>Phase</th>
            <th>Title</th>
            <th>Tracks</th>
            <th>Parties</th>
            <th>Status Quo</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {items.map((row) => {
            const title = row?.extract?.data?.title || '—';
            const tracksCount = (row?.selected_track_ids || []).length;
            const partiesCount = (row?.parties || []).length;
            const completeness = row?.completeness || { score: 0, status: 'red' };
            const statusLabel = String(completeness.status || completeness.status_quo || 'red').toUpperCase();
            return (
              <tr
                key={row.file_id}
                onClick={() => onSelect(row.file_id)}
                style={{ cursor: 'pointer', background: selected_file_id === row.file_id ? '#f8fafc' : 'transparent' }}
              >
                <td>
                  <input
                    type="checkbox"
                    checked={Boolean(row.selected)}
                    onChange={(e) => {
                      e.stopPropagation();
                      onToggleInclude(row.file_id, e.target.checked);
                    }}
                  />
                </td>
                <td>{row.filename}</td>
                <td>{row.phase}</td>
                <td>{title}</td>
                <td>{tracksCount}</td>
                <td>{partiesCount}</td>
                <td><span className="status-badge neutral">{statusLabel}</span></td>
                <td>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <CompletenessBadge completeness={completeness} />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
