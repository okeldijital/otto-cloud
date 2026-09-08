CREATE TABLE "release_artists" (
  "id" SERIAL PRIMARY KEY,
  "release_id" INTEGER NOT NULL,
  "artist_id" INTEGER NOT NULL,
  "position" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "release_artists_release_fk" FOREIGN KEY ("release_id") REFERENCES "releases"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "release_artists_artist_fk" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "release_artists_release_artist_unique" UNIQUE ("release_id", "artist_id"),
  CONSTRAINT "release_artists_release_position_unique" UNIQUE ("release_id", "position")
);
CREATE INDEX "release_artists_release_id_idx" ON "release_artists" ("release_id");
CREATE INDEX "release_artists_artist_id_idx" ON "release_artists" ("artist_id");

CREATE TABLE "track_artists" (
  "id" SERIAL PRIMARY KEY,
  "track_id" INTEGER NOT NULL,
  "artist_id" INTEGER NOT NULL,
  "position" INTEGER NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CONSTRAINT "track_artists_track_fk" FOREIGN KEY ("track_id") REFERENCES "tracks"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
  CONSTRAINT "track_artists_artist_fk" FOREIGN KEY ("artist_id") REFERENCES "artists"("id") ON DELETE RESTRICT ON UPDATE NO ACTION,
  CONSTRAINT "track_artists_track_artist_unique" UNIQUE ("track_id", "artist_id"),
  CONSTRAINT "track_artists_track_position_unique" UNIQUE ("track_id", "position")
);
CREATE INDEX "track_artists_track_id_idx" ON "track_artists" ("track_id");
CREATE INDEX "track_artists_artist_id_idx" ON "track_artists" ("artist_id");
