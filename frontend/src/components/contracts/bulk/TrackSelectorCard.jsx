import React from 'react';
import TrackSearchMultiSelect from './TrackSearchMultiSelect';

function getSuggestedTracks(extract) {
  const tracks = extract?.data?.tracks;
  if (Array.isArray(tracks)) return tracks;
  if (Array.isArray(tracks?.mentioned_titles)) {
    return tracks.mentioned_titles.map((t) => ({ raw_mention: t }));
  }
  return [];
}

export default function TrackSelectorCard({ selectedTrackIds, setSelectedTrackIds, extract, searchTracks, onAutoMatchTracks }) {
  return (
    <div className="panel" style={{ padding: 10, marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <div style={{ fontWeight: 600 }}>Track Selector</div>
        <button className="btn" onClick={onAutoMatchTracks}>Apply suggestions</button>
      </div>
      <TrackSearchMultiSelect
        value={selectedTrackIds}
        onChange={setSelectedTrackIds}
        suggested={getSuggestedTracks(extract)}
        searchTracks={searchTracks}
      />
      <div className="muted small" style={{ marginTop: 6 }}>Tracks are required for GREEN.</div>
    </div>
  );
}
