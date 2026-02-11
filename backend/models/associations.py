from sqlalchemy import Table, Column, Integer, ForeignKey
from database import Base

# Association table for Many-to-Many relationship between Tracks and Releases
# This allows a Track to appear on multiple "Secondary" Releases, in addition to its primary release_id
track_releases = Table(
    "track_releases",
    Base.metadata,
    Column("track_id", Integer, ForeignKey("tracks.id"), primary_key=True),
    Column("release_id", Integer, ForeignKey("releases.id"), primary_key=True)
)
