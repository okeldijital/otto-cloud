ALTER TABLE track_releases
  ADD COLUMN IF NOT EXISTS position INTEGER;

WITH ranked AS (
  SELECT tr.track_id, tr.release_id,
    ROW_NUMBER() OVER (
      PARTITION BY tr.release_id
      ORDER BY COALESCE(t.created_at, TIMESTAMPTZ 'epoch'), tr.track_id
    ) - 1 AS position
  FROM track_releases tr
  JOIN tracks t ON t.id = tr.track_id
)
UPDATE track_releases tr
SET position = ranked.position
FROM ranked
WHERE tr.track_id = ranked.track_id AND tr.release_id = ranked.release_id;

WITH primary_tracks AS (
  SELECT t.id AS track_id, t.release_id,
    ROW_NUMBER() OVER (
      PARTITION BY t.release_id
      ORDER BY COALESCE(t.created_at, TIMESTAMPTZ 'epoch'), t.id
    ) - 1 AS position
  FROM tracks t
  LEFT JOIN track_releases tr ON tr.track_id = t.id AND tr.release_id = t.release_id
  WHERE t.release_id IS NOT NULL AND tr.track_id IS NULL
)
INSERT INTO track_releases (track_id, release_id, position)
SELECT track_id, release_id, position
FROM primary_tracks;

CREATE INDEX IF NOT EXISTS ix_track_releases_release_position
  ON track_releases (release_id, position);
